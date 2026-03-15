import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { findUserByEmail, createLocalUser } from "../services/user.service";
import { generateCsrfToken } from "../security/csrf";

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

// GET /api/auth/google/callback
export const googleCallback = (req: Request, res: Response) => {
  res.redirect("http://localhost:5173/dashboard");
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
