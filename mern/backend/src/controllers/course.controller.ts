import { Request, Response } from "express";
import Course from "../models/course.model";
import User from "../models/users.model";
import crypto from "crypto";

// generates a random 6 character invite code e.g. "XK92P3"
const generateInviteCode = (): string => {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
};

// POST /api/courses
export const createCourse = async (req: Request, res: Response) => {
  try {
    const { title, description, courseCode, instructorId } = req.body;

    const course = await Course.create({
      title,
      description,
      courseCode,
      instructor: instructorId,
      inviteCode: generateInviteCode(),
    });

    await User.findByIdAndUpdate(instructorId, {
      $push: { teachingCourses: course._id },
    });

    res.status(201).json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create course", error });
  }
};

// GET /api/courses/:id
export const getCourse = async (req: Request, res: Response) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("instructor", "name email")
      .populate("enrollments.student", "name email");

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    res.status(200).json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get course", error });
  }
};

// POST /api/courses/join
export const joinCourse = async (req: Request, res: Response) => {
  try {
    const { inviteCode, studentId } = req.body;

    const course = await Course.findOne({ inviteCode });

    if (!course) {
      return res.status(404).json({ success: false, message: "Invalid invite code" });
    }

    // check if already enrolled
    const alreadyEnrolled = course.enrollments.some(
      (e) => e.student.toString() === studentId
    );

    if (alreadyEnrolled) {
      return res.status(400).json({ success: false, message: "Already enrolled" });
    }

    course.enrollments.push({
      student: studentId,
      enrolledAt: new Date(),
      status: "active",
    });
    await course.save();

    await User.findByIdAndUpdate(studentId, {
      $push: { enrolledCourses: course._id },
    });

    res.status(200).json({ success: true, message: "Joined successfully", course });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to join course", error });
  }
};

// DELETE /api/courses/:id
export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    await course.deleteOne();

    await User.findByIdAndUpdate(course.instructor, {
      $pull: { teachingCourses: course._id },
    });

    res.status(200).json({ success: true, message: "Course deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete course", error });
  }
};

// GET /api/courses/user/:userId
export const getMyCourses = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const teaching = await Course.find({ instructor: userId })
      .select("title courseCode inviteCode isArchived");

    const enrolled = await Course.find({ "enrollments.student": userId })
      .select("title courseCode instructor");

    res.status(200).json({ success: true, teaching, enrolled });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get courses", error });
  }
};