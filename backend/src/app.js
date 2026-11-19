import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dns from 'dns';
import helmet from 'helmet';
import mongoose from 'mongoose';

import authRouter from './routes/auth.routes.js';
import internRouter from './routes/intern.routes.js';
import adminRouter from './routes/admin.routes.js';
import teamleaderRouter from './routes/teamleader.routes.js';
import notificationRouter from './routes/notification.routes.js';
import verifyRouter from './routes/verify.routes.js';
import certificateRouter from './routes/certificate.routes.js';

import mongoSanitizer from './middlewares/mongoSanitize.js';
import errorHandler from './middlewares/errorHandler.js';

// Use public DNS providers (Cloudflare and Google) to avoid local DNS issues.
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();

// Trust proxy for IP forwarding / rate-limiting behind reverse proxy
app.set('trust proxy', 1);

// Polyfill header & connection helpers if missing (e.g. in unit test mock objects)
app.use((req, res, next) => {
  if (!req.socket) req.socket = { remoteAddress: '127.0.0.1' };
  if (!req.connection) req.connection = req.socket;

  const originalRemoveHeader = typeof res.removeHeader === 'function' ? res.removeHeader.bind(res) : null;
  res.removeHeader = function(name) {
    try {
      if (originalRemoveHeader) originalRemoveHeader(name);
    } catch {
      // Ignore uninitialized internal outHeaders in mock environments
    }
    if (this.headers && name) delete this.headers[name.toLowerCase()];
  };

  if (typeof res.getHeader !== 'function') {
    res.getHeader = function(name) {
      return this.headers ? this.headers[name?.toLowerCase()] : undefined;
    };
  }
  if (typeof res.setHeader !== 'function') {
    res.setHeader = function(name, val) {
      if (!this.headers) this.headers = {};
      this.headers[name?.toLowerCase()] = val;
      return this;
    };
  }
  next();
});

// Task I Security: HTTP headers hardening with Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Task I Security: CORS whitelist with credentials
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: frontendUrl,
  credentials: true
}));

// Task I Security: 1MB JSON request body limit
app.use(express.json({ limit: '1mb' }));

// Parse cookies and populate `req.cookies`
app.use(cookieParser());

// Task I Security: NoSQL injection sanitizer
app.use(mongoSanitizer);

// Task J Monitoring: Health check endpoint
app.get('/api/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  const status = isConnected ? 200 : 503;
  return res.status(status).json({
    status: isConnected ? 'healthy' : 'unhealthy',
    database: isConnected ? 'connected' : 'disconnected',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/intern', internRouter);
app.use('/api/admin', adminRouter);
app.use('/api/teamleader', teamleaderRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/verify', verifyRouter);
app.use('/api/certificates', certificateRouter);

// Central error handler
app.use(errorHandler);

export default app;
