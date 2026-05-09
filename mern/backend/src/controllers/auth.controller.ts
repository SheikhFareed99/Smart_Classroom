import { Request, Response, NextFunction } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../models/users.model";
import { findUserByEmail, createLocalUser } from "../services/user.service";
import { generateCsrfToken } from "../security/csrf";

// ── JWT helper ────────────────────────────────────────────────────────────────
function generateJWT(user: any): string {
  return jwt.sign(
    { userId: String(user._id), name: user.name, email: user.email },
    process.env.SESSION_SECRET!,
    { expiresIn: "7d" }
  );
}

const sanitizeUser = (user: any) => {
  if (!user) return null;
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const regenerateSession = (req: Request): Promise<void> =>
  new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      return resolve();
    });
  });

const loginUser = (req: Request, user: any): Promise<void> =>
  new Promise((resolve, reject) => {
    req.login(user, (err) => {
      if (err) return reject(err);
      return resolve();
    });
  });

// POST /auth/signup
export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const newUser = await createLocalUser(name, email, password);
    console.log("User created:", newUser.email);

    const token = generateJWT(newUser);
    return res.status(201).json({
      message: "User created and logged in successfully",
      user: sanitizeUser(newUser),
      token,
    });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ message: "Error creating user", error: err });
  }
};

// POST /auth/login
export const login = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });

    const token = generateJWT(user);
    console.log("User logged in:", user.email);
    return res.json({ message: "Logged in", user: sanitizeUser(user), token });
  })(req, res, next);
};

// GET /auth/google/callback
// After Google verifies the user, generate a JWT and redirect to the frontend.
// The frontend reads the JWT from the URL and stores it in localStorage.
// This approach works on ALL browsers — no cross-site cookies needed.
export const googleCallback = (req: Request, res: Response) => {
  const user = req.user as any;
  if (!user?._id) {
    return res.redirect(`${process.env.APP_BASE_URL || "http://localhost:5173"}/login?error=oauth_failed`);
  }
  const token = generateJWT(user);
  return res.redirect(`${process.env.APP_BASE_URL || "http://localhost:5173"}/auth/callback?jwt=${token}`);
};

// GET /auth/user
export const getCurrentUser = (req: Request, res: Response) => {
  // Works with both JWT (set by requireAuth middleware) and session
  if (req.user) {
    res.json(sanitizeUser(req.user));
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
};

// GET /auth/csrf-token
export const getCsrfToken = (req: Request, res: Response) => {
  (req.session as any).csrfInitialized = true;
  req.session.save((err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to initialize CSRF session" });
    }
    const token = generateCsrfToken(req, res);
    return res.json({ csrfToken: token });
  });
};

// POST /auth/logout
export const logout = (req: Request, res: Response) => {
  // JWT logout is client-side (delete from localStorage).
  // Also destroy session for backward compat.
  req.logout((err) => {
    if (err) console.warn("logout error:", err);
    req.session.destroy(() => {
      res.clearCookie(process.env.SESSION_COOKIE_NAME || "aico.sid");
      return res.status(200).json({ message: "Logged out" });
    });
  });
};
