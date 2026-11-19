# UPTOSKILL Intern Portal — Deployment & Operations Guide

**Last Updated:** November 19, 2026  
**Document Version:** 4.1.0  

---

## 1. Hosting Architecture Overview

The portal supports flexible modern deployment models:
- **Backend**: Render, Railway, AWS ECS/EC2, or Docker on Linux VPS.
- **Frontend**: Vercel, Netlify, Cloudflare Pages, or static file hosting.
- **Database**: MongoDB Atlas (M10+ recommended for production with automated point-in-time backups).
- **Email Service**: Brevo (formerly Sendinblue) SMTP or transactional API.

---

## 2. Environment Variables Specification

Every environment variable must be configured on the host before application startup. The startup validation guard will prevent startup if required variables are absent.

| Variable | Required? | Example Value | Description |
|---|---|---|---|
| `NODE_ENV` | **Yes** | `production` | Enables production security flags, suppresses internal error leaks, and enforces secure cookies. |
| `PORT` | No | `3000` | Port for Express HTTP listener (defaults to 3000). |
| `MONGO_URI` | **Yes** | `mongodb+srv://usr:pwd@cluster.mongodb.net/uptoskill_prod` | Production MongoDB connection string. Never reuse test databases. |
| `JWT_SECRET` | **Yes** | `64_char_random_hex_string_here` | Cryptographic secret for signing session tokens. Use a high-entropy string. |
| `FRONTEND_URL` | **Yes** | `https://portal.uptoskills.com` | Exact production frontend origin for CORS whitelist and cookie domain matching. |
| `BREVO_SMTP_USER` | **Yes** | `7a8b9c@smtp-brevo.com` | Brevo SMTP account username for transactional delivery. |
| `BREVO_SMTP_KEY` | **Yes** | `xsmtpsib-your-secret-api-key` | Brevo SMTP authentication key. |
| `BREVO_SENDER_EMAIL`| No | `noreply@uptoskills.com` | Verified domain sender address in Brevo. |
| `ADMIN_NAME` | No | `System Administrator` | Used by `scripts/createAdmin.js` when seeding initial admin. |
| `ADMIN_EMAIL` | No | `admin@uptoskills.com` | Admin email for initial admin account. |
| `ADMIN_PASSWORD` | No | `InitialSuperSecurePassword2026!` | Admin password for initial admin creation. |
| `PUPPETEER_EXECUTABLE_PATH` | No | `/usr/bin/chromium-browser` | Custom Chromium binary path. If not set, Puppeteer automatically searches ~/.cache/puppeteer and installed system Chrome/Edge paths. |
| `CHROME_PATH` | No | `C:\Program Files\Google\Chrome\Application\chrome.exe` | Optional override for system Google Chrome binary. |
| `CHATBOT_SERVICE_URL` | No | `https://chatbot-internal.uptoskills.com/api/chat` | External AI service endpoint (if separate chatbot team is enabled). |
| `CHATBOT_API_KEY` | No | `token_abc123` | Bearer token for authenticating to external chatbot service. |

---

## 3. Pre-Deployment Database Setup

### Step 1: Initialize Database & Run Migrations
Run the initial template seeds and Team Leader ID backfill:
```bash
cd backend
npm install --omit=dev

# Seed official certificate templates into database
npm run seed:templates

# Backfill legacy interns to link teamLeaderId
node scripts/backfillTeamLeaderId.js
```

### Step 2: Provision First Admin Account
Execute the secure admin initialization script:
```bash
ADMIN_NAME="Portal Administrator" \
ADMIN_EMAIL="admin@uptoskills.com" \
ADMIN_PASSWORD="SecureProductionPassword2026!" \
node scripts/createAdmin.js
```

---

## 4. Docker Deployment Guide

The repository includes standard production-ready containerization settings.

```dockerfile
# Dockerfile (Backend)
FROM node:22-bullseye-slim

# Install Chromium and required fonts for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libgbm1 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 5. Frontend Deployment (Vercel & Netlify)

1. **Build Environment Variable**:
   Set `VITE_API_URL` to your production backend URL (e.g. `https://api.portal.uptoskills.com`).
2. **Build Command**:
   `npm run build`
3. **Publish Directory**:
   `dist`
4. **SPA Rewrites**:
   The repository includes `public/_redirects` (Netlify) and `vercel.json` (Vercel) to ensure page refreshes on `/admin/dashboard` or `/verify/:verifyId` seamlessly route to `index.html`.

---

## 6. Database Backups & Restore Procedures

### Automated Daily Backups
In MongoDB Atlas:
1. Navigate to **Cluster** → **Backup**.
2. Confirm Cloud Backups are enabled with 7-day retention and continuous point-in-time recovery.

### Manual Backup (CLI)
```bash
mongodump --uri="$MONGO_URI" --gzip --archive=uptoskill_backup_$(date +%Y%m%d).gz
```

### Restore Procedure
```bash
mongorestore --uri="$MONGO_URI" --gzip --archive=uptoskill_backup_20261117.gz --drop
```

---

## 7. Rollback Strategy

1. **Backend Rollback**:
   In Render / Railway / ECS, select the previous successful deployment release and click **Redeploy**.
2. **Database Rollback**:
   If a schema or data corruption occurred, restore the point-in-time snapshot from MongoDB Atlas.
3. **Frontend Rollback**:
   In Vercel / Netlify dashboard, promote the previous instant deployment hash to production with zero downtime.
