import express from 'express';
import verifyAuth from '../middlewares/verifyAuth.js';
import { passwordLimiter } from '../middlewares/rateLimiter.js';
import { submitRequestValidator } from '../validators/portal.validator.js';
import {
  getMyRequests,
  getProfile,
  submitCertificateRequest,
  getCertificateForRequest,
  downloadCertificateForRequest,
  setPassword,
  updateProfile,
  chatWithAssistant,
} from '../controllers/intern.controller.js';

const internRouter = express.Router();

internRouter.use(verifyAuth, (req, res, next) => {
	if (req.user.role !== 'intern') {
		return res.status(403).json({ message: 'Forbidden' });
	}

	next();
});

internRouter.get('/profile', getProfile);
internRouter.patch('/profile', updateProfile);
internRouter.patch('/set-password', passwordLimiter, setPassword);

internRouter.post('/request-certificate', submitRequestValidator, submitCertificateRequest);

internRouter.get('/requests', getMyRequests);

// Day 5 Intern Certificate Fetch and Secure Download routes
internRouter.get('/requests/:id/certificate', getCertificateForRequest);
internRouter.get('/requests/:id/certificate/download', downloadCertificateForRequest);

// Task M: Chatbot guidance endpoint
internRouter.post('/chat', chatWithAssistant);

export default internRouter;