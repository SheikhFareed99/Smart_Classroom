import mongoose, { Schema, Document, Types } from "mongoose";

export interface IEnrollment extends Document {
  course: Types.ObjectId;
  student: Types.ObjectId;
  enrolledAt: Date;
  status: "active" | "dropped";
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "dropped"],
      default: "active",
    },
  },
  { timestamps: true }
);

EnrollmentSchema.index({ course: 1, student: 1 }, { unique: true });
EnrollmentSchema.index({ student: 1, status: 1 });
EnrollmentSchema.index({ course: 1, status: 1 });

export default mongoose.model<IEnrollment>("Enrollment", EnrollmentSchema);