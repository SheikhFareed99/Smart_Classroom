import Course from "../models/course.model";
import { IEnrollment } from "../models/course_subdocuments/enrollment.subdoc";
import { Types } from "mongoose";

// Note: Enrollments are embedded subdocuments in the Course model

// Check if student is enrolled in a course
export const isStudentEnrolled = async (
  courseId: string,
  studentId: string
): Promise<boolean> => {
  const course = await Course.findOne({
    _id: courseId,
    "enrollments.student": studentId,
  });
  return !!course;
};

// Enroll student in course
export const enrollStudent = async (
  courseId: string,
  studentId: string
): Promise<IEnrollment> => {
  const enrollment: IEnrollment = {
    student: new Types.ObjectId(studentId),
    enrolledAt: new Date(),
    status: "active",
  };

  await Course.findByIdAndUpdate(courseId, {
    $push: { enrollments: enrollment },
  });

  console.log("Enrolled student:", studentId, "in course:", courseId);
  return enrollment;
};

// Unenroll student from course (set status to dropped)
export const unenrollStudent = async (
  courseId: string,
  studentId: string
): Promise<boolean> => {
  const result = await Course.findOneAndUpdate(
    { _id: courseId, "enrollments.student": studentId },
    { $set: { "enrollments.$.status": "dropped" } }
  );
  return !!result;
};

// Remove student enrollment completely
export const removeEnrollment = async (
  courseId: string,
  studentId: string
): Promise<boolean> => {
  const result = await Course.findByIdAndUpdate(courseId, {
    $pull: { enrollments: { student: studentId } },
  });
  return !!result;
};

// Get all enrollments for a course
export const getCourseEnrollments = async (
  courseId: string
): Promise<IEnrollment[]> => {
  const course = await Course.findById(courseId)
    .select("enrollments")
    .populate("enrollments.student", "name email");

  return (course as any)?.enrollments || [];
};

// Get all courses a student is enrolled in
export const getStudentEnrollments = async (studentId: string) => {
  return Course.find({ "enrollments.student": studentId })
    .select("title courseCode instructor")
    .populate("instructor", "name email");
};

// Get enrollment status
export const getEnrollmentStatus = async (
  courseId: string,
  studentId: string
): Promise<IEnrollment["status"] | null> => {
  const course = await Course.findOne(
    { _id: courseId, "enrollments.student": studentId },
    { "enrollments.$": 1 }
  );

  return (course as any)?.enrollments?.[0]?.status || null;
};

// Update enrollment status
export const updateEnrollmentStatus = async (
  courseId: string,
  studentId: string,
  status: IEnrollment["status"]
): Promise<boolean> => {
  const result = await Course.findOneAndUpdate(
    { _id: courseId, "enrollments.student": studentId },
    { $set: { "enrollments.$.status": status } }
  );
  return !!result;
};

// Count active enrollments in a course
export const countActiveEnrollments = async (courseId: string): Promise<number> => {
  const course = await Course.findById(courseId).select("enrollments");
  if (!course) return 0;

  return ((course as any).enrollments || []).filter(
    (e: IEnrollment) => e.status === "active"
  ).length;
};
