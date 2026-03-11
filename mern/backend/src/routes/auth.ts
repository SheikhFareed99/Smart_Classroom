import { Router } from "express";
import passport from "passport";
import {
  signup,
  login,
  googleCallback,
  getCurrentUser,
  logout,
} from "../controllers/auth.controller";

// router for authentication routes

const router = Router();

// local authentication routes
router.post("/signup", signup);
router.post("/login", login);

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
router.get("/user", getCurrentUser);
router.get("/logout", logout);

export default router;