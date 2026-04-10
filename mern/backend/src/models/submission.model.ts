import { Schema, Document, model, Types } from "mongoose";
import { AttachmentSchema, IAttachment } from "./deliverable_subdocuments/attachment.subdoc";

export type SubmissionStatus = "not_submitted" | "submitted" | "late" | "graded";

export interface ISubmission extends Document {
  deliverable: Types.ObjectId;    // ref: "Deliverable"
  student: Types.ObjectId;        // ref: "User"  (student who submitted)
  course: Types.ObjectId;         // ref: "Course" — denormalized for fast per-course queries

  attachments: IAttachment[];
  submittedAt?: Date;            
  status: SubmissionStatus;
  grade?: number;                 // points awarded 
  feedback?: string;              // teacher's written feedback after grading
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    deliverable: {
      type: Schema.Types.ObjectId,
      ref: "Deliverable",
      required: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    attachments: {
      type: [AttachmentSchema],
      default: [],
    },
    submittedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["not_submitted", "submitted", "late", "graded"],
      default: "not_submitted",
    },
    grade: {
      type: Number,
      min: 0,
    },
    feedback: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);


SubmissionSchema.index({ deliverable: 1, student: 1 }, { unique: true });

SubmissionSchema.index({ course: 1, status: 1 });

SubmissionSchema.index({ student: 1, course: 1 });

export default model<ISubmission>("Submission", SubmissionSchema);
