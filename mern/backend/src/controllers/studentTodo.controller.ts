import { Request, Response } from "express";
import StudentTodo from "../models/studentTodo.model";

const getUID = (req: Request): string => String((req.user as any)?._id || "");

export const listStudentTodos = async (req: Request, res: Response) => {
  try {
    const studentId = getUID(req);
    if (!studentId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const items = await StudentTodo.find({ student: studentId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, items });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || "Server error" });
  }
};

export const createStudentTodo = async (req: Request, res: Response) => {
  try {
    const studentId = getUID(req);
    if (!studentId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ success: false, message: "Text is required" });

    const item = await StudentTodo.create({ student: studentId, text });
    return res.status(201).json({ success: true, item });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || "Server error" });
  }
};

export const updateStudentTodo = async (req: Request, res: Response) => {
  try {
    const studentId = getUID(req);
    if (!studentId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const todoId = String(req.params.id || "").trim();
    if (!todoId) return res.status(400).json({ success: false, message: "Todo id is required" });

    const updates: { text?: string; completed?: boolean } = {};
    if (typeof req.body?.text === "string") {
      const text = req.body.text.trim();
      if (!text) return res.status(400).json({ success: false, message: "Text is required" });
      updates.text = text;
    }
    if (typeof req.body?.completed === "boolean") {
      updates.completed = req.body.completed;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: "No updates provided" });
    }

    const item = await StudentTodo.findOneAndUpdate(
      { _id: todoId, student: studentId },
      updates,
      { new: true }
    ).lean();

    if (!item) return res.status(404).json({ success: false, message: "Todo not found" });

    return res.status(200).json({ success: true, item });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || "Server error" });
  }
};

export const deleteStudentTodo = async (req: Request, res: Response) => {
  try {
    const studentId = getUID(req);
    if (!studentId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const todoId = String(req.params.id || "").trim();
    if (!todoId) return res.status(400).json({ success: false, message: "Todo id is required" });

    const item = await StudentTodo.findOneAndDelete({ _id: todoId, student: studentId }).lean();
    if (!item) return res.status(404).json({ success: false, message: "Todo not found" });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || "Server error" });
  }
};
