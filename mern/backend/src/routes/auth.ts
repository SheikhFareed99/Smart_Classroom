import { Router } from "express";
import passport from "passport";
import {
  signup,
  login,
  googleCallback,
  getCurrentUser,
  getCsrfToken,
  logout,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// Local auth
router.post("/signup", signup);
router.post("/login", login);
router.get("/csrf-token", getCsrfToken);

// Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.APP_BASE_URL || "http://localhost:5173"}/login?error=oauth_failed`,
    session: true, // needed for OAuth state verification
  }),
  googleCallback
);

// Session/user routes
router.get("/user", requireAuth, getCurrentUser);
router.post("/logout", logout);

export default router;