# UPTOSKILL Intern Portal — Known Limitations & Future Work

**Last Updated:** November 19, 2026  
**Document Version:** 4.1.0  

---

## 1. Resolved in Version 4.1.0

1. **Puppeteer Browser Discovery & Installation (Resolved)**:
   - *Previous Issue:* Puppeteer expected specific cached Chrome builds, triggering missing browser crashes if `~/.cache/puppeteer` was unpopulated.
   - *Resolution:* Configured automatic multi-path system Chrome/Edge discovery fallback (`findSystemChrome()`), supporting system Google Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe` on Windows, Edge, Linux, and macOS paths), plus automated package installation.
2. **Mobile-First Responsiveness (Resolved)**:
   - *Previous Issue:* Desktop-centric multi-column tables and quick action cards caused horizontal clipping on mobile and tablet screens.
   - *Resolution:* Implemented a 3-tier responsive architecture (tablet sticky horizontal scrolling navigation, mobile bottom dock navigation, full-width touch cards, and responsive modal bottom-sheets).
3. **Official Brand System & Icon Accessibility (Resolved)**:
   - *Previous Issue:* Inconsistent colors and raw emojis as status indicators.
   - *Resolution:* Unified under official UptoSkills brand tokens (Teal `#0D9488`, Vibrant Orange `#F26A34`, Cap Blue `#2563EB`) and 100% accessible inline SVGs (`Icons.jsx`).
4. **Standalone RAG AI Chatbot (Implemented)**:
   - *Resolution:* Created `Web_Support_Chatbot/` featuring a Python FastAPI backend, FAISS vector search, and official knowledge base documentation (`document.txt`).

---

## 2. Known Current Limitations

1. **Single Active Internship Per Student**:
   - The current data schema models `domain`, `startDate`, `endDate`, and `internshipDetails` directly on the `User` document.
   - *Impact:* A student undergoing multiple consecutive or concurrent internships at UPTOSKILL must update their profile details rather than holding distinct internship records.
2. **Synchronous PDF Finalization**:
   - Certificate PDFs are rendered on-demand during Admin finalization using a headless Puppeteer browser instance.
   - *Impact:* Takes approximately 1.5–3 seconds per certificate. For batch finalization of 500+ certificates simultaneously, an asynchronous job queue (e.g. BullMQ / Redis worker) would be preferred over synchronous HTTP requests.
3. **Local Disk Storage for Uploads**:
   - Rendered PDFs and uploaded template assets currently reside in the server's local `uploads/` directory with an authenticated download proxy.
   - *Impact:* On ephemeral serverless hosts (e.g. Render free tier without persistent disks), redeployments wipe local storage unless S3/Cloudinary object storage is plugged in.
4. **Rate Limit Memory Store in Single-Instance Mode**:
   - Express rate limiters use in-memory state tracking per container IP.
   - *Impact:* If scaled horizontally across multiple load-balanced containers without sticky sessions, rate limits will be tracked per replica rather than centrally via Redis.

---

## 3. Recommended Future Work

### 3.1 Multi-Internship Relational Model
- Migrate `internshipDetails` out of the `User` collection into a dedicated `Internship` collection with a 1-to-many relationship:
  ```
  User (1) ──< Internships (Many) ──< CertificateRequests (Many)
  ```
- Allows alumni to maintain complete historical transcripts of multiple domain milestones.

### 3.2 Bulk Intern Import & Batch Onboarding
- Provide an Admin drag-and-drop Excel/CSV spreadsheet importer with preview, column mapping, schema validation, and automatic batch generation of intern accounts and invitation emails.

### 3.3 Distributed PDF Generation Queue
- Move Puppeteer execution out of the main web process into isolated background worker nodes orchestrated via Redis / BullMQ.
- Finalized PDFs immediately stream to AWS S3 or Cloudflare R2 bucket storage with signed pre-authenticated download URLs.

### 3.4 Blockchain / Decentralized Credential Anchor
- Anchor finalized certificate hashes to a public verifiable ledger (e.g. Polygon / Ethereum) for cryptographic proof of issuance that remains independent of server uptime.
