import { Request, Response } from "express";
import StudentEvent, { StudentEventVariant } from "../models/studentEvent.model";

const getUID = (req: Request): string => String((req.user as any)?._id || "");
const ALLOWED_VARIANTS = new Set<StudentEventVariant>(["accent", "warning", "danger", "default"]);

export const listStudentEvents = async (req: Request, res: Response) => {
  try {
    const studentId = getUID(req);
    if (!studentId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const items = await StudentEvent.find({ student: studentId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, items });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || "Server error" });
  }
};

export const createStudentEvent = async (req: Request, res: Response) => {
  try {
    const studentId = getUID(req);
    if (!studentId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const date = String(req.body?.date || "").trim();
    const title = String(req.body?.title || "").trim();
    const desc = String(req.body?.desc || "").trim();
    const variant = (req.body?.variant || "default") as StudentEventVariant;

    if (!date || !title || !desc) {
      return res.status(400).json({ success: false, message: "Date, title, and description are required" });
    }

    if (!ALLOWED_VARIANTS.has(variant)) {
      return res.status(400).json({ success: false, message: "Invalid variant" });
    }

    const item = await StudentEvent.create({ student: studentId, date, title, desc, variant });
    return res.status(201).json({ success: true, item });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || "Server error" });
  }
};

export const updateStudentEvent = async (req: Request, res: Response) => {
  try {
    const studentId = getUID(req);
    if (!studentId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const eventId = String(req.params.id || "").trim();
    if (!eventId) return res.status(400).json({ success: false, message: "Event id is required" });

    const updates: Partial<{ date: string; title: string; desc: string; variant: StudentEventVariant }> = {};

    if (typeof req.body?.date === "string") {
      const date = req.body.date.trim();
      if (!date) return res.status(400).json({ success: false, message: "Date is required" });
      updates.date = date;
    }
    if (typeof req.body?.title === "string") {
      const title = req.body.title.trim();
      if (!title) return res.status(400).json({ success: false, message: "Title is required" });
      updates.title = title;
    }
    if (typeof req.body?.desc === "string") {
      const desc = req.body.desc.trim();
      if (!desc) return res.status(400).json({ success: false, message: "Description is required" });
      updates.desc = desc;
    }
    if (typeof req.body?.variant === "string") {
      const variant = req.body.variant as StudentEventVariant;
      if (!ALLOWED_VARIANTS.has(variant)) {
        return res.status(400).json({ success: false, message: "Invalid variant" });
      }
      updates.variant = variant;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: "No updates provided" });
    }

    const item = await StudentEvent.findOneAndUpdate(
      { _id: eventId, student: studentId },
      updates,
      { new: true }
    ).lean();

    if (!item) return res.status(404).json({ success: false, message: "Event not found" });

    return res.status(200).json({ success: true, item });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || "Server error" });
  }
};

export const deleteStudentEvent = async (req: Request, res: Response) => {
  try {
    const studentId = getUID(req);
    if (!studentId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const eventId = String(req.params.id || "").trim();
    if (!eventId) return res.status(400).json({ success: false, message: "Event id is required" });

    const item = await StudentEvent.findOneAndDelete({ _id: eventId, student: studentId }).lean();
    if (!item) return res.status(404).json({ success: false, message: "Event not found" });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || "Server error" });
  }
};
