# UPTOSKILL Intern Portal — Administrator User Guide

**Last Updated:** November 19, 2026  
**Document Version:** 4.1.0  

---

## 1. Overview & Administrator Responsibilities

The Administrator holds global authority across all domains and users in the portal. Key responsibilities include:
- Managing intern and Team Leader accounts with categorized sidebar navigation.
- Reviewing forwarded requests, editing visual templates (GrapesJS), and finalizing certificates (Puppeteer with automatic system Chrome discovery).
- Managing data retention policies and restoring archived student accounts.
- Inspecting security audit logs and monitoring interactive analytics dashboards.
- Revoking certificates in cases of academic integrity violations.

---

## 2. Navigating the Admin Workspace

The Admin Console organizes features into five distinct functional categories:

| Category | Nav Item | Description |
|---|---|---|
| **PRIMARY** | **Overview** | Profile summary, quick action tiles (`Create Intern`, `Create Team Leader`, `Certificate Requests`, `Operations Analytics`), and directory overview. |
| **DIRECTORY** | **Create Intern** | Enroll a student into a specific domain and assign to a Team Leader. |
| | **Create Team Leader** | Provision a new Team Leader with supervisor credentials. |
| **TEMPLATES** | **Certificate Requests** | Review forwarded certificate requests waiting for admin decision. |
| | **Certificate Templates** | Visual template manager and GrapesJS drag-and-drop designer. |
| **OPERATIONS**| **Operations Analytics** | Recharts KPI dashboards, turnaround metrics, and CSV reporting. |
| **COMPLIANCE**| **Retention & Archival** | Configure retention thresholds, preview dry-runs, and restore archived interns. |
| | **Audit Logs** | Immutable compliance journal with action filtering and CSV export. |

---

## 3. User Management

### Creating an Intern
1. In the sidebar under **DIRECTORY**, click **Create Intern** (or use the **Create Intern** quick action tile on Overview).
2. Fill in Full Name, Email, Mobile Number, Domain, Start Date, and End Date.
3. Select or enter the assigned **Team Leader's Email**.
4. Click **Create Account**. An unguessable `internCode` is generated and saved as the initial secret.

### Creating a Team Leader
1. Under **DIRECTORY**, click **Create Team Leader** (or click the **Create Team Leader** quick action tile).
2. Enter Name, Email, and temporary Password (minimum 6 characters).
3. Click **Create User**.

---

## 4. Reviewing, Editing & Finalizing Certificates

Forwarded requests appear in your **Certificate Requests** queue.

### Step 1: Generating a Draft
Click **Review Request**. The system matches the requested certificate type against active Handlebars templates and renders a draft certificate.

### Step 2: Visual Editing (GrapesJS Editor)
If custom wording, formatting, or styling adjustments are needed:
1. Click **Edit Certificate**.
2. The visual Drag-and-Drop Editor allows live editing of text, fonts, borders, seals, and alignment.
3. Placeholders such as `{{recipientName}}`, `{{domain}}`, `{{issueDate}}`, and QR code boxes are auto-populated.
4. Click **Save Draft**.

### Step 3: Finalization & PDF Generation
1. Click **Finalize & Issue Certificate**.
2. The backend launches Puppeteer (automatically using bundled or installed system Chrome/Edge), executes font loading, and generates an immutable A4 landscape PDF.
3. The request status advances to **Completed**, and a transactional email with the PDF download link is dispatched to the intern.

---

## 5. Revoking a Certificate

If a certificate must be invalidated:
1. Navigate to **Certificate Requests** or **Certificates Overview**.
2. Locate the certificate by Certificate Number or Student Name.
3. Click **Revoke**.
4. Enter the justification in the **Revocation Reason** prompt.
5. Click **Confirm Revocation**.
6. The certificate status immediately transitions to `revoked`. The public QR verification page updates in real-time to alert verifiers of the revocation.

---

## 6. Retention Policies & Restoring Archived Interns

1. Under **COMPLIANCE**, click **Retention & Archival**.
2. Configure **Archive Threshold (Days)** (default: 90) and **Purge Threshold (Days)** (default: 180).
3. To restore an archived student:
   - Go to **Archived Interns**.
   - Click **Restore** next to the student's name.
   - The intern's account status is restored to active, and login access is restored.

---

## 7. Audit Logs & Analytics

### Security Audit Journal
1. Go to **Audit Logs**.
2. Filter by Action type (`LOGIN`, `PASSWORD_CHANGED`, `REQUEST_FORWARDED`, `CERTIFICATE_FINALIZED`, `CERTIFICATE_REVOKED`, etc.), date range, or actor role.
3. Click **Export CSV** to download a compliance audit trail.

### Interactive Analytics
1. Navigate to **Operations Analytics**.
2. Inspect KPI widgets (Total Interns, Active Interns, Turnaround Percentiles, Approval Rate).
3. Filter by 7-day, 30-day, or 90-day timeframes, domain, or mentor.
4. Click **Export Report** for executive CSV reporting.

---

## 8. Mobile & Tablet Responsiveness

- **Tablet (`<= 1024px`)**: The sidebar transforms into a sticky, horizontal scrolling tab bar. Quick actions balance into 2 columns.
- **Mobile (`<= 480px`)**: Topbar collapses into icon buttons; quick action tiles stack into full-width touch targets; profile cards and form fields stack into a single column.
