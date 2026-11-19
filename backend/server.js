import app from "./src/app.js";
import connectToDB from "./src/config/database.js";
import { startInternshipCompletionAlertScheduler } from "./src/services/internshipCompletionAlert.service.js";
import { initCronJobs } from "./src/jobs/index.js";

const REQUIRED_ENV_VARS = [
  'MONGO_URI',
  'JWT_SECRET',
  'FRONTEND_URL',
  'BREVO_SMTP_USER',
  'BREVO_SMTP_KEY'
];

// Verify all required configuration variables are present
for (const envVar of REQUIRED_ENV_VARS) {
  if (!process.env[envVar]) {
    console.error(`[Fatal Startup Error] Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 3000;

// Task J Monitoring: Log and exit on unhandled rejections and uncaught exceptions so host can restart
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Fatal Error] Unhandled Promise Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('[Fatal Error] Uncaught Exception:', err);
  process.exit(1);
});

const startServer = async () => {
    try {
        await connectToDB();
        startInternshipCompletionAlertScheduler();
        initCronJobs();

        app.listen(PORT, () => {
            console.log(`server is listening on port ${PORT}`);
        });
    } catch (error) {
        console.error("Unable to start server", error);
        process.exit(1);
    }
};

startServer();
