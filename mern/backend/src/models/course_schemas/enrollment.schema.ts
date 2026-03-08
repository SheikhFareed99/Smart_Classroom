import mongoose, { Schema } from "mongoose";

export interface IEnrollment {
  student: mongoose.Types.ObjectId;
  enrolledAt: Date;
  status: "active" | "dropped";
}

export const EnrollmentSchema = new Schema<IEnrollment>({
  student: { type: Schema.Types.ObjectId, ref: "User", required: true },
  enrolledAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["active", "dropped"], default: "active" },
});