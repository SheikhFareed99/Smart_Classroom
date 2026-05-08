import mongoose, { Document, Schema } from "mongoose";

export type StudentEventVariant = "accent" | "warning" | "danger" | "default";

export interface IStudentEvent extends Document {
  student: mongoose.Types.ObjectId;
  date: string;
  title: string;
  desc: string;
  variant: StudentEventVariant;
}

const StudentEventSchema = new Schema<IStudentEvent>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    desc: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    variant: {
      type: String,
      enum: ["accent", "warning", "danger", "default"],
      default: "default",
    },
  },
  { timestamps: true }
);

StudentEventSchema.index({ student: 1, createdAt: -1 });

export default mongoose.model<IStudentEvent>("StudentEvent", StudentEventSchema);
