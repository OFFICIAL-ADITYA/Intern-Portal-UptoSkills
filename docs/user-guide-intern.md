# UPTOSKILL Intern Portal — Intern User Guide

**Last Updated:** November 19, 2026  
**Document Version:** 4.1.0  

---

## 1. Getting Started & First-Time Login

When your internship is created by UPTOSKILL, you receive an onboarding email containing your:
- **Registered Email Address**
- **Intern Code** (e.g. `INT-9K42XQ`)

### Step 1: Initial Login
1. Open the portal login page at `/login`.
2. Enter your registered email address.
3. In the password field, enter your assigned **Intern Code**.
4. Click **Sign In**.

```
+-------------------------------------------------------------+
|                     UPTOSKILL PORTAL                        |
|                                                             |
|   Email Address: [ intern@uptoskills.com                  ] |
|   Intern Code or Password: [ INT-9K42XQ                   ] |
|                                                             |
|                    [ Sign In Button ]                       |
|                 [ Forgot your password? ]                   |
+-------------------------------------------------------------+
```

---

## 2. Setting Your Custom Password

For security, you must set a personal password after your first login.

1. Navigate to the **Settings** tab on the left sidebar.
2. Under **Change Password**:
   - For your first time, enter your **Intern Code** in the **Current Password** field.
   - Enter your **New Password** (minimum 8 characters, containing at least one letter and one number).
   - Re-enter the new password in **Confirm New Password**.
3. Click **Update Password**.
4. Once set, your Intern Code is permanently deactivated for login; you must use your new password.

---

## 3. Updating Your Profile

You can keep your contact details current at any time:
1. In the **Settings** view, locate the **Profile Details** card.
2. Edit your **Mobile Number**.
3. Click **Save Changes**. A confirmation toast notification will appear.

---

## 4. Internship Journey Progress & Key Stats

Your dashboard features a real-time progress monitor:
- **Journey Timeline Card**: Shows your official Start Date, connecting arrow, End Date, and an animated progress bar indicating overall tenure completion percentage.
- **Stat Cards Grid**:
  - **Role**: Assigned internship role (e.g. `Intern`).
  - **Domain**: Technical track (e.g. `Full Stack Web Development`).
  - **Days Remaining**: Real-time counter of days left until program completion.
  - **Completion**: Visual percentage calculation of your internship period.

---

## 5. Requesting a Certificate

1. On your Dashboard, navigate to the **Certificates** tab (or click **Request Certificate** on Overview).
2. In the modal:
   - Select the desired **Certificate Type** (e.g., `Internship Completion Certificate`, `Bonafide Certificate`, `Offer Letter`, `Experience Letter`).
   - Enter an optional **Reason / Note** explaining your request.
3. Click **Submit Request**.
4. Your request is immediately submitted with status **Pending**, and your Team Leader is notified.

---

## 6. Tracking Request Status & Downloading Certificates

Under the **My Requests** table, you can track the real-time status of all your submissions:

| Status Badge | Meaning | Next Step |
|---|---|---|
| <span style="color:#f59e0b">● Pending</span> | Submitted; awaiting Team Leader review. | Team Leader will evaluate your internship milestones. |
| <span style="color:#3b82f6">● Processing</span> | Approved by Team Leader; in Admin queue. | Admin will review the visual draft and finalize. |
| <span style="color:#10b981">● Completed</span> | Finalized! Certificate generated. | **Download PDF** button is enabled. Click to download. |
| <span style="color:#ef4444">● Rejected</span> | Request declined with recorded reason. | View reason in table or contact Team Leader. |

---

## 7. Using the AI Guidance Assistant

Need quick help while using the portal?
1. Click the floating **AI Assistant** button in the lower-right corner of your screen (automatically elevated above the mobile bottom dock on phones).
2. On desktop, an interactive chat window opens. On mobile devices (`<= 640px`), it seamlessly expands into a smooth native bottom-sheet drawer (`82vh` height) with backdrop blur.
3. Type any question, such as:
   - *"How do I track my certificate?"*
   - *"What certificate types are available?"*
   - *"How do I change my password?"*
4. The assistant will instantly provide guidance tailored to the portal.

---

## 8. Mobile Bottom Dock Navigation

On mobile screens (`<= 768px`):
- The desktop left sidebar is replaced by a fixed bottom dock with brand-themed Teal active indicator tabs:
  - **Dashboard**: Overview, journey progress, and KPI stat cards.
  - **Certificates**: Certificate desk and request submission.
  - **Settings**: Profile update and password change.
- Safe-area insets (`env(safe-area-inset-bottom)`) ensure comfortable navigation on devices with home indicator bars (e.g. iPhone).

---

## 9. Archived Accounts FAQ

> **What does it mean if my account is archived?**  
> In accordance with institutional data retention policies, completed internships are archived after 90 days. While archived, certificate verification remains fully functional, but portal login is locked. If you need account reactivation, contact `admin@uptoskills.com`.
