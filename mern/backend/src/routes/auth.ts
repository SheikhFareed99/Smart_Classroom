import { Router } from "express";
import passport from "passport";
import {
  signup,
  login,
  googleCallback,
  exchangeOAuthToken,
  getCurrentUser,
  getCsrfToken,
  logout,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// local authentication routes
router.post("/signup", signup);
router.post("/login", login);
router.get("/csrf-token", getCsrfToken);

// google oauth routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.APP_BASE_URL || "http://localhost:5173"}/login?error=oauth_failed`,
  }),
  googleCallback
);

// One-time token exchange — bypasses Safari ITP / Edge cross-site cookie blocking
router.post("/exchange-oauth-token", exchangeOAuthToken);

// session routes
router.get("/user", requireAuth, getCurrentUser);
router.post("/logout", requireAuth, logout);

export default router;