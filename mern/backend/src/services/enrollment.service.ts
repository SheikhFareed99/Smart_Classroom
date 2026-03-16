import Enrollment, { IEnrollment } from "../models/enrollment.model";
import { Types } from "mongoose";

// Check if student is enrolled in a course
export const isStudentEnrolled = async (
  courseId: string,
  studentId: string
): Promise<boolean> => {
  const enrollment = await Enrollment.findOne({
    course: courseId,
    student: studentId,
    status: "active",
  });
  return !!enrollment;
};

// Enroll student in course
export const enrollStudent = async (
  courseId: string,
  studentId: string
): Promise<IEnrollment> => {
  const enrollment = await Enrollment.findOneAndUpdate(
    { course: courseId, student: studentId },
    {
      $set: {
        status: "active",
        enrolledAt: new Date(),
      },
      $setOnInsert: {
        course: new Types.ObjectId(courseId),
        student: new Types.ObjectId(studentId),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log("Enrolled student:", studentId, "in course:", courseId);
  return enrollment as IEnrollment;
};

// Unenroll student from course (set status to dropped)
export const unenrollStudent = async (
  courseId: string,
  studentId: string
): Promise<boolean> => {
  const result = await Enrollment.findOneAndUpdate(
    { course: courseId, student: studentId },
    { $set: { status: "dropped" } }
  );
  return !!result;
};

// Remove student enrollment completely
export const removeEnrollment = async (
  courseId: string,
  studentId: string
): Promise<boolean> => {
  const result = await Enrollment.deleteOne({ course: courseId, student: studentId });
  return result.deletedCount > 0;
};

// Get all enrollments for a course
export const getCourseEnrollments = async (
  courseId: string
): Promise<IEnrollment[]> => {
  return Enrollment.find({ course: courseId })
    .populate("student", "name email")
    .sort({ enrolledAt: -1 });
};

// Get all courses a student is enrolled in
export const getStudentEnrollments = async (studentId: string) => {
  return Enrollment.find({ student: studentId, status: "active" })
    .populate({
      path: "course",
      select: "title courseCode instructor",
      populate: { path: "instructor", select: "name email" },
    })
    .sort({ enrolledAt: -1 });
};

// Get enrollment status
export const getEnrollmentStatus = async (
  courseId: string,
  studentId: string
): Promise<IEnrollment["status"] | null> => {
  const enrollment = await Enrollment.findOne({ course: courseId, student: studentId })
    .select("status");

  return enrollment?.status || null;
};

// Update enrollment status
export const updateEnrollmentStatus = async (
  courseId: string,
  studentId: string,
  status: IEnrollment["status"]
): Promise<boolean> => {
  const result = await Enrollment.findOneAndUpdate(
    { course: courseId, student: studentId },
    { $set: { status } }
  );
  return !!result;
};

// Count active enrollments in a course
export const countActiveEnrollments = async (courseId: string): Promise<number> => {
  return Enrollment.countDocuments({ course: courseId, status: "active" });
};

// Remove all enrollments for a course (used when deleting a course)
export const removeAllCourseEnrollments = async (courseId: string): Promise<number> => {
  const result = await Enrollment.deleteMany({ course: courseId });
  return result.deletedCount;
};
