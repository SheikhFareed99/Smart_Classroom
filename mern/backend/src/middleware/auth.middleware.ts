import { NextFunction, Request, Response } from "express";

const normalizeId = (value: unknown): string =>
	typeof value === "string" ? value : value && typeof value === "object" && "toString" in value ? String(value) : "";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
	if (!req.isAuthenticated || !req.isAuthenticated()) {
		return res.status(401).json({ success: false, message: "Not authenticated" });
	}
	return next();
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