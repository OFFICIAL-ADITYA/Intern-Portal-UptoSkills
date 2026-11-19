# UPTOSKILL — Internship & Certificate Management Portal

**Version:** 4.1.0 (Production Release)  
**Last Updated:** November 19, 2026  

[![Tests](https://img.shields.io/badge/tests-70%20passed-success)](https://github.com/uptoskill/intern-portal)
[![Node.js](https://img.shields.io/badge/node->=20.0.0-blue)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-green)](LICENSE)

---

## 1. Project Overview

The **UPTOSKILL Intern Portal** is a full-stack, enterprise-grade platform built to automate the entire internship journey:
- **Official Brand Theme & Modern UI/UX**: Rebuilt with the official UptoSkills brand palette (Wordmark Teal `#0D9488`, Vibrant Orange `#F26A34`, Cap Blue `#2563EB`) and scalable SVG icons across all dashboards.
- **3-Tier Mobile-First Responsiveness**: Seamless experience on desktop (`> 1024px`), tablet horizontal tab bars (`<= 1024px`), mobile landscape (`<= 768px`), and mobile bottom navigation dock / bottom-sheet drawer (`<= 480px`).
- **Intern Self-Service**: Credential initialization, whitelisted profile management, multi-type certificate requests, real-time status tracking, timeline progress bar, authenticated PDF downloads, and interactive AI guidance.
- **Team Leader Workspace**: Multi-tenant scoped review queues, quick action cards, forwarding with milestone checks, rejection with feedback, and mentor notifications.
- **Admin Control Center**: Visual Drag-and-Drop Certificate Template Editor (GrapesJS), resilient high-resolution PDF rendering (Puppeteer with automatic system Chrome discovery), administrative revocation, compliance audit logging, automated retention & archival policies, and executive analytics (Recharts).
- **Public Verification**: Fast, mobile-responsive certificate verification via unguessable QR codes (`/verify/:verifyId`) with strict privacy protection (no student emails, passwords, or personal phone numbers exposed).
- **Support Chatbot Service**: Dual-layer AI guidance via integrated `/api/intern/chat` and standalone Retrieval-Augmented Generation (RAG) assistant (`Web_Support_Chatbot/`).

---

## 2. Tech Stack

- **Frontend**: React 19, Vite 8, React Router v7, Recharts, GrapesJS, Vanilla CSS (with CSS variables, official brand tokens, zero raw emojis, and 3-tier mobile-first responsiveness).
- **Backend**: Node.js 22, Express 5, Mongoose 9, Puppeteer 25 (headless Chromium with automatic system Chrome auto-detection fallback), Handlebars, Nodemailer, Brevo SMTP.
- **Support Chatbot (RAG)**: Python 3, FastAPI, FAISS vector index, LangChain / Embeddings.
- **Security & Quality**: Helmet HTTP hardening, CORS with credentials whitelist, express-rate-limit, in-place NoSQL injection sanitizer, express-validator, Node.js native test runner (`node:test`).
- **Database**: MongoDB (unified user model, compound indexes, immutable audit logging).

---

## 3. Repository Structure

```
Intern_Portal/
├── backend/
│   ├── data/                 # Sample seed datasets
│   ├── scripts/              # Migration, admin creation & test utilities
│   │   ├── createAdmin.js              # Create initial admin from env vars
│   │   └── backfillTeamLeaderId.js     # Data migration for TL IDs
│   ├── seeds/                # Seed certificate templates
│   ├── src/
│   │   ├── config/           # Database & server configurations
│   │   ├── controllers/      # Route controllers (Auth, Intern, TL, Admin, Analytics)
│   │   ├── jobs/             # Scheduled background cron jobs (Status & Retention)
│   │   ├── middlewares/      # Security, rate limiters, sanitizers & error handler
│   │   ├── models/           # Mongoose schemas (User, Request, Certificate, AuditLog)
│   │   ├── routes/           # REST endpoints
│   │   ├── services/         # PDF generation (system Chrome auto-fallback), notifications
│   │   ├── utils/            # Code generators & audit helpers
│   │   ├── validators/       # express-validator schemas
│   │   └── app.js            # Express application setup
│   ├── tests/                # Automated test suites (70 test cases)
│   ├── .env.example          # Environment variables template
│   ├── package.json          # Backend dependencies & npm scripts
│   └── server.js             # Server entry point & process crash guards
├── frontend/
│   ├── public/               # Static assets, favicon, _redirects
│   ├── src/
│   │   ├── app/              # App root component, global routes & theme tokens
│   │   ├── features/
│   │   │   ├── admin/        # Categorized admin dashboard, editor, audit logs & analytics
│   │   │   ├── auth/         # Login, forgot password, reset password
│   │   │   ├── intern/       # Intern dashboard (journey progress, stats, bottom dock, chat)
│   │   │   ├── public/       # Public verification page
│   │   │   └── teamleader/   # Team leader dashboard & review queues
│   │   ├── shared/           # BrandLogo, Icons (SVG library), NotificationBell, Toast
│   │   ├── index.css         # Global design system & theme variables
│   │   └── main.jsx          # React DOM root
│   ├── .env.example          # Frontend environment variables template
│   ├── package.json          # Frontend dependencies & npm scripts
│   ├── vercel.json           # Vercel SPA routing rewrites
│   └── vite.config.js        # Vite bundler configuration & code splitting
├── Web_Support_Chatbot/      # Standalone RAG AI Support Chatbot
│   ├── backend/              # FastAPI application, FAISS index & ingest script
│   └── frontend/             # Standalone chatbot UI widget
├── docs/                     # Comprehensive architectural & operational manuals
│   ├── architecture.md       # Architecture, component flow & Mermaid diagrams
│   ├── api.md                # Comprehensive REST API reference
│   ├── data-model.md         # Database entities, indexes & schema relations
│   ├── deployment.md         # Hosting setup, Docker, env vars & rollback
│   ├── user-guide-intern.md  # Intern walkthrough & FAQs
│   ├── user-guide-teamleader.md # Team leader review manual
│   ├── user-guide-admin.md   # Admin visual editor & management guide
│   ├── operations.md         # Daily cron jobs, recovery & runbook
│   ├── known-issues-and-future-work.md # System limitations & roadmap
│   └── demo-script.md        # 10-15 minute presentation demo script
└── README.md                 # Project documentation root
```

---

## 4. Quick Start Guide

### Prerequisites
- Node.js 20 or newer
- MongoDB instance (local or MongoDB Atlas connection string)
- Brevo SMTP credentials (for transactional email notifications)

### Step 1: Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Configure Environment
Copy `.env.example` in both backend and frontend:
```bash
# In backend/
cp .env.example .env

# In frontend/
cp .env.example .env
```
Update `backend/.env` with your `MONGO_URI`, `JWT_SECRET`, `BREVO_SMTP_USER`, and `BREVO_SMTP_KEY`.

### Step 3: Run Database Seeds & Initial Admin
```bash
cd backend
# Seed certificate templates
npm run seed:templates

# Create your first Admin account
ADMIN_NAME="Portal Admin" ADMIN_EMAIL="admin@uptoskills.com" ADMIN_PASSWORD="SecurePassword123!" node scripts/createAdmin.js
```

### Step 4: Start the Applications
Open two terminal windows:

**Terminal 1 (Backend API):**
```bash
cd backend
npm run dev
# Starts API on http://localhost:3000 (Health check: http://localhost:3000/api/health)
```

**Terminal 2 (Frontend Client):**
```bash
cd frontend
npm run dev
# Starts client on http://localhost:5173
```

---

## 5. Running Tests & Quality Checks

The repository includes a comprehensive automated test suite spanning unit, integration, security, and regression tests.

```bash
# Run all backend test suites (70 tests)
cd backend
npm test

# Build frontend for production & verify code-splitting
cd ../frontend
npm run build
```

---

## 6. Documentation Index

Detailed engineering documentation is located in the `docs/` folder:

1. [System Architecture & Flow Diagrams](docs/architecture.md)
2. [REST API Reference](docs/api.md)
3. [Data Model & Database Schema](docs/data-model.md)
4. [Deployment, Docker & Environment Guide](docs/deployment.md)
5. [Intern User Guide](docs/user-guide-intern.md)
6. [Team Leader User Guide](docs/user-guide-teamleader.md)
7. [Administrator User Guide](docs/user-guide-admin.md)
8. [Operations, Cron Jobs & Runbook](docs/operations.md)
9. [Known Limitations & Future Work](docs/known-issues-and-future-work.md)
10. [Final Presentation Demo Script](docs/demo-script.md)
