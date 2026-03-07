import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import User from "../models/users";
import bcrypt from "bcrypt";

// router for authentication routes, currently only google oauth

const router = Router();

// manual sign up route since passport doesnt handle registration for local strategy
router.post("/signup", async (req: Request, res: Response) => {
  try{
    const { name, email, password } = req.body;

    const existing_user = await User.findOne({ email });
    if (existing_user){
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const hashed_password = await bcrypt.hash(password, 10);
    const new_user = await User.create({
      name, 
      email, 
      password: hashed_password,
      enrolledCourses: [],
      teachingCourses: []

    });

    req.login(new_user, (err) => {
      if (err){
        return res.status(500).json({ message: "Error logging in after signup" });
      }
      console.log("User created and logged in: ", new_user.email);
      return res.status(201).json({ message: "User created and logged in successfully", new_user });
    });
  } catch (err){
    console.log("Error creating user: ", err);
    res.status(500).json({ message: "Error creating user", error: err });
  }
  
});


// manual sign in route
router.post("/login", (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err){
      console.log("Error during local authentication: ", err);
      return next(err);
    }

    if (!user){
      console.log("Authentication failed: ", info.message);
      return res.status(401).json({ message: info.message });
    }

    req.login(user, (err) => {
      if (err) return next(err);
      return res.json({ message: "Logged in", user });
    });
  })(req, res, next);
});

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
  
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "http://localhost:5173/" }),
  (req: Request, res: Response) => {
    res.redirect("http://localhost:5173/dashboard");
  }
);

router.get("/user", (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    console.log("User not authenticated");
    res.status(401).json({ message: "Not authenticated" });
  }
});

router.get("/logout", (req: Request, res: Response) => {
  req.logout(() => {
    res.redirect("http://localhost:5173/");
  });
});

export default router;