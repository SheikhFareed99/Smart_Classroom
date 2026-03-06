import { Router,Request,Response } from "express";
import passport from "passport";

// router for authentication routes, currently only google oauth

const router = Router();

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
    res.status(401).json({ message: "Not authenticated" });
  }
});

router.get("/logout", (req: Request, res: Response) => {
  req.logout(() => {
    res.redirect("http://localhost:5173/");
  });
});

export default router;