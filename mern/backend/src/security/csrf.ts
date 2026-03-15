import type { NextFunction, Request, Response } from "express";
import { doubleCsrf, type DoubleCsrfUtilities } from "csrf-csrf";

let csrfUtilities: DoubleCsrfUtilities | null = null;

export function initCsrfProtection(options: { isProduction: boolean }) {
  if (csrfUtilities) return csrfUtilities;

  const csrfSecret = process.env.CSRF_SECRET || process.env.SESSION_SECRET;
  if (!csrfSecret) {
    throw new Error("CSRF_SECRET or SESSION_SECRET is required");
  }

  csrfUtilities = doubleCsrf({
    getSecret: () => csrfSecret,
    getSessionIdentifier: (req) => req.sessionID,
    cookieName: process.env.CSRF_COOKIE_NAME || "aico.x-csrf-token",
    cookieOptions: {
      httpOnly: true,
      sameSite: options.isProduction ? "none" : "lax",
      secure: options.isProduction,
      path: "/",
    },
    getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"],
    ignoredMethods: ["GET", "HEAD", "OPTIONS"],
    errorConfig: {
      statusCode: 403,
      message: "Invalid CSRF token",
      code: "EBADCSRFTOKEN",
    },
  });

  return csrfUtilities;
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (!csrfUtilities) {
    return next(new Error("CSRF protection not initialized"));
  }
  return csrfUtilities.doubleCsrfProtection(req, res, next);
}

export function generateCsrfToken(req: Request, res: Response) {
  if (!csrfUtilities) {
    throw new Error("CSRF protection not initialized");
  }
  return csrfUtilities.generateCsrfToken(req, res);
}
