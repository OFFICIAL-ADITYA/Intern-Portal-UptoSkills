import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import AuditLog from '../src/models/AuditLog.model.js';
import Notification from '../src/models/Notification.model.js';
import Certificate from '../src/models/Certificate.js';
import User from '../src/models/User.js';

// Minimal mock request helper for testing Express router endpoints
const mockReqRes = (appInstance) => {
  return async ({ method, url, body = {}, headers = {}, user = null }) => {
    return new Promise((resolve) => {
      const parsedUrl = new URL(url, 'http://localhost:3000');
      const token = user ? jwt.sign(user, process.env.JWT_SECRET || 'test_secret') : null;
      const req = {
        method: method.toUpperCase(),
        url,
        path: parsedUrl.pathname,
        query: Object.fromEntries(parsedUrl.searchParams.entries()),
        headers: {
          'host': 'localhost:3000',
          'content-type': 'application/json',
          ...headers,
        },
        cookies: {
          ...(token ? { token } : {}),
        },
        body,
        ip: '127.0.0.1',
        get(headerName) {
          return this.headers[headerName.toLowerCase()];
        },
        user,
      };

      const res = {
        statusCode: 200,
        headers: {},
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        setHeader(name, value) {
          this.headers[name.toLowerCase()] = value;
          return this;
        },
        getHeader(name) {
          return this.headers[name.toLowerCase()];
        },
        json(data) {
          this.body = data;
          resolve(this);
        },
        send(data) {
          this.body = data;
          resolve(this);
        },
        end() {
          resolve(this);
        },
      };

      appInstance(req, res, (err) => {
        if (err) {
          res.statusCode = err.status || 500;
          res.body = { message: err.message };
        }
        resolve(res);
      });
    });
  };
};

test('Week 2 Task F: Public Verification Endpoint Integration Tests', async (t) => {
  const request = mockReqRes(app);

  await t.test('GET /api/verify/:verifyId returns 404 for unknown verifyId', async () => {
    const originalFindOne = Certificate.findOne;
    Certificate.findOne = () => ({
      lean: async () => null,
    });

    try {
      const res = await request({
        method: 'GET',
        url: '/api/verify/nonexistent12',
      });
      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Certificate not found' });
    } finally {
      Certificate.findOne = originalFindOne;
    }
  });

  await t.test('GET /api/verify/:verifyId returns 404 for malformed verifyId', async () => {
    const res = await request({
      method: 'GET',
      url: '/api/verify/12', // Less than 6 chars
    });
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { message: 'Certificate not found' });
  });

  await t.test('GET /api/verify/:verifyId returns strictly projected fields for valid certificate', async () => {
    const originalFindOne = Certificate.findOne;
    const mockCert = {
      _id: new mongoose.Types.ObjectId(),
      certificateNumber: 'UTS-2026-000123',
      verifyId: 'a1b2c3d4e5f6',
      recipientName: 'Jane Intern',
      certificateTitle: 'Internship Completion',
      domain: 'Cloud Computing',
      issuedAt: new Date('2026-03-15'),
      status: 'finalized',
      isRevoked: false,
      // Private fields that must NOT be exposed:
      email: 'jane@secret.com',
      internCode: 'SECRET-CODE',
      mobileNo: '1234567890',
      userId: new mongoose.Types.ObjectId(),
    };

    Certificate.findOne = () => ({
      lean: async () => mockCert,
    });

    try {
      const res = await request({
        method: 'GET',
        url: '/api/verify/a1b2c3d4e5f6',
      });
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.certificateNumber, 'UTS-2026-000123');
      assert.equal(res.body.recipientName, 'Jane Intern');
      assert.equal(res.body.certificateTitle, 'Internship Completion');
      assert.equal(res.body.domain, 'Cloud Computing');
      assert.equal(res.body.status, 'valid');

      // Security assert: Never return email, intern code, mobile number or internal IDs
      assert.equal(res.body.email, undefined);
      assert.equal(res.body.internCode, undefined);
      assert.equal(res.body.mobileNo, undefined);
      assert.equal(res.body._id, undefined);
      assert.equal(res.body.userId, undefined);
    } finally {
      Certificate.findOne = originalFindOne;
    }
  });

  await t.test('GET /api/verify/:verifyId returns status revoked and revokedAt for revoked certificate', async () => {
    const originalFindOne = Certificate.findOne;
    const revokedDate = new Date('2026-04-01');
    const mockCert = {
      _id: new mongoose.Types.ObjectId(),
      certificateNumber: 'UTS-2026-000123',
      verifyId: 'a1b2c3d4e5f6',
      recipientName: 'Jane Intern',
      certificateTitle: 'Internship Completion',
      domain: 'Cloud Computing',
      issuedAt: new Date('2026-03-15'),
      status: 'finalized',
      isRevoked: true,
      revokedAt: revokedDate,
    };

    Certificate.findOne = () => ({
      lean: async () => mockCert,
    });

    try {
      const res = await request({
        method: 'GET',
        url: '/api/verify/a1b2c3d4e5f6',
      });
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.status, 'revoked');
      assert.ok(res.body.revokedAt);
    } finally {
      Certificate.findOne = originalFindOne;
    }
  });
});

test('Week 2 Task D: Audit Logs Query Validation Tests', async (t) => {
  const request = mockReqRes(app);
  const adminId = new mongoose.Types.ObjectId().toString();
  const adminUser = { id: adminId, role: 'admin' };

  const originalUserFindById = User.findById;
  User.findById = () => ({
    select: async () => ({ _id: adminId, role: 'admin' }),
  });

  try {
    await t.test('GET /api/admin/audit-logs returns 400 for invalid date format', async () => {
      const res = await request({
        method: 'GET',
        url: '/api/admin/audit-logs?from=not-a-date',
        user: adminUser,
      });
      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /invalid.*date/i);
    });

    await t.test('GET /api/admin/audit-logs returns 400 when from date is after to date', async () => {
      const res = await request({
        method: 'GET',
        url: '/api/admin/audit-logs?from=2026-05-10&to=2026-05-01',
        user: adminUser,
      });
      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /before or equal to/i);
    });
  } finally {
    User.findById = originalUserFindById;
  }
});

test('Week 2 Task E: Notification Endpoints Integration Tests', async (t) => {
  const request = mockReqRes(app);
  const internId = new mongoose.Types.ObjectId().toString();
  const internUser = { id: internId, role: 'intern' };

  await t.test('GET /api/notifications returns user notifications and unreadCount', async () => {
    const originalFind = Notification.find;
    const originalCount = Notification.countDocuments;

    Notification.find = () => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: async () => [
              { _id: new mongoose.Types.ObjectId(), userId: internId, title: 'Welcome', isRead: false }
            ]
          })
        })
      })
    });
    Notification.countDocuments = async () => 1;

    try {
      const res = await request({
        method: 'GET',
        url: '/api/notifications?unread=true&page=1',
        user: internUser
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.notifications.length, 1);
      assert.equal(res.body.unreadCount, 1);
    } finally {
      Notification.find = originalFind;
      Notification.countDocuments = originalCount;
    }
  });

  await t.test('GET /api/notifications/unread-count returns unread count', async () => {
    const originalCount = Notification.countDocuments;
    Notification.countDocuments = async () => 4;

    try {
      const res = await request({
        method: 'GET',
        url: '/api/notifications/unread-count',
        user: internUser
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.count, 4);
    } finally {
      Notification.countDocuments = originalCount;
    }
  });

  await t.test('PATCH /api/notifications/:id/read returns 404 for invalid/missing notification', async () => {
    const originalFindOne = Notification.findOne;
    Notification.findOne = async () => null;

    try {
      const res = await request({
        method: 'PATCH',
        url: `/api/notifications/${new mongoose.Types.ObjectId().toString()}/read`,
        user: internUser
      });

      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Notification not found' });
    } finally {
      Notification.findOne = originalFindOne;
    }
  });

  await t.test('PATCH /api/notifications/read-all marks all read', async () => {
    const originalUpdateMany = Notification.updateMany;
    Notification.updateMany = async () => ({ modifiedCount: 3 });

    try {
      const res = await request({
        method: 'PATCH',
        url: '/api/notifications/read-all',
        user: internUser
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.modifiedCount, 3);
    } finally {
      Notification.updateMany = originalUpdateMany;
    }
  });
});

test('Week 2 Task F: Admin Revocation Endpoints Integration Tests', async (t) => {
  const request = mockReqRes(app);
  const adminId = new mongoose.Types.ObjectId().toString();
  const adminUser = { id: adminId, role: 'admin' };
  const certId = new mongoose.Types.ObjectId().toString();

  const originalUserFindById = User.findById;
  User.findById = () => ({
    select: async () => ({ _id: adminId, role: 'admin' }),
  });

  try {
    await t.test('PATCH /api/admin/certificates/:id/revoke rejects missing reason with 400', async () => {
      const res = await request({
        method: 'PATCH',
        url: `/api/admin/certificates/${certId}/revoke`,
        body: {},
        user: adminUser,
      });

      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /reason is required/i);
    });

    await t.test('PATCH /api/admin/certificates/:id/revoke sets revocation fields and returns 200', async () => {
      const originalFindById = Certificate.findById;
      const mockCert = {
        _id: certId,
        certificateNumber: 'UTS-2026-000001',
        isRevoked: false,
        save: async function () { return this; },
        populate: async function () { return this; },
      };

      Certificate.findById = () => ({
        populate: async () => mockCert,
      });

      try {
        const res = await request({
          method: 'PATCH',
          url: `/api/admin/certificates/${certId}/revoke`,
          body: { reason: 'Academic policy non-compliance' },
          user: adminUser,
        });

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.certificate.isRevoked, true);
        assert.equal(res.body.certificate.revokedReason, 'Academic policy non-compliance');
      } finally {
        Certificate.findById = originalFindById;
      }
    });
  } finally {
    User.findById = originalUserFindById;
  }
});
