import Course, { ICourse } from "../models/course.model";
import { Types } from "mongoose";
import crypto from "crypto";

// Generate a random 6 character invite code e.g. "XK92P3"
export const generateInviteCode = (): string => {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
};

// Find course by ID
export const findCourseById = async (courseId: string): Promise<ICourse | null> => {
  return Course.findById(courseId);
};

// Find course by ID with populated fields
export const findCourseByIdPopulated = async (courseId: string): Promise<ICourse | null> => {
  return Course.findById(courseId)
    .populate("instructor", "name email");
};

// Find course by invite code
export const findCourseByInviteCode = async (inviteCode: string): Promise<ICourse | null> => {
  return Course.findOne({ inviteCode });
};

// Find course by course code
export const findCourseByCourseCode = async (courseCode: string): Promise<ICourse | null> => {
  return Course.findOne({ courseCode });
};

// Create a new course
export const createCourse = async (data: {
  title: string;
  description?: string;
  courseCode: string;
  instructorId: string | Types.ObjectId;
}): Promise<ICourse> => {
  const course = await Course.create({
    title: data.title,
    description: data.description,
    courseCode: data.courseCode,
    instructor: data.instructorId,
    inviteCode: generateInviteCode(),
  });
  console.log("Created new course:", course.title);
  return course;
};

// Update course
export const updateCourse = async (
  courseId: string,
  updates: Partial<Pick<ICourse, "title" | "description" | "isArchived" | "settings">>
): Promise<ICourse | null> => {
  return Course.findByIdAndUpdate(courseId, updates, { new: true, runValidators: true });
};

// Delete course
export const deleteCourse = async (courseId: string): Promise<ICourse | null> => {
  return Course.findByIdAndDelete(courseId);
};

// Get courses by instructor
export const getCoursesByInstructor = async (instructorId: string): Promise<ICourse[]> => {
  return Course.find({ instructor: instructorId })
    .select("title courseCode inviteCode isArchived");
};

// Archive/unarchive course
export const archiveCourse = async (courseId: string, isArchived: boolean): Promise<ICourse | null> => {
  return Course.findByIdAndUpdate(courseId, { isArchived }, { new: true });
};

// Regenerate invite code
export const regenerateInviteCode = async (courseId: string): Promise<ICourse | null> => {
  const newCode = generateInviteCode();
  return Course.findByIdAndUpdate(courseId, { inviteCode: newCode }, { new: true });
};
