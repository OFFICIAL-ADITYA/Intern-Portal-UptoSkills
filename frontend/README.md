# UPTOSKILL Intern Portal — Frontend Application

**Version:** 4.1.0 (Production Release)  
**Last Updated:** November 19, 2026  
**Framework:** React 19 + Vite 8 + React Router v7  

---

## 1. Overview

The **UPTOSKILL Intern Portal Frontend** is a modern, high-performance Single Page Application (SPA) providing tailored workspaces for **Interns**, **Team Leaders**, and **Administrators**, as well as a public verification portal for employers and academic institutions.

Built in alignment with the official **UptoSkills Brand Identity** and the **UI/UX Pro Max** design system, the application emphasizes:
- **Zero raw emojis**: 100% accessible, scalable inline SVG icons (`Icons.jsx`).
- **Official Brand Palette**: UptoSkills Wordmark Teal (`#0D9488`), Vibrant Orange (`#F26A34`), and Graduation Cap Blue (`#2563EB`).
- **3-Tier Mobile-First Responsiveness**: Flawless experience across desktops, tablets (horizontal scrolling navigation), and mobile devices (bottom dock navigation & bottom-sheet modals).
- **Interactive Drag-and-Drop Editor**: GrapesJS visual certificate template customizer with live Handlebars placeholder insertion.
- **Embedded AI Guidance Chatbot**: Interactive support assistant with mobile bottom-sheet drawer.

---

## 2. Directory Structure

```
frontend/
├── public/                     # Static assets, favicon, _redirects for SPA routing
├── src/
│   ├── app/                    # App root, React Router routes, App.css design tokens
│   │   ├── App.jsx             # Main routing shell & Role guards
│   │   └── App.css             # Official theme CSS custom properties (:root)
│   ├── features/
│   │   ├── admin/              # Administrator Workspace
│   │   │   ├── analytics/      # Recharts KPI metrics & turnaround charts
│   │   │   ├── components/     # TemplatesSection, TeamLeadersSection, RetentionPolicyForm, AuditLogTable
│   │   │   └── pages/          # AdminDashboard.jsx & AdminDashboard.css
│   │   ├── auth/               # Authentication Views
│   │   │   ├── hooks/          # useAuth authentication context
│   │   │   └── pages/          # Login, ForgotPassword, ResetPassword
│   │   ├── intern/             # Intern Workspace
│   │   │   ├── components/     # ChatWidget, RequestCertificateModal, MyRequestsList
│   │   │   └── pages/          # InternDashboard.jsx, SettingsPage.jsx
│   │   ├── public/             # Public Credential Verification
│   │   │   └── pages/          # VerifyPage.jsx (QR Code Verification)
│   │   └── teamleader/         # Team Leader Workspace
│   │       ├── components/     # PendingReviewList, MyInternsList, Notifications
│   │       └── pages/          # TLDashboard.jsx & TLDashboard.css
│   ├── shared/                 # Shared Reusable Components
│   │   ├── components/         # BrandLogo, Icons.jsx (SVG library), NotificationBell, ErrorBoundary, Toast
│   │   └── hooks/              # useTheme, useNotifications
│   ├── index.css               # Global base resets and typography imports
│   └── main.jsx                # React DOM entry point
├── package.json
└── vite.config.js              # Bundler configuration with manual code-splitting chunks
```

---

## 3. Brand Design System & Color Tokens

Defined in `src/app/App.css` and `src/index.css`:

| Token | CSS Variable | Hex Value | Usage |
|---|---|---|---|
| **Primary Brand Teal** | `--brand-teal` / `--color-primary` | `#0D9488` | Main brand actions, active navigation, badges, highlights |
| **Teal Light / Highlight** | `--brand-teal-light` | `#14B29C` | Growth arrow, hover states, glow borders |
| **Teal Glow** | `--brand-teal-glow` | `rgba(13, 148, 136, 0.15)` | Active item backgrounds, pill chips |
| **Accent Orange** | `--brand-orange` / `--color-accent`| `#F26A34` | "UP" brand orange, primary action buttons, alerts |
| **Orange Hover** | `--brand-orange-hover` | `#EA580C` | Button hover and pressed feedback |
| **Graduation Cap Blue** | `--brand-blue` | `#2563EB` | Verification badges, institutional links |
| **Page Background** | `--page` | `#090E17` (Dark) / `#F8FAFC` (Light) | App background surface |
| **Card Surface** | `--card` | `#131F33` (Dark) / `#FFFFFF` (Light) | Elevated card panels |
| **Border Divider** | `--border` | `rgba(255, 255, 255, 0.08)` / `#E2E8F0` | Structural dividers |
| **Text Main** | `--text` | `#F8FAFC` (Dark) / `#0F172A` (Light) | WCAG AAA 7:1+ contrast |
| **Text Muted** | `--muted` | `#94A3B8` (Dark) / `#64748B` (Light) | Secondary captions & dates |

---

## 4. Responsive Breakpoints

The frontend uses a cohesive 3-tier responsive layout across all views:

- **Desktop (`> 1024px`)**:
  - Full 2-column sidebar grid (`260px 1fr`).
  - Auto-fitting quick action cards (`repeat(auto-fit, minmax(240px, 1fr))`).
  - Multi-column metric and form layouts.
- **Tablet & iPad (`<= 1024px`)**:
  - Full-width flexible shell with sticky, touch-scrollable horizontal navigation bar.
  - Quick action tiles automatically adapt to 2 balanced columns.
  - Form panels and profile details adapt to 2 columns.
- **Mobile Landscape & Small Tablet (`<= 768px`)**:
  - Compact topbar: user metadata text and logout labels collapse gracefully into icon-only controls.
  - Intern Dashboard activates a fixed bottom dock navigation (`.id-mobile-nav`) with brand Teal active indicators.
  - Chatbot widget elevates above the dock.
- **Mobile Portrait (`<= 480px` & `<= 380px`)**:
  - Profile headings scale down with responsive avatars and text wrapping.
  - Quick action cards and stat cards stack to 1 full-width column (`100%`).
  - Chatbot expands into a native-feeling bottom-sheet drawer (`height: 82vh`).
  - Action buttons and modal forms expand to full-width touch targets.

---

## 5. Development & Verification

### Prerequisites
- Node.js >= 20.0.0
- npm >= 9.0.0

### Install Dependencies
```bash
npm install
```

### Run Local Development Server
```bash
npm run dev
# Starts Vite HMR server on http://localhost:5173
```

### Production Build & Linting
```bash
npm run build
# Builds production bundle in dist/ with vendor code-splitting chunks
```
