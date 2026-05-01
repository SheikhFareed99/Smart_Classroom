import { Request, Response } from "express";
import Enrollment from "../models/enrollment.model";
import Deliverable from "../models/deliverable.model";
import Submission from "../models/submission.model";

// ─── Helper ──────────────────────────────────────────────────────────────────

function getUID(req: Request): string {
  return String((req.user as any)?._id || "");
}

// ─── GET /api/todo ───────────────────────────────────────────────────────────
// Returns all published assignments across the student's enrolled courses,
// enriched with submission status so the frontend can show what's due,
// what's been submitted, and what's overdue.

export const getStudentTodo = async (req: Request, res: Response) => {
  try {
    const studentId = getUID(req);
    if (!studentId) return res.status(401).json({ success: false, message: "Not authenticated" });

    // 1. Find all active enrollments for this student
    const enrollments = await Enrollment.find({ student: studentId, status: "active" })
      .populate("course", "title courseCode")
      .lean();

    const courseIds = enrollments.map((e: any) => e.course?._id).filter(Boolean);

    if (courseIds.length === 0) {
      return res.status(200).json({ success: true, items: [] });
    }

    // 2. Get all published deliverables from those courses
    const deliverables = await Deliverable.find({
      course: { $in: courseIds },
      status: "published",
    })
      .sort({ deadline: 1, createdAt: -1 })
      .lean();

    if (deliverables.length === 0) {
      return res.status(200).json({ success: true, items: [] });
    }

    // 3. Get all submissions this student has made for those deliverables
    const deliverableIds = deliverables.map((d) => d._id);
    const submissions = await Submission.find({
      deliverable: { $in: deliverableIds },
      student: studentId,
    }).lean();

    // Build a map: deliverableId -> submission
    const submissionMap = new Map<string, any>();
    for (const sub of submissions) {
      submissionMap.set(sub.deliverable.toString(), sub);
    }

    // Build a map: courseId -> course info from enrollments
    const courseMap = new Map<string, any>();
    for (const enrollment of enrollments) {
      const course = enrollment.course as any;
      if (course?._id) {
        courseMap.set(course._id.toString(), {
          _id: course._id.toString(),
          title: course.title || "Course",
          courseCode: course.courseCode || "",
        });
      }
    }

    // 4. Build the todo items
    const now = new Date();
    const items = deliverables.map((d: any) => {
      const sub = submissionMap.get(d._id.toString());
      const course = courseMap.get(d.course.toString());
      const deadline = d.deadline ? new Date(d.deadline) : null;

      let todoStatus: "assigned" | "submitted" | "graded" | "missing" | "late" = "assigned";
      if (sub) {
        if (sub.status === "graded") todoStatus = "graded";
        else if (sub.status === "submitted") todoStatus = "submitted";
        else if (sub.status === "late") todoStatus = "late";
      } else if (deadline && deadline < now) {
        todoStatus = "missing";
      }

      return {
        _id: d._id.toString(),
        title: d.title,
        description: d.description || "",
        courseId: d.course.toString(),
        courseTitle: course?.title || "Course",
        courseCode: course?.courseCode || "",
        deadline: d.deadline || null,
        totalPoints: d.totalPoints,
        todoStatus,
        submittedAt: sub?.submittedAt || null,
        grade: sub?.grade ?? null,
        createdAt: d.createdAt,
      };
    });

    return res.status(200).json({ success: true, items });
  } catch (error: any) {
    console.error("getStudentTodo:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};
