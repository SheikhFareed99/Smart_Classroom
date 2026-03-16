import { Request, Response } from "express";
import {
  findUserById,
  getAllUsers as getAllUsersService,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
  getUserCourses as getUserCoursesService,
} from "../services/user.service";

// GET /api/users/:id
export const getUser = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const user = await findUserById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get user", error });
  }
};

// GET /api/users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await getAllUsersService();
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get users", error });
  }
};

// PUT /api/users/:id
export const updateUser = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { name, email } = req.body;

    const user = await updateUserService(req.params.id, { name, email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update user", error });
  }
};

// DELETE /api/users/:id
export const deleteUser = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const deleted = await deleteUserService(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete user", error });
  }
};

// GET /api/users/:id/courses
export const getUserCourses = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { enrolledCourses, teachingCourses } = await getUserCoursesService(req.params.id);

    res.status(200).json({
      success: true,
      enrolledCourses,
      teachingCourses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get user courses", error });
  }
};
