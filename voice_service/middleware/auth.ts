import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { Socket } from "socket.io";

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const secret = process.env.VOICE_SERVICE_SECRET;
  if (!secret) {
    console.error("[auth] VOICE_SERVICE_SECRET is not configured");
    return res.status(503).json({ message: "Voice service auth is not configured" });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ message: "Authorization required" });
  }

  try {
    const payload = jwt.verify(token, secret) as jwt.JwtPayload & {
      userId?: string;
      email?: string;
      name?: string;
    };
    const rawId = payload.userId;
    const userId =
      typeof rawId === "string" ? rawId : rawId != null ? String(rawId) : "";
    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    req.voiceUser = {
      userId,
      email: typeof payload.email === "string" ? payload.email : undefined,
      name:  typeof payload.name === "string" ? payload.name : undefined,
    };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const requireAuthSocket = (socket: Socket, next: (err?: Error) => void) => {
  (socket as any).user = { userId: "dev", email: "dev@temp.com", name: "Dev User" };
  next();
};

export = { requireAuth, requireAuthSocket };
