import mongoose, { Schema } from "mongoose";

/** Minimal schema for voice_service — only `instructor` is read for authorization. */
const CourseSchema = new Schema(
  {
    instructor: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { collection: "courses", strict: false }
);

export default mongoose.models.Course || mongoose.model("Course", CourseSchema);
