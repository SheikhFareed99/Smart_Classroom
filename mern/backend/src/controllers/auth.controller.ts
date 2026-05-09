import { Request, Response, NextFunction } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../models/users.model";
import { findUserByEmail, createLocalUser } from "../services/user.service";
import { generateCsrfToken } from "../security/csrf";

// ── Stateless OAuth token (JWT-signed) ───────────────────────────────────────
// Replaces the in-memory Map which was wiped on every Render restart (SIGTERM).
// JWT tokens are self-contained and survive restarts — signed with SESSION_SECRET.
function generateOAuthToken(userId: string): string {
  const secret = process.env.SESSION_SECRET!;
  return jwt.sign({ userId }, secret, { expiresIn: "60s" });
}

function verifyOAuthToken(token: string): string {
  const secret = process.env.SESSION_SECRET!;
  const payload = jwt.verify(token, secret) as { userId: string };
  return payload.userId;
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

// POST /api/auth/signup
export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const newUser = await createLocalUser(name, email, password);
    await regenerateSession(req);
    await loginUser(req, newUser);
    console.log("User created and logged in: ", newUser.email);
    return res.status(201).json({
      message: "User created and logged in successfully",
      user: sanitizeUser(newUser),
    });
  } catch (err) {
    console.log("Error creating user: ", err);
    res.status(500).json({ message: "Error creating user", error: err });
  }
};

// POST /api/auth/login
export const login = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) {
      console.log("Error during local authentication: ", err);
      return next(err);
    }

    if (!user) {
      console.log("Authentication failed: ", info.message);
      return res.status(401).json({ message: info.message });
    }

    regenerateSession(req)
      .then(() => loginUser(req, user))
      .then(() => res.json({ message: "Logged in", user: sanitizeUser(user) }))
      .catch((sessionErr) => next(sessionErr));
  })(req, res, next);
};

// GET /auth/google/callback
// Instead of redirecting straight to /dashboard (which sets a cross-site session
// cookie that mobile browsers block), we issue a short-lived one-time token and
// redirect to /auth/callback?token=xxx. The frontend then POSTs the token back
// to exchange it for a session — the session cookie is set in a direct fetch,
// which browsers allow even under strict ITP / 3rd-party cookie blocking.
export const googleCallback = (req: Request, res: Response) => {
  const user = req.user as any;
  if (!user?._id) {
    return res.redirect(`${process.env.APP_BASE_URL || "http://localhost:5173"}/login?error=oauth_failed`);
  }
  const token = generateOAuthToken(String(user._id));
  return res.redirect(`${process.env.APP_BASE_URL || "http://localhost:5173"}/auth/callback?token=${token}`);
};

// POST /auth/exchange-oauth-token
// POST /auth/exchange-oauth-token
// Frontend POSTs the JWT token received in the redirect URL.
// We verify the JWT (signed with SESSION_SECRET, 60s expiry),
// look up the user, log them in, and return user data as JSON.
export const exchangeOAuthToken = async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string };
  if (!token) return res.status(400).json({ message: "Token required" });

  let userId: string;
  try {
    userId = verifyOAuthToken(token);
  } catch (err: any) {
    const msg = err?.name === "TokenExpiredError" ? "Token expired — please sign in again" : "Invalid token";
    return res.status(401).json({ message: msg });
  }

  try {
    const user = await User.findById(userId).select("_id name email createdAt updatedAt");
    if (!user) return res.status(404).json({ message: "User not found" });

    await new Promise<void>((resolve, reject) => {
      req.login(user, (err) => (err ? reject(err) : resolve()));
    });

    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("exchangeOAuthToken error:", err);
    return res.status(500).json({ message: "Session error" });
  }
};


// GET /api/auth/user
export const getCurrentUser = (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    res.json(sanitizeUser(req.user));
  } else {
    console.log("User not authenticated");
    res.status(401).json({ message: "Not authenticated" });
  }
};

// GET /api/auth/csrf-token
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

// POST /api/auth/logout
export const logout = (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to logout" });
    }

    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        return res.status(500).json({ message: "Failed to destroy session" });
      }
      res.clearCookie(process.env.SESSION_COOKIE_NAME || "aico.sid");
      return res.status(200).json({ message: "Logged out" });
    });
  });
};
