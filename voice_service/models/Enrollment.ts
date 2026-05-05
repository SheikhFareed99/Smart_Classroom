import mongoose, { Schema } from "mongoose";

/** Minimal schema — used to verify a student may access a course's voice channels. */
const EnrollmentSchema = new Schema(
  {
    course:  { type: Schema.Types.ObjectId, ref: "Course", required: true },
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status:  { type: String, enum: ["active", "dropped"], default: "active" },
  },
  { collection: "enrollments", strict: false }
);

export default mongoose.models.Enrollment || mongoose.model("Enrollment", EnrollmentSchema);
