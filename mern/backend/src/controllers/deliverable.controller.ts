import { Request, Response } from "express";
import multer from "multer";
import * as DeliverableService from "../services/deliverable.service";
import * as SubmissionService from "../services/submission.service";
import * as CourseService from "../services/course.service";
import * as EnrollmentService from "../services/enrollment.service";
import { uploadBuffer, blobPathFromUrl, deleteBlob } from "../services/azure.service";
import { SubmissionCommentScope } from "../models/submission.model";
import { publishNotificationEvent } from "../notifications";

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

function idOf(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
}

async function isInstructor(courseId: string, userId: string): Promise<boolean> {
  const course = await CourseService.findCourseById(courseId);
  if (!course) return false;
  return course.instructor.toString() === userId;
}

function normalizeScope(scope: unknown): SubmissionCommentScope | null {
  if (scope === "private" || scope === "class") return scope;
  return null;
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

    const actorName = String((req.user as any)?.name || "Instructor");
    const publishPayload = {
      courseId,
      courseTitle: String(course.title || "Course"),
      deliverableId: String(created._id),
      deliverableTitle: String(created.title),
      deadline: created.deadline ? new Date(created.deadline).toISOString() : undefined,
      totalPoints: Number(created.totalPoints || 0),
      actorName,
    };

    void publishNotificationEvent({
      name: "course.deliverable.created",
      payload: publishPayload,
    }).catch((notifyError) => {
      console.error("Failed to queue deliverable notification:", notifyError);
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
    const userId = getUID(req);
    if (!userId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const deliverable = await DeliverableService.getDeliverableById(deliverableId);
    if (!deliverable) return res.status(404).json({ success: false, message: "Assignment not found" });

    const instructor = await isInstructor(deliverable.course.toString(), userId);
    if (!instructor) return res.status(403).json({ success: false, message: "Forbidden" });

    const submissions   = await SubmissionService.getSubmissionsByDeliverable(deliverableId);
    return res.status(200).json({ success: true, submissions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// ─── GET /api/submissions/:submissionId/comments ─────────────────────────────

export const getSubmissionComments = async (req: Request, res: Response) => {
  try {
    const submissionId = p(req.params.submissionId);
    const userId = getUID(req);
    if (!userId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const submission = await SubmissionService.getSubmissionById(submissionId);
    if (!submission) return res.status(404).json({ success: false, message: "Submission not found" });

    const instructor = await isInstructor(submission.course.toString(), userId);
    const enrolled = instructor
      ? true
      : await EnrollmentService.isStudentEnrolled(submission.course.toString(), userId);
    const isOwnerStudent = idOf(submission.student) === userId;

    const queryScope = normalizeScope(req.query.scope);

    if (queryScope === "private") {
      if (!instructor && !isOwnerStudent) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
      return res.status(200).json({ success: true, scope: "private", comments: submission.privateComments });
    }

    if (queryScope === "class") {
      if (!instructor && !enrolled) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
      return res.status(200).json({ success: true, scope: "class", comments: submission.classComments });
    }

    const payload: {
      privateComments?: typeof submission.privateComments;
      classComments?: typeof submission.classComments;
    } = {};

    if (instructor || isOwnerStudent) payload.privateComments = submission.privateComments;
    if (instructor || enrolled) payload.classComments = submission.classComments;

    return res.status(200).json({ success: true, ...payload });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// ─── POST /api/submissions/:submissionId/comments ────────────────────────────

export const addSubmissionComment = async (req: Request, res: Response) => {
  try {
    const submissionId = p(req.params.submissionId);
    const authorId = getUID(req);
    if (!authorId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const scope = normalizeScope(req.body.scope);
    const text = String(req.body.text || "").trim();

    if (!scope) {
      return res.status(400).json({ success: false, message: "scope is required (private | class)" });
    }
    if (!text) {
      return res.status(400).json({ success: false, message: "Comment text is required" });
    }

    const submission = await SubmissionService.getSubmissionById(submissionId);
    if (!submission) return res.status(404).json({ success: false, message: "Submission not found" });

    const instructor = await isInstructor(submission.course.toString(), authorId);
    const enrolled = instructor
      ? true
      : await EnrollmentService.isStudentEnrolled(submission.course.toString(), authorId);
    const isOwnerStudent = idOf(submission.student) === authorId;

    if (scope === "private" && !instructor && !isOwnerStudent) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (scope === "class" && !instructor && !enrolled) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const updated = await SubmissionService.addCommentToSubmission({
      submissionId,
      authorId,
      scope,
      text,
    });

    if (!updated) return res.status(404).json({ success: false, message: "Submission not found" });

    return res.status(200).json({
      success: true,
      scope,
      comments: scope === "private" ? updated.privateComments : updated.classComments,
      submission: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// ─── POST /api/deliverables/:deliverableId/private-comments ─────────────────

export const addDeliverablePrivateComment = async (req: Request, res: Response) => {
  try {
    const deliverableId = p(req.params.deliverableId);
    const studentId = getUID(req);

    if (!studentId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const text = String(req.body.text || "").trim();
    if (!text) return res.status(400).json({ success: false, message: "Comment text is required" });

    const deliverable = await DeliverableService.getDeliverableById(deliverableId);
    if (!deliverable) return res.status(404).json({ success: false, message: "Assignment not found" });

    const instructor = await isInstructor(deliverable.course.toString(), studentId);
    const enrolled = instructor
      ? true
      : await EnrollmentService.isStudentEnrolled(deliverable.course.toString(), studentId);

    if (!instructor && !enrolled) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const thread = await SubmissionService.ensureSubmissionThread({
      deliverableId,
      studentId,
      courseId: deliverable.course,
    });

    const updated = await SubmissionService.addCommentToSubmission({
      submissionId: String(thread._id),
      authorId: studentId,
      scope: "private",
      text,
    });

    if (!updated) return res.status(404).json({ success: false, message: "Submission not found" });

    return res.status(200).json({ success: true, submission: updated, comments: updated.privateComments });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// ─── POST /api/submissions/:submissionId/grade ──────────────────────────────

export const gradeSubmission = async (req: Request, res: Response) => {
  try {
    const submissionId = p(req.params.submissionId);
    const userId = getUID(req);
    if (!userId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const grade = Number(req.body.grade);
    if (!Number.isFinite(grade) || grade < 0) {
      return res.status(400).json({ success: false, message: "grade must be a number >= 0" });
    }

    const submission = await SubmissionService.getSubmissionById(submissionId);
    if (!submission) return res.status(404).json({ success: false, message: "Submission not found" });

    const deliverable = await DeliverableService.getDeliverableById(submission.deliverable.toString());
    if (!deliverable) return res.status(404).json({ success: false, message: "Assignment not found" });

    const instructor = await isInstructor(submission.course.toString(), userId);
    if (!instructor) return res.status(403).json({ success: false, message: "Forbidden" });

    if (grade > deliverable.totalPoints) {
      return res.status(400).json({ success: false, message: `grade cannot exceed total points (${deliverable.totalPoints})` });
    }

    if (!submission.attachments || submission.attachments.length === 0) {
      return res.status(400).json({ success: false, message: "Cannot grade before submission file is uploaded" });
    }

    const updated = await SubmissionService.setSubmissionGrade({ submissionId, grade });
    if (!updated) return res.status(404).json({ success: false, message: "Submission not found" });

    const student = submission.student as any;
    const course = await CourseService.findCourseById(submission.course.toString());
    const actorName = String((req.user as any)?.name || "Instructor");

    void publishNotificationEvent({
      name: "submission.graded",
      payload: {
        courseId: submission.course.toString(),
        courseTitle: String(course?.title || "Course"),
        submissionId: submissionId,
        deliverableId: deliverable._id.toString(),
        deliverableTitle: String(deliverable.title),
        grade,
        totalPoints: Number(deliverable.totalPoints),
        studentId: student?._id ? String(student._id) : "",
        studentEmail: String(student?.email || ""),
        studentName: student?.name ? String(student.name) : undefined,
        actorName,
      },
    }).catch((notifyError) => {
      console.error("Failed to queue grading notification:", notifyError);
    });

    return res.status(200).json({ success: true, submission: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// ─── GET /api/deliverables/:deliverableId/class-comments ────────────────────

export const getDeliverableClassComments = async (req: Request, res: Response) => {
  try {
    const deliverableId = p(req.params.deliverableId);
    const userId = getUID(req);
    if (!userId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const deliverable = await DeliverableService.getDeliverableByIdWithClassComments(deliverableId);
    if (!deliverable) return res.status(404).json({ success: false, message: "Assignment not found" });

    const instructor = await isInstructor(deliverable.course.toString(), userId);
    const enrolled = instructor
      ? true
      : await EnrollmentService.isStudentEnrolled(deliverable.course.toString(), userId);

    if (!instructor && !enrolled) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return res.status(200).json({ success: true, comments: deliverable.classComments });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// ─── POST /api/deliverables/:deliverableId/class-comments ───────────────────

export const addDeliverableClassComment = async (req: Request, res: Response) => {
  try {
    const deliverableId = p(req.params.deliverableId);
    const authorId = getUID(req);
    if (!authorId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const text = String(req.body.text || "").trim();
    if (!text) return res.status(400).json({ success: false, message: "Comment text is required" });

    const deliverable = await DeliverableService.getDeliverableById(deliverableId);
    if (!deliverable) return res.status(404).json({ success: false, message: "Assignment not found" });

    const instructor = await isInstructor(deliverable.course.toString(), authorId);
    const enrolled = instructor
      ? true
      : await EnrollmentService.isStudentEnrolled(deliverable.course.toString(), authorId);

    if (!instructor && !enrolled) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const updated = await DeliverableService.addClassCommentToDeliverable({
      deliverableId,
      authorId,
      text,
    });

    if (!updated) return res.status(404).json({ success: false, message: "Assignment not found" });

    return res.status(200).json({ success: true, comments: updated.classComments });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};