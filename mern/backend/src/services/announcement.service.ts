import announcementModel from "../models/announcement.model";
import { Types } from "mongoose";

// ─── Create ───────────────────────────────────────────────────────────────────

export const createAnnouncement = async (data: {
  courseId: string | Types.ObjectId;
  authorId: string | Types.ObjectId;
  text: string;
}): Promise<any> => {
  const announcement = await announcementModel.create({
    course: data.courseId,
    author: data.authorId,
    text: data.text
  });
  return announcement;
};

// ─── Read ─────────────────────────────────────────────────────────────────────
export const listAnnouncementsByCourse = async (courseId: string): Promise<any[]> => {
  return announcementModel
    .find({ course: courseId })
    .sort({ createdAt: -1 })
    .populate("author", "name email")
    .populate("comments.author", "name email");
};

export const getAnnouncementById = async (id: string): Promise<any | null> => {
  return announcementModel
    .findById(id)
    .populate("author", "name email")
    .populate("comments.author", "name email");
};

export const addCommentToAnnouncement = async (data: {
  announcementId: string;
  authorId: string | Types.ObjectId;
  text: string;
}): Promise<any | null> => {
  return announcementModel
    .findByIdAndUpdate(
      data.announcementId,
      {
        $push: {
          comments: {
            author: data.authorId,
            text: data.text
          }
        }
      },
      { new: true }
    )
    .populate("author", "name email")
    .populate("comments.author", "name email");
};

