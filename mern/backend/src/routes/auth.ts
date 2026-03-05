import { Router } from "express";
import passport from "passport";

// router for authentication routes, currently only google oauth

const router = Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {

    // res.redirect("http://localhost:5173/dashboard");

    // for production, use actual frontend, 
    
    // FOR DEBUGGING PURPOSES ONLY
    res.redirect("/dashboard.html")
  }
);

router.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

export default router;