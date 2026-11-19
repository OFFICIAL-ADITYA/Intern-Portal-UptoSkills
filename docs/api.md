# UPTOSKILL Intern Portal — API Reference

**Last Updated:** November 19, 2026  
**Document Version:** 4.1.0  
**Base URL:** `http://localhost:3000` (Local) / Configured via host in production  

All requests expecting or returning data use `Content-Type: application/json`. Authenticated routes require an `httpOnly` cookie named `token` or `Authorization: Bearer <jwt>`.

---

## 1. System & Health

### `GET /api/health`
Checks database connection status and server health.

- **Role:** Public (No authentication required)
- **Response `200 OK`:**
  ```json
  {
    "status": "healthy",
    "database": "connected",
    "uptimeSeconds": 3482,
    "timestamp": "2026-11-17T20:30:00.000Z"
  }
  ```
- **Response `503 Service Unavailable`:**
  ```json
  {
    "status": "unhealthy",
    "database": "disconnected",
    "uptimeSeconds": 3482,
    "timestamp": "2026-11-17T20:30:00.000Z"
  }
  ```

---

## 2. Authentication (`/api/auth`)

### `POST /api/auth/login`
Authenticates a user and issues a JWT stored in an `httpOnly` cookie.

- **Role:** Public (Rate limited: 5 requests / 15m)
- **Request Body:**
  ```json
  {
    "email": "intern@uptoskills.com",
    "password": "Password123"
  }
  ```
  *Note:* For interns on their very first login before setting a custom password, `password` is their `internCode` (e.g. `INT-9K42XQ`). Once `passwordSetAt` is set, `internCode` is rejected and only the bcrypt password is accepted.
- **Response `200 OK`:**
  ```json
  {
    "message": "Login successful",
    "user": {
      "id": "651a1b2c3d4e5f6789012345",
      "fullName": "Jane Doe",
      "email": "intern@uptoskills.com",
      "role": "intern",
      "domain": "Web Development"
    }
  }
  ```
- **Error Codes:** `400` (Missing email/password), `401` (Invalid credentials), `403` (Account archived), `429` (Rate limit exceeded).

### `GET /api/auth/get-me`
Retrieves currently authenticated session user.

- **Role:** Authenticated (Any role)
- **Response `200 OK`:**
  ```json
  {
    "user": {
      "id": "651a1b2c3d4e5f6789012345",
      "email": "intern@uptoskills.com",
      "role": "intern",
      "fullName": "Jane Doe"
    }
  }
  ```

### `POST /api/auth/logout`
Clears session cookie and records `LOGOUT` audit event.

- **Role:** Authenticated
- **Response `200 OK`:**
  ```json
  { "message": "User logged out successfully" }
  ```

### `POST /api/auth/forgot-password`
Generates a secure password reset token and sends email via Brevo.

- **Role:** Public (Rate limited: 3 requests / 1h)
- **Request Body:** `{ "email": "intern@uptoskills.com" }`
- **Response `200 OK`:** `{ "message": "Password reset email sent if account exists" }`

### `POST /api/auth/reset-password`
Resets password using token received via email.

- **Role:** Public (Rate limited: 5 requests / 15m)
- **Request Body:**
  ```json
  {
    "token": "a1b2c3d4e5f6...",
    "newPassword": "NewPassword123"
  }
  ```
- **Response `200 OK`:** `{ "message": "Password reset successful. You can now log in." }`

---

## 3. Intern Endpoints (`/api/intern`)

All intern endpoints require `role: "intern"`.

### `GET /api/intern/profile`
Returns logged-in intern profile and internship details.

- **Response `200 OK`:**
  ```json
  {
    "user": {
      "id": "651a1b2c3d4e5f6789012345",
      "fullName": "Jane Doe",
      "email": "intern@uptoskills.com",
      "internCode": "INT-9K42XQ",
      "domain": "Web Development",
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": "2026-03-31T00:00:00.000Z",
      "mobileNo": "9876543210",
      "passwordSetAt": "2026-01-02T10:00:00.000Z",
      "internshipDetails": {
        "status": "ongoing",
        "teamleaderEmail": "tl@uptoskills.com"
      }
    }
  }
  ```

### `PATCH /api/intern/set-password`
Configures or updates password. First-time setup validates `currentSecret` against `internCode`. Subsequent changes validate against current password.

- **Request Body:**
  ```json
  {
    "currentSecret": "INT-9K42XQ",
    "newPassword": "SecurePassword123"
  }
  ```
- **Response `200 OK`:** `{ "message": "Password updated successfully" }`
- **Error Codes:** `400` (Weak password / Incorrect current password).

### `PATCH /api/intern/profile`
Updates whitelisted profile fields (`mobileNo` only). Other fields are ignored.

- **Request Body:** `{ "mobileNo": "9876543210" }`
- **Response `200 OK`:** `{ "message": "Profile updated successfully", "user": { ... } }`

### `POST /api/intern/request-certificate`
Submits a new certificate request.

- **Request Body:**
  ```json
  {
    "certificateType": "completion_certificate",
    "reason": "Completing full stack internship milestones"
  }
  ```
- **Allowed Types:** `offer_letter`, `bonafide`, `ojt_certificate`, `experience_letter`, `experience_letter_detailed`, `completion_certificate`, `intern_of_month`, `league_winner`, `custom`.
- **Response `201 Created`:**
  ```json
  {
    "message": "Certificate request submitted successfully",
    "request": {
      "requestNumber": "CERT-2026-00042",
      "status": "pending",
      "certificateType": "completion_certificate"
    }
  }
  ```
- **Error Codes:** `400` (Invalid certificate type), `409` (Active request already exists for this type).

### `GET /api/intern/requests`
Returns all certificate requests submitted by this intern.

- **Response `200 OK`:**
  ```json
  {
    "requests": [
      {
        "_id": "652...",
        "requestNumber": "CERT-2026-00042",
        "certificateType": "completion_certificate",
        "status": "completed",
        "requestedAt": "2026-02-01T00:00:00.000Z",
        "certificateId": "653..."
      }
    ]
  }
  ```

### `GET /api/intern/requests/:id/certificate/download`
Downloads finalized PDF certificate for completed request.

- **Response:** Binary PDF stream (`Content-Disposition: attachment; filename="CERT-2026-00042.pdf"`).
- **Error Codes:** `403` (Not your certificate), `404` (Certificate not found).

### `POST /api/intern/chat`
Portal AI Guidance Assistant for common FAQs, status tracking, and rules.

- **Request Body:** `{ "message": "How do I request a certificate?" }`
- **Response `200 OK`:**
  ```json
  {
    "reply": "To request a certificate, navigate to the 'Overview' tab on your dashboard and click 'Request Certificate'...",
    "timestamp": "2026-11-17T20:30:00.000Z"
  }
  ```

---

## 4. Team Leader Endpoints (`/api/teamleader`)

All TL endpoints require `role: "teamleader"`. Access is scoped to interns assigned to this TL.

### `GET /api/teamleader/interns`
Returns all interns assigned to the requesting Team Leader.

### `GET /api/teamleader/requests-for-review`
Returns all `pending` certificate requests submitted by this TL's assigned interns.

### `PATCH /api/teamleader/requests/:id/review`
Reviews a certificate request.

- **Forward Request Body:** `{ "action": "forward" }` (moves status to `processing`).
- **Reject Request Body:** `{ "action": "reject", "rejectionReason": "Attendance requirement not met" }` (moves status to `rejected`).
- **Error Codes:** `403` (Request does not belong to your intern), `404` (Request not found), `409` (Already reviewed).

### `POST /api/teamleader/intern`
Creates a new intern directly assigned to this Team Leader.

---

## 5. Admin Endpoints (`/api/admin`)

All admin endpoints require `role: "admin"`.

### `POST /api/admin/create-intern`
Creates an intern and links them to a specified `teamleaderEmail`.

### `POST /api/admin/create-tl`
Creates a new Team Leader account.

### `GET /api/admin/requests`
Returns filtered list of requests with search and pagination. Query params: `status`, `domain`, `teamLeaderId`, `page`, `limit`.

### `PATCH /api/admin/requests/:id/review`
Admin approves (generates draft) or rejects a forwarded request.

### `GET /api/admin/certificates/:id`
Retrieves certificate draft for visual review/editing.

### `PATCH /api/admin/certificates/:id/finalize`
Finalizes draft, renders high-resolution PDF via Puppeteer, and sends notification email.

### `PATCH /api/admin/certificates/:id/revoke`
Revokes an issued certificate.
- **Request Body:** `{ "reason": "Academic dishonesty" }`

### `GET /api/admin/audit-logs`
Queries tamper-evident audit logs. Query params: `action`, `actorRole`, `from`, `to`, `page`, `limit`.

### `GET /api/admin/audit-logs/export`
Exports audit logs to CSV file.

### `GET /api/admin/analytics/:widget`
Provides analytics data for: `overview`, `requests-trend`, `certificate-types`, `turnaround`, `team-leaders`, `domains`, `pipeline`, `stuck`, `upcoming-completions`.

### `GET /api/admin/analytics/export?type=overview`
Exports analytics data to CSV.

---

## 6. Public Endpoints (`/api/verify`)

### `GET /api/verify/:verifyId`
Public verification endpoint for issued certificates.
- **Rate Limit:** 30 requests / 1m.
- **Response `200 OK` (Valid):**
  ```json
  {
    "certificateNumber": "CERT-2026-00042",
    "recipientName": "Jane Doe",
    "certificateTitle": "Internship Completion",
    "domain": "Web Development",
    "issuedDate": "2026-03-31T00:00:00.000Z",
    "status": "finalized",
    "isRevoked": false
  }
  ```
- **Response `200 OK` (Revoked):**
  ```json
  {
    "certificateNumber": "CERT-2026-00042",
    "recipientName": "Jane Doe",
    "status": "revoked",
    "isRevoked": true,
    "revokedAt": "2026-04-10T12:00:00.000Z",
    "revocationReason": "Academic dishonesty"
  }
  ```
- **Response `404 Not Found`:** Unknown or invalid verify ID.
