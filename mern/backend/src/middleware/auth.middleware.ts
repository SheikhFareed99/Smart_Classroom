import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const normalizeId = (value: unknown): string =>
  typeof value === "string" ? value : value && typeof value === "object" && "toString" in value ? String(value) : "";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // 1. Check JWT from Authorization: Bearer <token> header (primary - works cross-domain)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, process.env.SESSION_SECRET!) as any;
      (req as any).user = { _id: payload.userId, name: payload.name, email: payload.email };
      return next();
    } catch {
      // Invalid/expired JWT — fall through to session check
    }
  }

  // 2. Fall back to session-based auth (for local dev / backward compat)
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json({ success: false, message: "Not authenticated" });
};

export const requireSameUserFromParam = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const currentUserId = normalizeId((req.user as any)?._id);
    const requestedUserId = normalizeId(req.params[paramName]);

    if (!currentUserId || !requestedUserId || currentUserId !== requestedUserId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return next();
  };
};