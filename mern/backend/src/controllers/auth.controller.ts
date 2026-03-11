import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { findUserByEmail, createLocalUser } from "../services/user.service";

// POST /api/auth/signup
export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const newUser = await createLocalUser(name, email, password);

    req.login(newUser, (err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging in after signup" });
      }
      console.log("User created and logged in: ", newUser.email);
      return res.status(201).json({ message: "User created and logged in successfully", user: newUser });
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

    req.login(user, (err) => {
      if (err) return next(err);
      return res.json({ message: "Logged in", user });
    });
  })(req, res, next);
};

// GET /api/auth/google/callback
export const googleCallback = (req: Request, res: Response) => {
  res.redirect("http://localhost:5173/dashboard");
};

// GET /api/auth/user
export const getCurrentUser = (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    console.log("User not authenticated");
    res.status(401).json({ message: "Not authenticated" });
  }
};

// GET /api/auth/logout
export const logout = (req: Request, res: Response) => {
  req.logout(() => {
    res.redirect("http://localhost:5173/");
  });
};
