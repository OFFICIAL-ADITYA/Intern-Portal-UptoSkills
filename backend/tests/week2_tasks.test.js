import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import AuditLog from '../src/models/AuditLog.model.js';
import Notification from '../src/models/Notification.model.js';
import Certificate from '../src/models/Certificate.js';
import { sanitizeMeta, logAction } from '../src/utils/logAction.js';
import { notify } from '../src/services/notification.service.js';
import { mapCertificateTitle, generateVerifyId } from '../src/services/certificate.service.js';

test('Week 2 Task D: Audit Logs Unit Tests', async (t) => {
  await t.test('Sanitizer strips password, token, internCode, resetPasswordToken and secret keys', () => {
    const raw = {
      password: 'plain_password',
      token: 'jwt_token',
      internCode: 'UPS-2026-001',
      resetPasswordToken: 'sha256_hash',
      clientSecret: 'secret_123',
      nested: {
        api_secret: 'api_key',
        allowedField: 'safeValue',
        deep: {
          mySecretKey: 'classified',
          normal: 42
        }
      },
      validField: 'hello world'
    };

    const cleaned = sanitizeMeta(raw);
    assert.equal(cleaned.password, undefined);
    assert.equal(cleaned.token, undefined);
    assert.equal(cleaned.internCode, undefined);
    assert.equal(cleaned.resetPasswordToken, undefined);
    assert.equal(cleaned.clientSecret, undefined);
    assert.equal(cleaned.nested.api_secret, undefined);
    assert.equal(cleaned.nested.allowedField, 'safeValue');
    assert.equal(cleaned.nested.deep.mySecretKey, undefined);
    assert.equal(cleaned.nested.deep.normal, 42);
    assert.equal(cleaned.validField, 'hello world');
  });

  await t.test('logAction never throws even when inputs are missing or malformed', async () => {
    const result1 = await logAction();
    assert.equal(result1, null);

    const result2 = await logAction({ action: null });
    assert.equal(result2, null);

    const result3 = await logAction({ action: 'TEST_ACTION', meta: null });
    assert.equal(result3, null); // Offline unit test mode
  });

  await t.test('AuditLog schema hooks prevent updateOne, findOneAndUpdate, and deleteOne', async () => {
    await assert.rejects(async () => {
      await AuditLog.updateOne({ _id: new mongoose.Types.ObjectId() }, { action: 'NEW' });
    }, /append-only/i);

    await assert.rejects(async () => {
      await AuditLog.findOneAndUpdate({ _id: new mongoose.Types.ObjectId() }, { action: 'NEW' });
    }, /append-only/i);

    await assert.rejects(async () => {
      await AuditLog.deleteOne({ _id: new mongoose.Types.ObjectId() });
    }, /append-only/i);
  });
});

test('Week 2 Task E: Notifications Service Unit Tests', async (t) => {
  await t.test('notify() handles missing or invalid userId gracefully without throwing', async () => {
    const result = await notify(null, 'TEST', { title: 'T', message: 'M' });
    assert.equal(result, null);
  });
});

test('Week 2 Task F: Certificate Verification & Revocation Unit Tests', async (t) => {
  await t.test('generateVerifyId() returns 12-character random string', () => {
    const id1 = generateVerifyId();
    const id2 = generateVerifyId();
    assert.equal(typeof id1, 'string');
    assert.equal(id1.length, 12);
    assert.notEqual(id1, id2);
  });

  await t.test('mapCertificateTitle() correctly formats certificate types', () => {
    assert.equal(mapCertificateTitle('completion_certificate'), 'Internship Completion');
    assert.equal(mapCertificateTitle('bonafide'), 'Bonafide Certificate');
    assert.equal(mapCertificateTitle('offer_letter'), 'Internship Offer Letter');
    assert.equal(mapCertificateTitle('ojt_certificate'), 'On-the-Job Training Certificate');
  });
});
