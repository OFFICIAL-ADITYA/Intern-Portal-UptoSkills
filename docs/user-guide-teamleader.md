# UPTOSKILL Intern Portal — Team Leader User Guide

**Last Updated:** November 19, 2026  
**Document Version:** 4.1.0  

---

## 1. Overview & Team Leader Role

Team Leaders serve as the primary reviewers and supervisors for student cohorts. As a Team Leader, your dashboard provides scoped visibility over your assigned students, their project progress, and certificate requests.

---

## 2. Navigating the Team Leader Workspace

The Team Leader Console provides an intuitive two-section sidebar:

- **Main Workspace**:
  - **Overview**: Profile details, cohort status, and 3 quick action tiles (`Create Intern`, `Review Requests`, `My Team Directory`).
- **Team Supervision**:
  - **Certificate Requests**: Pending certificate requests waiting for evaluation.
  - **My Interns**: Complete roster of active and completed interns assigned to your cohort.
  - **Create Intern**: Direct onboarding form to enroll a new intern into your team.

---

## 3. Viewing Your Assigned Interns

1. Log in with your Team Leader credentials.
2. Select **My Interns** in the sidebar (or click the **My Team Directory** quick action tile).
3. You will see a list of all students assigned to your supervision:
   - Full Name, Email, and Intern Code
   - Domain (e.g. Full Stack Web Development, Machine Learning, UI/UX Design)
   - Internship Dates & Duration
   - Current Status (`ongoing`, `upcoming`, `completed`)
4. To add a new intern assigned directly to your group, click **Create Intern** in the sidebar or Overview.

---

## 4. Reviewing Certificate Requests

When an intern requests a certificate, an in-app notification appears in your top notification bell, and the request enters your **Certificate Requests** queue.

### Step 1: Open the Review Queue
1. Click **Certificate Requests** in your sidebar (or click the **Review Requests** quick action tile).
2. View pending requests submitted by your interns.

### Step 2: Evaluating the Request
Click **Review** next to any request to inspect:
- Student Name & Domain
- Requested Certificate Type
- Internship Start & End Dates
- Student's Stated Reason

### Step 3: Taking Action
You have two review actions:
- **Forward to Admin (Approve)**:
  - Click **Forward to Admin**.
  - The request status advances to **Processing**, and moves into the Admin finalization queue.
- **Reject Request**:
  - Click **Reject**.
  - A modal prompts you for a **Rejection Reason** (e.g., *"Missing week 4 capstone submission"*).
  - The reason is recorded in the audit log, the request transitions to **Rejected**, and the intern receives an immediate notification with your feedback.

---

## 5. Scoped Security Rules

To ensure privacy and data integrity:
- You can **only** review requests belonging to interns assigned to your Team Leader ID.
- Attempting to inspect or modify another mentor's intern is strictly denied with a `403 Forbidden` response.
- All review actions (forwards and rejections) are permanently logged in the tamper-evident audit journal.

---

## 6. Mobile & Tablet Responsiveness

- **Tablet (`<= 1024px`)**: Navigation transforms into a top-docked horizontal scrolling tab bar. Quick actions adapt into 2 columns.
- **Mobile (`<= 480px`)**: Topbar collapses into icon buttons; quick action tiles stack vertically; form inputs and intern cards adapt to single-column touch views.
