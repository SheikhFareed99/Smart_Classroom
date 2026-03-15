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

// router for authentication routes

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
  passport.authenticate("google", { failureRedirect: "http://localhost:5173/" }),
  googleCallback
);

// session routes
router.get("/user", requireAuth, getCurrentUser);
router.post("/logout", requireAuth, logout);

export default router;