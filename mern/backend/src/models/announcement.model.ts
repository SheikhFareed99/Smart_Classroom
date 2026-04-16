import mongoose, { Schema, model } from "mongoose";

const CommentSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const AnnouncementSchema = new Schema(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User", // teacher
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    comments: [CommentSchema],
  },
  { timestamps: true }
);

// indexes to search by course and sort by created at for fast retrieval of announcements and comments
AnnouncementSchema.index({ course: 1, createdAt: -1 });
AnnouncementSchema.index({ "comments.createdAt": 1 });

export default model("Announcement", AnnouncementSchema);