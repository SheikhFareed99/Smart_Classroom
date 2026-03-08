// import { Request, Response, NextFunction } from "express";
// import jwt from "jsonwebtoken";
// import User from "../models/users";

// // extends express Request so req.user is available in all controllers
// declare global {
//   namespace Express {
//     interface Request {
//       user?: any;
//     }
//   }
// }

// export const protect = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     // token is sent as "Bearer <token>" in the Authorization header
//     const token = req.headers.authorization?.split(" ")[1];

//     if (!token) {
//       return res.status(401).json({ success: false, message: "Not logged in" });
//     }

//     // verify token and extract user id
//     const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

//     // attach user to request so controllers can access req.user
//     req.user = await User.findById(decoded.id).select("-password");

//     if (!req.user) {
//       return res.status(401).json({ success: false, message: "User not found" });
//     }

//     next();
//   } catch (error) {
//     res.status(401).json({ success: false, message: "Invalid token" });
//   }
// };