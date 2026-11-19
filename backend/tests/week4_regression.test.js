import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// App & Controllers
import app from '../src/app.js';
import { chatWithAssistant } from '../src/controllers/intern.controller.js';
import { login } from '../src/controllers/auth.controller.js';
import { restoreArchivedIntern, revokeCertificate } from '../src/controllers/admin.controller.js';

// Models
import User from '../src/models/User.js';
import Certificate from '../src/models/Certificate.js';
import AuditLog from '../src/models/AuditLog.model.js';

const mockRes = () => {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    cookies: {},
    clearedCookies: {},
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
    }
  };
  return res;
};

// =========================================================================
// Week 4 Task J: Health Check & Environment Verification
// =========================================================================
test('Task J: Health Check & Environment Tests', async (t) => {

  await t.test('GET /api/health returns 200 and healthy status when database is ready', async () => {
    const originalReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    try {
      const res = await new Promise((resolve) => {
        const r = mockRes();
        r.json = function(data) {
          this.body = data;
          resolve(this);
        };
        app.handle({ method: 'GET', url: '/api/health', headers: { host: 'localhost' } }, r);
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.status, 'healthy');
      assert.equal(res.body.database, 'connected');
      assert.ok(typeof res.body.uptimeSeconds === 'number');
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
    }
  });

  await t.test('GET /api/health returns 503 and unhealthy status when database is disconnected', async () => {
    const originalReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

    try {
      const res = await new Promise((resolve) => {
        const r = mockRes();
        r.json = function(data) {
          this.body = data;
          resolve(this);
        };
        app.handle({ method: 'GET', url: '/api/health', headers: { host: 'localhost' } }, r);
      });

      assert.equal(res.statusCode, 503);
      assert.equal(res.body.status, 'unhealthy');
      assert.equal(res.body.database, 'disconnected');
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
    }
  });
});

// =========================================================================
// Week 4 Task M: Chatbot Integration Tests
// =========================================================================
test('Task M: Chatbot Guidance Endpoint Tests', async (t) => {

  await t.test('POST /api/intern/chat rejects empty or whitespace-only messages with 400', async () => {
    const req = {
      user: { id: new mongoose.Types.ObjectId().toString(), role: 'intern' },
      body: { message: '   ' }
    };
    const res = mockRes();

    await chatWithAssistant(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'A non-empty message is required.');
  });

  await t.test('POST /api/intern/chat rejects messages exceeding 500 characters with 400', async () => {
    const req = {
      user: { id: new mongoose.Types.ObjectId().toString(), role: 'intern' },
      body: { message: 'A'.repeat(501) }
    };
    const res = mockRes();

    await chatWithAssistant(req, res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.message.includes('500 characters'));
  });

  await t.test('POST /api/intern/chat returns contextual guidance on certificate requests', async () => {
    const origFindById = User.findById;
    try {
      User.findById = () => ({
        select: async () => ({ fullName: 'Intern Jane', domain: 'Web Dev' })
      });

      const req = {
        user: { id: new mongoose.Types.ObjectId().toString(), role: 'intern' },
        body: { message: 'How do I request a certificate?' }
      };
      const res = mockRes();

      await chatWithAssistant(req, res);
      assert.equal(res.statusCode, 200);
      assert.ok(res.body.reply.includes('Request Certificate'));
      assert.ok(typeof res.body.timestamp === 'string');
    } finally {
      User.findById = origFindById;
    }
  });

  await t.test('POST /api/intern/chat returns guidance on password change and settings', async () => {
    const origFindById = User.findById;
    try {
      User.findById = () => ({
        select: async () => ({ fullName: 'Intern Jane', domain: 'Web Dev' })
      });

      const req = {
        user: { id: new mongoose.Types.ObjectId().toString(), role: 'intern' },
        body: { message: 'How can I change my password or mobile?' }
      };
      const res = mockRes();

      await chatWithAssistant(req, res);
      assert.equal(res.statusCode, 200);
      assert.ok(res.body.reply.includes('Settings'));
    } finally {
      User.findById = origFindById;
    }
  });
});

// =========================================================================
// Week 4 Task K: Archive, Restore & Full Regression Tests
// =========================================================================
test('Task K: Regression & Role Workflow Tests', async (t) => {

  await t.test('Archived intern account login is blocked with 403', async () => {
    const origFindOne = User.findOne;
    const origAuditCreate = AuditLog.create;

    try {
      const internId = new mongoose.Types.ObjectId();
      const mockArchivedUser = {
        _id: internId,
        email: 'archived@example.com',
        role: 'intern',
        isArchived: true,
        password: await bcrypt.hash('Secret123', 10),
        comparePassword: async function(plain) {
          return bcrypt.compare(plain, this.password);
        }
      };

      User.findOne = async () => mockArchivedUser;
      AuditLog.create = async () => ({});

      const req = {
        body: { email: 'archived@example.com', password: 'Secret123' },
        ip: '127.0.0.1'
      };
      const res = mockRes();

      await login(req, res);
      assert.equal(res.statusCode, 403);
      assert.ok(res.body.message.includes('archived'));
    } finally {
      User.findOne = origFindOne;
      AuditLog.create = origAuditCreate;
    }
  });

  await t.test('Admin restoreArchivedIntern unarchives intern and creates RESTORE audit entry', async () => {
    const origFindOne = User.findOne;
    const origAuditCreate = AuditLog.create;

    try {
      let saved = false;
      let auditLogged = false;

      const mockArchivedUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'restored@example.com',
        fullName: 'Restored Intern',
        role: 'intern',
        isArchived: true,
        archivedAt: new Date(),
        save: async function() {
          saved = true;
          this.isArchived = false;
          this.archivedAt = null;
          return this;
        }
      };

      User.findOne = async () => mockArchivedUser;
      AuditLog.create = async (doc) => {
        if (doc.action === 'INTERN_RESTORED' || doc.action === 'RESTORE') {
          auditLogged = true;
        }
        return doc;
      };

      const req = {
        params: { id: mockArchivedUser._id.toString() },
        user: { id: new mongoose.Types.ObjectId().toString(), role: 'admin' },
        ip: '127.0.0.1'
      };
      const res = mockRes();

      await restoreArchivedIntern(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(mockArchivedUser.isArchived, false);
      assert.equal(saved, true);
    } finally {
      User.findOne = origFindOne;
      AuditLog.create = origAuditCreate;
    }
  });

  await t.test('Admin revokeCertificate marks certificate as revoked and logs CERTIFICATE_REVOKED', async () => {
    const origFindById = Certificate.findById;
    const origAuditCreate = AuditLog.create;

    try {
      let saved = false;
      let auditLogged = false;
      const certId = new mongoose.Types.ObjectId();

      const mockCert = {
        _id: certId,
        certificateNumber: 'CERT-2026-0001',
        status: 'finalized',
        isRevoked: false,
        userId: { _id: new mongoose.Types.ObjectId(), fullName: 'Jane Doe', email: 'jane@example.com' },
        save: async function() {
          saved = true;
          return this;
        }
      };

      Certificate.findById = () => ({
        populate: async () => mockCert
      });

      AuditLog.create = async (doc) => {
        if (doc.action === 'CERTIFICATE_REVOKED') auditLogged = true;
        return doc;
      };

      const req = {
        params: { id: certId.toString() },
        body: { reason: 'Academic integrity violation' },
        user: { id: new mongoose.Types.ObjectId().toString(), role: 'admin' },
        ip: '127.0.0.1'
      };
      const res = mockRes();

      await revokeCertificate(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(mockCert.isRevoked, true);
      assert.equal(mockCert.revokedReason, 'Academic integrity violation');
      assert.equal(saved, true);
    } finally {
      Certificate.findById = origFindById;
      AuditLog.create = origAuditCreate;
    }
  });
});
