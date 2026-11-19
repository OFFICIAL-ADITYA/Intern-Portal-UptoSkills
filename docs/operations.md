# UPTOSKILL Intern Portal — Operations & Runbook

**Last Updated:** November 19, 2026  
**Document Version:** 4.1.0  

---

## 1. Daily Background Cron Jobs

All background jobs run in timezone `Asia/Kolkata` (IST) and are initialized at server start in `backend/src/jobs/index.js`.

### Job 1: Status Synchronizer (Daily at 00:00 IST)
- **Schedule:** `0 0 * * *`
- **Purpose:** Automatically progresses internship lifecycle states:
  - `upcoming` → `ongoing` when `startDate <= today`.
  - `ongoing` → `completed` when `endDate < today`.
- **Catch-Up Execution:** If the host process was asleep or restarted after midnight, the scheduler executes a catch-up run on server boot.

### Job 2: Retention & Archival Processor (Daily at 02:00 IST)
- **Schedule:** `0 2 * * *`
- **Purpose:** Enforces data privacy and institutional retention policies:
  - Warns interns approaching archival window via notification.
  - Sets `isArchived = true` and `archivedAt = now` for interns completed beyond the retention threshold (default 90 days).
  - Deletes or purges expired data beyond the purge window (default 180 days).
- **Dry-Run Mode:** Can be executed safely without writing changes to the database by setting the retention policy mode to `dryRun: true`.

---

## 2. Reading & Exporting Audit Logs

Audit logs are immutable and recorded for all security, authentication, and state-change actions.

### Key Action Identifiers
- `LOGIN` / `LOGIN_FAILED` / `LOGOUT`: Authentication tracking.
- `PASSWORD_CHANGED` / `PASSWORD_RESET_COMPLETED`: Credential lifecycle.
- `REQUEST_SUBMITTED`: Student request creation.
- `REQUEST_FORWARDED` / `REQUEST_REJECTED`: Team Leader evaluation.
- `CERTIFICATE_DRAFT_CREATED` / `CERTIFICATE_FINALIZED`: Generation events.
- `CERTIFICATE_REVOKED`: Administrative revocation.
- `INTERN_ARCHIVED` / `INTERN_RESTORED`: Retention lifecycle.
- `EXPORT`: Audit and analytics CSV downloads.

### Exporting Audit Data
From the Admin Dashboard:
1. Navigate to **Audit Logs**.
2. Apply desired date, action, or role filters.
3. Click **Export CSV**.
4. The downloaded file contains actor IDs, target IDs, IP addresses, user agents, and sanitized metadata.

---

## 3. Retrying a Failed Certificate Generation

If a network or system glitch interrupts Puppeteer during finalization:
1. Navigate to **Forwarded Requests** or **Certificates Overview**.
2. Locate the request. If status is `approved` or generation failed, click **Retry Generation**.
3. The system resets draft locks and regenerates the HTML layout and PDF buffer.
4. If Chromium crashes repeatedly, verify available RAM on the host container (minimum 1GB RAM required for Chromium rendering) and verify `PUPPETEER_EXECUTABLE_PATH`.

---

## 4. Restoring an Archived Intern

If an alumnus or student requires temporary portal access:
1. As Admin, navigate to **Data Retention** → **Archived Interns**.
2. Click **Restore Account** next to the intern.
3. The backend clears `isArchived`, resets `archivedAt`, and logs an `INTERN_RESTORED` audit event.
4. The intern can immediately log in with their existing password.

---

## 5. Common Operational Errors & Troubleshooting

### Issue 1: `429 Too Many Requests`
- **Cause:** Rate limiter triggered on login (5 / 15m), forgot password (3 / 1h), or verification (30 / 1m).
- **Fix:** Wait for the duration specified in the `Retry-After` header. In local development or testing, rate limits can be disabled by setting `ENABLE_TEST_RATE_LIMIT=false`.

### Issue 2: Puppeteer Fails with `Error: Failed to launch the browser process!`
- **Cause:** Missing shared libraries on Linux (e.g. `libatk-1.0`, `libnss3`).
- **Fix:** Install the dependencies listed in `docs/deployment.md` or set `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`.

### Issue 3: Certificate Download Returns `403 Forbidden`
- **Cause:** User is not authenticated as the certificate owner or an Admin.
- **Fix:** Ensure the intern is logged into the specific account linked to that certificate.

### Issue 4: Email Reset Links / Notifications Do Not Arrive
- **Cause:** Invalid Brevo SMTP credentials or unverified sender domain.
- **Fix:** Verify `BREVO_SMTP_USER` and `BREVO_SMTP_KEY` in environment configuration, and ensure `BREVO_SENDER_EMAIL` matches a verified sender in Brevo.
