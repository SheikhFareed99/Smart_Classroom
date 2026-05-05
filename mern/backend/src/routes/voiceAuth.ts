import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";

const router = Router();

router.get("/voice-token", (req: Request, res: Response) => {
  // req.isAuthenticated() is provided by Passport — works for both
  // local and Google OAuth login, no changes to passport.ts needed
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = req.user as any;

  const token = jwt.sign(
    {
      userId: String(user._id),
      email:  user.email,
      name:   user.name,
    },
    process.env.VOICE_SERVICE_SECRET as string,
    { expiresIn: "15m" }   // short-lived — frontend refreshes before joining
  );

  res.json({ token });
});

export default router;