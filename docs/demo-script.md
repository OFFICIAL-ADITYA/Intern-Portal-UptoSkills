# UPTOSKILL Intern Portal — Final Release Demo Script (10–15 Minutes)

**Last Updated:** November 19, 2026  
**Document Version:** 4.1.0  
**Audience:** Team Leaders, Mentors, Project Evaluators & Stakeholders  

---

## 1. Demo Overview & Timeline

| Time | Phase | Focus |
|---|---|---|
| **00:00 – 02:00** | Introduction & Architecture | Overview, tech stack, security, and unified user model. |
| **02:00 – 05:00** | Intern Workflow | First-time login with internCode, password setup, request certificate, AI guidance. |
| **05:00 – 08:00** | Team Leader Workflow | Review queue, scoped permissions, forwarding request. |
| **08:00 – 11:00** | Admin Workflow | Approval, GrapesJS visual editor, Puppeteer finalization & PDF generation. |
| **11:00 – 13:00** | Public Verification & QR Code | Scanning QR code, instant verification, revoked certificate handling. |
| **13:00 – 15:00** | Hardening, Audit & Analytics | Retention jobs, audit logs CSV export, interactive Recharts dashboard, Q&A. |

---

## 2. Test Accounts for the Demo

| Role | Email | Initial Password / Secret | Description |
|---|---|---|---|
| **Admin** | `admin@uptoskills.com` | `Admin@123` | Global Administrator account |
| **Team Leader** | `tl.rahul@uptoskills.com` | `TeamLeader@123` | Assigned Team Leader for Web Development group |
| **Intern (Active)** | `intern.ananya@uptoskills.com` | `INT-W4DEMO` | Web Development Intern |
| **Intern (Archived)**| `intern.vikram@uptoskills.com` | `Archived@123` | Completed intern (demonstrates 403 archive lock) |

---

## 3. Step-by-Step Presentation Walkthrough

### Part 1: Intern Onboarding & Request Submission (3 Mins)
1. **Login with Intern Code**:
   - Navigate to `/login`.
   - Enter `intern.ananya@uptoskills.com` and `INT-W4DEMO`.
   - *Key Point to Highlight:* Explain that initial intern code functions as single-use first secret.
2. **Password Setup**:
   - Go to **Settings**. Show the **Change Password** card.
   - Enter `INT-W4DEMO` as current secret, set new password `AnanyaPass2026!`.
   - Log out and log back in with `AnanyaPass2026!`. Demonstrate that `INT-W4DEMO` is now rejected.
3. **Submit Certificate Request**:
   - On the Overview dashboard, click **Request Certificate**.
   - Choose `Internship Completion Certificate`, reason: *"Completed full-stack capstone and project defense"*.
   - Click **Submit**. Show real-time **Pending** badge and in-app toast.
4. **AI Assistant**:
   - Open floating AI chat bubble in bottom-right corner.
   - Ask: *"How do I track my certificate request?"*. Show the instant contextual response.

### Part 2: Team Leader Review (3 Mins)
1. **Login as Team Leader**:
   - Navigate to `/login`, enter `tl.rahul@uptoskills.com` / `TeamLeader@123`.
2. **Notification Bell**:
   - Notice the unread badge on top bell. Click to show *"New Certificate Request from Ananya"*.
3. **Pending Review Queue**:
   - Go to **Pending Reviews**.
   - Locate Ananya's request.
   - *Security Point to Highlight:* Show that only Ananya and this TL's assigned interns appear (strict multi-tenant scoping).
4. **Forwarding Request**:
   - Click **Review** → click **Forward to Admin**.
   - Show status immediately updating to **Processing**.

### Part 3: Admin Review, Visual Editing & Finalization (3 Mins)
1. **Login as Admin**:
   - Navigate to `/login`, enter `admin@uptoskills.com` / `Admin@123`.
2. **Forwarded Requests Queue**:
   - Open **Forwarded Requests**. Find Ananya's request.
   - Click **Review Request**. The backend generates a draft certificate.
3. **Visual Drag-and-Drop Editor (GrapesJS)**:
   - Click **Edit Certificate**.
   - Show the certificate canvas: pre-populated student name, domain, dates, organization, and unguessable QR code.
   - Make a quick visual tweak (e.g. adjust font weight or add honors note).
   - Click **Save Draft**.
4. **Finalization & Puppeteer PDF Generation**:
   - Click **Finalize & Issue Certificate**.
   - Explain Puppeteer background rendering (A4 landscape, zero margins, font readiness).
   - Show request transition to **Completed**.

### Part 4: Download & Public Verification (2 Mins)
1. **Intern Download**:
   - Switch back to intern window.
   - The status is now **Completed**. Click **Download PDF**.
   - Open the generated PDF: crisp high-resolution layout with official verification seal and QR code.
2. **Scan & Verify**:
   - Click or scan the QR code link to open `/verify/:verifyId`.
   - Point out that **no private student data** (such as mobile number, email, or passwords) is exposed—only public credential verification.

### Part 5: Audit Log & Analytics Demonstration (2 Mins)
1. **Audit Journal**:
   - Back in Admin Dashboard, open **Audit Logs**.
   - Show the exact chronological sequence recorded:
     `LOGIN` → `PASSWORD_CHANGED` → `REQUEST_SUBMITTED` → `REQUEST_FORWARDED` → `CERTIFICATE_FINALIZED`.
   - Click **Export CSV** to demonstrate compliance export.
2. **Admin Analytics Dashboard**:
   - Open **Analytics**.
   - Showcase Recharts visualizations: Requests Trend, Certificate Types donut, Pipeline funnel, and Turnaround Percentiles (Average, Median, P90).
3. **Conclusion & Handover**:
   - Hand over the signed-off release checklist and open for Q&A.
