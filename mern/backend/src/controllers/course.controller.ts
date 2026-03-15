import { Request, Response } from "express";
import * as CourseService from "../services/course.service";
import * as EnrollmentService from "../services/enrollment.service";

// POST /api/courses
export const createCourse = async (req: Request, res: Response) => {
  try {
    const { title, description, courseCode } = req.body;
    const instructorId = String((req.user as any)?._id || "");

    if (!instructorId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const course = await CourseService.createCourse({ title, description, courseCode, instructorId });
    res.status(201).json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create course", error });
  }
};

// GET /api/courses/:id
export const getCourse = async (req: Request, res: Response) => {
  try {
    const course = await CourseService.findCourseByIdPopulated(String(req.params.id));

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const enrollments = await EnrollmentService.getCourseEnrollments(course._id.toString());

    res.status(200).json({
      success: true,
      course: {
        ...course.toObject(),
        enrollments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get course", error });
  }
};

// POST /api/courses/join
export const joinCourse = async (req: Request, res: Response) => {
  try {
    const { inviteCode } = req.body;
    const studentId = String((req.user as any)?._id || "");

    if (!studentId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const course = await CourseService.findCourseByInviteCode(inviteCode);

    if (!course) {
      return res.status(404).json({ success: false, message: "Invalid invite code" });
    }

    const alreadyEnrolled = await EnrollmentService.isStudentEnrolled(course._id.toString(), studentId);

    if (alreadyEnrolled) {
      return res.status(400).json({ success: false, message: "Already enrolled" });
    }

    const enrollment = await EnrollmentService.enrollStudent(course._id.toString(), studentId);

    res.status(200).json({
      success: true,
      message: "Joined successfully",
      enrollment,
      course,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to join course", error });
  }
};

// DELETE /api/courses/:id
export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const courseId = String(req.params.id);
    const course = await CourseService.findCourseById(courseId);

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    await EnrollmentService.removeAllCourseEnrollments(course._id.toString());
    await CourseService.deleteCourse(courseId);

    res.status(200).json({ success: true, message: "Course deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete course", error });
  }
};

// POST /api/courses/:id/leave
export const leaveCourse = async (req: Request, res: Response) => {
  try {
    const courseId = String(req.params.id);
    const studentId = String((req.user as any)?._id || "");

    if (!studentId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const course = await CourseService.findCourseById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    const result = await EnrollmentService.unenrollStudent(courseId, studentId);
    if (!result) return res.status(400).json({ success: false, message: "Not enrolled or already dropped" });

    res.status(200).json({ success: true, message: "Left course" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to leave course", error });
  }
};

// DELETE /api/courses/:id/students/:studentId
export const removeStudentFromCourse = async (req: Request, res: Response) => {
  try {
    const courseId = String(req.params.id);
    const studentId = String(req.params.studentId);

    const course = await CourseService.findCourseById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    const removed = await EnrollmentService.removeEnrollment(courseId, studentId);
    if (!removed) return res.status(400).json({ success: false, message: "Student not found in course" });

    res.status(200).json({ success: true, message: "Student removed" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to remove student", error });
  }
};

// GET /api/courses/user/:userId
export const getMyCourses = async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
     const sessionUserId = String((req.user as any)?._id || "");

    if (!sessionUserId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    if (sessionUserId !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const teaching = await CourseService.getCoursesByInstructor(userId);
    const enrollments = await EnrollmentService.getStudentEnrollments(userId);
    const enrolled = enrollments.map((e) => e.course).filter((c) => !!c);

    res.status(200).json({ success: true, teaching, enrolled });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get courses", error });
  }
};