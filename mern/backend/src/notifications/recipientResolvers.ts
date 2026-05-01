import Enrollment from "../models/enrollment.model";
import { NotificationRecipient } from "./types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmail = (email: string): boolean => EMAIL_REGEX.test(email);

export const getActiveStudentRecipientsForCourse = async (
  courseId: string
): Promise<NotificationRecipient[]> => {
  const rows = await Enrollment.find({
    course: courseId,
    status: "active",
  }).populate("student", "_id name email");

  const deduped = new Map<string, NotificationRecipient>();

  for (const row of rows) {
    const student = row.student as any;
    const email = String(student?.email || "").trim().toLowerCase();
    if (!email || !isValidEmail(email)) continue;

    if (!deduped.has(email)) {
      deduped.set(email, {
        email,
        userId: student?._id ? String(student._id) : undefined,
        name: student?.name ? String(student.name) : undefined,
      });
    }
  }

  return Array.from(deduped.values());
};

export const makeSingleRecipient = (input: {
  email?: string;
  userId?: string;
  name?: string;
}): NotificationRecipient[] => {
  const email = String(input.email || "").trim().toLowerCase();
  if (!email || !isValidEmail(email)) return [];

  return [
    {
      email,
      userId: input.userId,
      name: input.name,
    },
  ];
};
