import { Request, Response } from "express";
import multer from "multer";
import * as DeliverableService from "../services/deliverable.service";
import * as SubmissionService from "../services/submission.service";
import * as CourseService from "../services/course.service";
import { uploadBuffer, blobPathFromUrl, deleteBlob } from "../services/azure.service";

// ─── Multer: memory storage ───────────────────────────────────────────────────

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "image/png",
      "image/jpeg",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

function getUID(req: Request): string {
  return String((req.user as any)?._id || "");
}

// ─── POST /api/courses/:courseId/deliverables ─────────────────────────────────

export const createDeliverable = async (req: Request, res: Response) => {
  try {
    const courseId     = p(req.params.courseId);
    const instructorId = getUID(req);
    if (!instructorId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const course = await CourseService.findCourseById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });
    if (course.instructor.toString() !== instructorId)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const { title, description, deadline, totalPoints, status } = req.body;
    if (!title) return res.status(400).json({ success: false, message: "Title is required" });

    // Create deliverable first (need _id for blob path)
    const created = await DeliverableService.createDeliverable({
      title,
      description,
      courseId,
      deadline:    deadline     ? new Date(deadline)  : undefined,
      totalPoints: totalPoints  ? Number(totalPoints) : 100,
      status:      (status as any) || "draft",
    });

    if (req.file) {
      const blobPath = `courses/${courseId}/assignments/${String(created._id)}/${Date.now()}_${req.file.originalname}`;
      const url      = await uploadBuffer(req.file.buffer, blobPath, req.file.mimetype);

      const DeliverableModel = (await import("../models/deliverable.model")).default;
      await DeliverableModel.findByIdAndUpdate(created._id, {
        $push: {
          attachments: {
            fileName:  req.file.originalname,
            url,
            mimeType:  req.file.mimetype,
            sizeBytes: req.file.size,
            uploadedAt: new Date(),
          },
        },
      });

      const final = await DeliverableService.getDeliverableById(String(created._id));
      return res.status(201).json({ success: true, deliverable: final });
    }

    return res.status(201).json({ success: true, deliverable: created });
  } catch (error: any) {
    console.error("createDeliverable:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// ─── GET /api/courses/:courseId/deliverables ──────────────────────────────────

export const listDeliverables = async (req: Request, res: Response) => {
  try {
    const courseId   = p(req.params.courseId);
    const deliverables = await DeliverableService.getDeliverablesByCourse(courseId);
    return res.status(200).json({ success: true, deliverables });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// ─── GET /api/deliverables/:deliverableId ─────────────────────────────────────

export const getDeliverable = async (req: Request, res: Response) => {
  try {
    const deliverableId = p(req.params.deliverableId);
    const deliverable   = await DeliverableService.getDeliverableById(deliverableId);
    if (!deliverable) return res.status(404).json({ success: false, message: "Not found" });

    const userId   = getUID(req);
    const submission = userId
      ? await SubmissionService.getSubmissionByDeliverableAndStudent(deliverableId, userId)
      : null;

    return res.status(200).json({ success: true, deliverable, submission });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// ─── DELETE /api/deliverables/:deliverableId ──────────────────────────────────

export const deleteDeliverable = async (req: Request, res: Response) => {
  try {
    const deliverableId = p(req.params.deliverableId);
    const instructorId  = getUID(req);
    if (!instructorId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const deliverable = await DeliverableService.getDeliverableById(deliverableId);
    if (!deliverable) return res.status(404).json({ success: false, message: "Not found" });

    const course = await CourseService.findCourseById(deliverable.course.toString());
    if (!course || course.instructor.toString() !== instructorId)
      return res.status(403).json({ success: false, message: "Forbidden" });

    for (const att of deliverable.attachments) {
      const path = blobPathFromUrl(att.url);
      if (path) await deleteBlob(path);
    }

    await DeliverableService.deleteDeliverable(deliverableId);
    return res.status(200).json({ success: true, message: "Assignment deleted" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// ─── POST /api/deliverables/:deliverableId/submit ─────────────────────────────

export const submitAssignment = async (req: Request, res: Response) => {
  try {
    const deliverableId = p(req.params.deliverableId);
    const studentId     = getUID(req);
    if (!studentId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const deliverable = await DeliverableService.getDeliverableById(deliverableId);
    if (!deliverable) return res.status(404).json({ success: false, message: "Assignment not found" });
    if (deliverable.status !== "published")
      return res.status(400).json({ success: false, message: "Assignment is not published yet" });

    if (!req.file) return res.status(400).json({ success: false, message: "File is required" });

    const blobPath = `courses/${deliverable.course}/assignments/${String(deliverable._id)}/submissions/${studentId}_${Date.now()}_${req.file.originalname}`;
    const fileUrl  = await uploadBuffer(req.file.buffer, blobPath, req.file.mimetype);

    const submission = await SubmissionService.upsertSubmission({
      deliverableId: deliverable._id,
      studentId,
      courseId:      deliverable.course,
      fileUrl,
      fileName:      req.file.originalname,
      mimeType:      req.file.mimetype,
      sizeBytes:     req.file.size,
    });

    return res.status(200).json({ success: true, submission });
  } catch (error: any) {
    console.error("submitAssignment:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// ─── GET /api/deliverables/:deliverableId/submissions ────────────────────────

export const listSubmissions = async (req: Request, res: Response) => {
  try {
    const deliverableId = p(req.params.deliverableId);
    const submissions   = await SubmissionService.getSubmissionsByDeliverable(deliverableId);
    return res.status(200).json({ success: true, submissions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};
