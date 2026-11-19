import { Router } from "express";
import { loginValidator} from "../validators/auth.validator.js";
import { login, getMe, forgotPassword, resetPassword, logout } from "../controllers/auth.controller.js";
import verifyAuth from "../middlewares/verifyAuth.js";
import { loginLimiter, forgotPasswordLimiter, passwordLimiter } from "../middlewares/rateLimiter.js";


const authRouter = Router();



// POST api/auth/login
authRouter.post("/login", loginLimiter, loginValidator, login);

authRouter.post("/logout", (req, res, next) => {
  // Try to authenticate if cookie/token present, but still allow logout even if not authenticated
  verifyAuth(req, res, (err) => {
    next();
  });
}, logout);

authRouter.post("/forgot-password", forgotPasswordLimiter, forgotPassword);

authRouter.post("/reset-password/:token", passwordLimiter, resetPassword);

authRouter.get("/get-me", verifyAuth, getMe);

export default authRouter;