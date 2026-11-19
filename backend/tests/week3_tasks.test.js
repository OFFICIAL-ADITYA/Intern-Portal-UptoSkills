import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Middlewares
import { mongoSanitizer } from '../src/middlewares/mongoSanitize.js';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { loginLimiter, verifyLimiter } from '../src/middlewares/rateLimiter.js';

// Controllers
import {
  getRequestsForReview,
  reviewRequestAsTL,
  createIntern as tlCreateIntern
} from '../src/controllers/teamleader.controller.js';
import {
  createIntern as adminCreateIntern
} from '../src/controllers/admin.controller.js';
import {
  setPassword,
  updateProfile
} from '../src/controllers/intern.controller.js';
import {
  login,
  resetPassword
} from '../src/controllers/auth.controller.js';
import {
  getAnalyticsOverview,
  getTurnaround,
  exportAnalytics,
  clearAnalyticsCache
} from '../src/controllers/adminAnalytics.controller.js';
import {
  reviewTLValidator
} from '../src/validators/portal.validator.js';

// Models
import User from '../src/models/User.js';
import CertificateRequest from '../src/models/CertificateRequest.js';
import Certificate from '../src/models/Certificate.js';
import AuditLog from '../src/models/AuditLog.model.js';

const mockRes = () => {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    cookies: {},
    clearedCookies: {},
    downloadPath: null,
    downloadFileName: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    getHeader(name) {
      return this.headers[name.toLowerCase()];
    },
    removeHeader(name) {
      delete this.headers[name.toLowerCase()];
      return this;
    },
    cookie(name, val, options) {
      this.cookies[name] = { val, options };
      return this;
    },
    clearCookie(name, options) {
      this.clearedCookies[name] = options;
      return this;
    },
    download(filePath, fileName) {
      this.downloadPath = filePath;
      this.downloadFileName = fileName;
      return this;
    }
  };
  return res;
};

// =========================================================================
// Task I: Hardening & Security Tests
// =========================================================================
test('Task I: Security & Hardening Unit Tests', async (t) => {

  await t.test('NoSQL Sanitizer: Recursively removes keys starting with $ or containing .', () => {
    const req = {
      body: {
        username: 'alice',
        $where: 'this.password == "secret"',
        'nested.field': 'bad',
        filter: {
          $gt: 0,
          safe: 'value',
          subList: [{ $ne: null, ok: 1 }]
        }
      },
      query: {
        $regex: '.*',
        safeParam: '123'
      },
      params: {
        id: '507f1f77bcf86cd799439011'
      }
    };

    let nextCalled = false;
    mongoSanitizer(req, {}, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal(req.body.$where, undefined);
    assert.equal(req.body['nested.field'], undefined);
    assert.equal(req.body.filter.$gt, undefined);
    assert.equal(req.body.filter.safe, 'value');
    assert.equal(req.body.filter.subList[0].$ne, undefined);
    assert.equal(req.body.filter.subList[0].ok, 1);
    assert.equal(req.query.$regex, undefined);
    assert.equal(req.query.safeParam, '123');
  });

  await t.test('Central Error Handler: Redacts 500 error messages in production and returns standard shape', () => {
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const err = new Error('Database connection string leaked: secret_pwd');
      err.status = 500;
      const res = mockRes();

      errorHandler(err, {}, res, () => {});

      assert.equal(res.statusCode, 500);
      assert.equal(res.body.message, 'Internal server error');
      assert.equal(res.body.stack, undefined);
      assert.equal(res.body.message.includes('secret_pwd'), false);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  await t.test('Team Leader Scoping: getRequestsForReview returns only requests belonging to TL\'s interns', async () => {
    const tlId = new mongoose.Types.ObjectId();
    const intern1Id = new mongoose.Types.ObjectId();
    const intern2Id = new mongoose.Types.ObjectId();

    const origUserFind = User.find;
    const origCertFind = CertificateRequest.find;

    try {
      // Stub User.find to return TL's interns (intern1)
      User.find = () => ({
        select: () => [{ _id: intern1Id }]
      });

      // Stub CertificateRequest.find to verify that userId filter only contains intern1Id
      CertificateRequest.find = (query) => {
        assert.deepEqual(query.status, 'pending');
        assert.deepEqual(query.userId, { $in: [intern1Id] });
        return {
          populate: () => ({
            sort: () => [{ _id: new mongoose.Types.ObjectId(), userId: intern1Id, status: 'pending' }]
          })
        };
      };

      const req = {
        user: { id: tlId.toString(), email: 'tl@example.com', role: 'teamleader' }
      };
      const res = mockRes();

      await getRequestsForReview(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.requests.length, 1);
    } finally {
      User.find = origUserFind;
      CertificateRequest.find = origCertFind;
    }
  });

  await t.test('Team Leader Scoping: reviewRequestAsTL rejects request belonging to another TL\'s intern with 403', async () => {
    const myTlId = new mongoose.Types.ObjectId();
    const otherTlId = new mongoose.Types.ObjectId();
    const internId = new mongoose.Types.ObjectId();
    const requestId = new mongoose.Types.ObjectId();

    const origReqFindById = CertificateRequest.findById;
    const origUserFindById = User.findById;

    try {
      CertificateRequest.findById = async () => ({
        _id: requestId,
        userId: internId,
        status: 'pending'
      });

      // Intern belongs to otherTlId
      User.findById = () => ({
        select: () => ({
          _id: internId,
          internshipDetails: {
            teamLeaderId: otherTlId,
            teamleaderEmail: 'other.tl@example.com'
          }
        })
      });

      const req = {
        params: { id: requestId.toString() },
        body: { action: 'forward' },
        user: { id: myTlId.toString(), email: 'my.tl@example.com', role: 'teamleader' }
      };
      const res = mockRes();

      await reviewRequestAsTL(req, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.message.includes('Access denied'), true);
    } finally {
      CertificateRequest.findById = origReqFindById;
      User.findById = origUserFindById;
    }
  });

  await t.test('Admin createIntern populates teamLeaderId and teamleaderEmail on User', async () => {
    const tlId = new mongoose.Types.ObjectId();
    const origUserFindOne = User.findOne;
    const origUserExists = User.exists;
    const origUserCreate = User.create;
    const origAuditCreate = AuditLog.create;

    try {
      User.exists = async () => null;
      User.findOne = async ({ email }) => {
        if (email === 'tl@example.com') {
          return { _id: tlId, email: 'tl@example.com', role: 'teamleader' };
        }
        return null;
      };

      let createdDoc = null;
      User.create = async (doc) => {
        createdDoc = doc;
        return { _id: new mongoose.Types.ObjectId(), ...doc };
      };
      AuditLog.create = async () => ({});

      const req = {
        user: { id: new mongoose.Types.ObjectId().toString(), role: 'admin' },
        body: {
          fullName: 'Intern Test',
          email: 'intern@example.com',
          mobileNo: '9876543210',
          domain: 'Web Development',
          startDate: '2026-01-01',
          endDate: '2026-03-01',
          teamleaderEmail: 'tl@example.com'
        }
      };
      const res = mockRes();

      await adminCreateIntern(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(createdDoc.internshipDetails.teamLeaderId.toString(), tlId.toString());
      assert.equal(createdDoc.internshipDetails.teamleaderEmail, 'tl@example.com');
    } finally {
      User.findOne = origUserFindOne;
      User.exists = origUserExists;
      User.create = origUserCreate;
      AuditLog.create = origAuditCreate;
    }
  });
});

// =========================================================================
// Task H: Intern Profile & Password Setup Tests
// =========================================================================
test('Task H: Intern Profile & Password Setup Unit Tests', async (t) => {

  await t.test('First-time setPassword: Validates internCode as currentSecret, enforces 8+ chars and sets passwordSetAt', async () => {
    const userId = new mongoose.Types.ObjectId();
    const origFindById = User.findById;
    const origAuditCreate = AuditLog.create;

    try {
      const mockUser = {
        _id: userId,
        email: 'intern@example.com',
        internCode: 'INT-9999',
        passwordSetAt: null,
        password: 'hashed_initial_code',
        comparePassword: async (pwd) => pwd === 'INT-9999',
        save: async function() { return this; }
      };

      User.findById = async () => mockUser;
      AuditLog.create = async () => ({});

      // 1. Rejects invalid currentSecret (must be internCode)
      const badSecretReq = {
        user: { id: userId.toString() },
        body: { currentSecret: 'WRONG-CODE', newPassword: 'NewPassword123' }
      };
      const res1 = mockRes();
      await setPassword(badSecretReq, res1);
      assert.equal(res1.statusCode, 400);

      // 2. Rejects weak password (<8 characters or no number)
      const weakPwdReq = {
        user: { id: userId.toString() },
        body: { currentSecret: 'INT-9999', newPassword: 'weak' }
      };
      const res2 = mockRes();
      await setPassword(weakPwdReq, res2);
      assert.equal(res2.statusCode, 400);

      // 3. Succeeds with valid internCode and strong new password
      const goodReq = {
        user: { id: userId.toString() },
        body: { currentSecret: 'INT-9999', newPassword: 'SecurePass123' }
      };
      const res3 = mockRes();
      await setPassword(goodReq, res3);
      assert.equal(res3.statusCode, 200);
      assert.ok(mockUser.passwordSetAt instanceof Date);
    } finally {
      User.findById = origFindById;
      AuditLog.create = origAuditCreate;
    }
  });

  await t.test('Subsequent setPassword: Requires current password when passwordSetAt is present', async () => {
    const userId = new mongoose.Types.ObjectId();
    const origFindById = User.findById;
    const origAuditCreate = AuditLog.create;

    try {
      const currentHashed = await bcrypt.hash('CurrentPass123', 10);
      const mockUser = {
        _id: userId,
        email: 'intern@example.com',
        internCode: 'INT-9999',
        passwordSetAt: new Date(Date.now() - 100000),
        password: currentHashed,
        comparePassword: async function(plain) {
          return bcrypt.compare(plain, this.password);
        },
        save: async function() { return this; }
      };

      User.findById = async () => mockUser;
      AuditLog.create = async () => ({});

      // Should fail if using old internCode
      const codeReq = {
        user: { id: userId.toString() },
        body: { currentSecret: 'INT-9999', newPassword: 'NewPassword456' }
      };
      const res1 = mockRes();
      await setPassword(codeReq, res1);
      assert.equal(res1.statusCode, 400);
      assert.equal(res1.body.message, 'Current password is incorrect');

      // Succeeds with current password
      const goodReq = {
        user: { id: userId.toString() },
        body: { currentSecret: 'CurrentPass123', newPassword: 'NewPassword456' }
      };
      const res2 = mockRes();
      await setPassword(goodReq, res2);
      assert.equal(res2.statusCode, 200);
    } finally {
      User.findById = origFindById;
      AuditLog.create = origAuditCreate;
    }
  });

  await t.test('Intern Login: Rejects internCode login once passwordSetAt is configured', async () => {
    const origFindOne = User.findOne;
    const origAuditCreate = AuditLog.create;

    try {
      const userWithPassword = {
        _id: new mongoose.Types.ObjectId(),
        email: 'intern@example.com',
        role: 'intern',
        internCode: 'INT-1234',
        passwordSetAt: new Date(),
        password: await bcrypt.hash('CustomPassword99', 10),
        comparePassword: async function(plain) {
          return bcrypt.compare(plain, this.password);
        }
      };

      User.findOne = async () => userWithPassword;
      AuditLog.create = async () => ({});

      // Attempt login with internCode -> Must be rejected with 401
      const req1 = {
        body: { email: 'intern@example.com', password: 'INT-1234' }
      };
      const res1 = mockRes();
      await login(req1, res1);
      assert.equal(res1.statusCode, 401);
      assert.equal(res1.body.message, 'Invalid credentials');

      // Attempt login with custom password -> Succeeds
      const req2 = {
        body: { email: 'intern@example.com', password: 'CustomPassword99' }
      };
      const res2 = mockRes();
      await login(req2, res2);
      assert.equal(res2.statusCode, 200);
      assert.ok(res2.cookies.token);
    } finally {
      User.findOne = origFindOne;
      AuditLog.create = origAuditCreate;
    }
  });

  await t.test('Whitelisted Profile Update: Only updates mobileNo and ignores extra fields', async () => {
    const userId = new mongoose.Types.ObjectId();
    const origFindById = User.findById;
    const origAuditCreate = AuditLog.create;

    try {
      const mockUser = {
        _id: userId,
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        domain: 'Data Science',
        role: 'intern',
        mobileNo: '1111111111',
        save: async function() { return this; }
      };

      User.findById = async () => mockUser;
      AuditLog.create = async () => ({});

      const req = {
        user: { id: userId.toString() },
        body: {
          mobileNo: '9876543210',
          role: 'admin', // Attack: Attempt privilege escalation
          domain: 'Hacked Domain',
          email: 'hacker@example.com'
        }
      };
      const res = mockRes();

      await updateProfile(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(mockUser.mobileNo, '9876543210');
      assert.equal(mockUser.role, 'intern');
      assert.equal(mockUser.domain, 'Data Science');
      assert.equal(mockUser.email, 'jane@example.com');
    } finally {
      User.findById = origFindById;
      AuditLog.create = origAuditCreate;
    }
  });
});

// =========================================================================
// Task G: Admin Analytics Tests
// =========================================================================
test('Task G: Admin Analytics Unit Tests', async (t) => {

  await t.test('getAnalyticsOverview: Excludes archived interns from active count and computes KPIs', async () => {
    clearAnalyticsCache();
    const origUserFind = User.find;
    const origUserCount = User.countDocuments;
    const origReqFind = CertificateRequest.find;
    const origReqCount = CertificateRequest.countDocuments;
    const origCertCount = Certificate.countDocuments;

    try {
      // Return 3 interns: 1 ongoing active, 1 archived ongoing, 1 completed
      User.find = () => ({
        select: () => ({
          lean: async () => [
            { internshipDetails: { status: 'ongoing' }, isArchived: false },
            { internshipDetails: { status: 'ongoing' }, isArchived: true }, // Should be excluded from active
            { internshipDetails: { status: 'completed' }, isArchived: false }
          ]
        })
      });

      User.countDocuments = async (filter) => {
        if (filter.role === 'teamleader') return 2;
        if (filter.isArchived) return 1; // 1 active
        return 3;
      };

      CertificateRequest.find = () => ({
        select: () => ({
          lean: async () => [
            { status: 'approved', requestedAt: new Date() },
            { status: 'rejected', requestedAt: new Date() },
            { status: 'pending', requestedAt: new Date() }
          ]
        }),
        populate: () => ({
          lean: async () => []
        })
      });

      CertificateRequest.countDocuments = async () => 3;
      Certificate.countDocuments = async () => 1;

      const req = { query: {} };
      const res = mockRes();

      await getAnalyticsOverview(req, res);
      assert.equal(res.statusCode, 200);
      assert.ok(res.body.kpis);
      assert.equal(res.body.kpis.totalInterns, 3);
      assert.equal(res.body.kpis.activeInterns, 1); // Excluded archived
      assert.equal(res.body.kpis.pendingRequests, 1);
      assert.equal(res.body.kpis.approvalRate, 50); // 1 approved out of 2 decided (1 approved, 1 rejected)
    } finally {
      User.find = origUserFind;
      User.countDocuments = origUserCount;
      CertificateRequest.find = origReqFind;
      CertificateRequest.countDocuments = origReqCount;
      Certificate.countDocuments = origCertCount;
      clearAnalyticsCache();
    }
  });

  await t.test('exportAnalytics: Produces CSV attachment and logs EXPORT audit action', async () => {
    clearAnalyticsCache();
    const origAuditCreate = AuditLog.create;
    const origUserFind = User.find;
    const origUserCount = User.countDocuments;
    const origReqFind = CertificateRequest.find;
    const origReqCount = CertificateRequest.countDocuments;
    const origCertCount = Certificate.countDocuments;

    try {
      let loggedAudit = null;
      AuditLog.create = async (doc) => {
        loggedAudit = doc;
        return doc;
      };

      User.find = () => ({
        select: () => ({
          lean: async () => [{ internshipDetails: { status: 'ongoing' }, isArchived: false }]
        })
      });
      User.countDocuments = async () => 1;
      CertificateRequest.find = () => ({
        select: () => ({ lean: async () => [] }),
        populate: () => ({ lean: async () => [] })
      });
      CertificateRequest.countDocuments = async () => 0;
      Certificate.countDocuments = async () => 0;

      const req = {
        query: { type: 'overview' },
        user: { id: new mongoose.Types.ObjectId().toString(), role: 'admin' },
        ip: '127.0.0.1'
      };
      const res = mockRes();

      await exportAnalytics(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['content-type'], 'text/csv; charset=utf-8');
      assert.ok(res.headers['content-disposition'].includes('analytics-overview.csv'));
      assert.ok(res.body instanceof Buffer);
      assert.equal(loggedAudit.action, 'EXPORT');
      assert.equal(loggedAudit.meta.type, 'overview');
    } finally {
      AuditLog.create = origAuditCreate;
      User.find = origUserFind;
      User.countDocuments = origUserCount;
      CertificateRequest.find = origReqFind;
      CertificateRequest.countDocuments = origReqCount;
      Certificate.countDocuments = origCertCount;
      clearAnalyticsCache();
    }
  });

  await t.test('getTurnaround: Computes average, median, and p90 turnaround metrics across stages', async () => {
    clearAnalyticsCache();
    const origReqFind = CertificateRequest.find;

    try {
      const now = Date.now();
      const DAY = 24 * 60 * 60 * 1000;
      // Mock 3 requests with varying turnaround times: 1 day, 2 days, 3 days
      const chain = {
        populate() { return this; },
        select() { return this; },
        lean: async () => [
          {
            requestedAt: new Date(now - 3 * DAY),
            forwardedAt: new Date(now - 2 * DAY),
            reviewedAt: new Date(now - 1 * DAY),
            certificateId: { issuedAt: new Date(now) }
          },
          {
            requestedAt: new Date(now - 2 * DAY),
            forwardedAt: new Date(now - 1.5 * DAY),
            reviewedAt: new Date(now - 1 * DAY),
            certificateId: { issuedAt: new Date(now) }
          },
          {
            requestedAt: new Date(now - 1 * DAY),
            forwardedAt: new Date(now - 0.7 * DAY),
            reviewedAt: new Date(now - 0.5 * DAY),
            certificateId: { issuedAt: new Date(now) }
          }
        ]
      };
      CertificateRequest.find = () => chain;

      const req = { query: {} };
      const res = mockRes();

      await getTurnaround(req, res);
      assert.equal(res.statusCode, 200);
      assert.ok(res.body.stages);
      assert.equal(res.body.stages.length, 4); // TL, Admin, Generation, Total
      assert.ok(res.body.overall);
      assert.equal(res.body.overall.sampleSize, 3);
      assert.ok(res.body.overall.averageDays > 0);
      assert.ok(res.body.overall.medianDays > 0);
      assert.ok(res.body.overall.p90Days >= res.body.overall.medianDays);
    } finally {
      CertificateRequest.find = origReqFind;
      clearAnalyticsCache();
    }
  });
});
