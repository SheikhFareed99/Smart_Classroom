import { Schema, Document, model, Types } from "mongoose";
import { AttachmentSchema, IAttachment } from "./deliverable_subdocuments/attachment.subdoc";

export type DeliverableStatus = "draft" | "published";

export interface IDeliverableClassComment {
  author: Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeliverable extends Document {
  title: string;
  description?: string;
  course: Types.ObjectId;         // ref: "Course"
  attachments: IAttachment[];     
  classComments: IDeliverableClassComment[];
  deadline?: Date;
  totalPoints: number;
  status: DeliverableStatus;
  plagiarismLastCheckedAt?: Date;
  plagiarismAutoCheckedAt?: Date;
  plagiarismReport?: {
    generatedAt: Date;
    thresholdPercent: number;
    totalSubmissions: number;
    totalPairs: number;
    flaggedPairs: number;
    pairs: Array<{
      student_a: { id: string; name: string };
      student_b: { id: string; name: string };
      similarity: number;
      flagged: boolean;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DeliverableClassCommentSchema = new Schema<IDeliverableClassComment>(
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
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

const DeliverableSchema = new Schema<IDeliverable>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
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
    classComments: {
      type: [DeliverableClassCommentSchema],
      default: [],
    },
    deadline: {
      type: Date,
    },
    totalPoints: {
      type: Number,
      required: true,
      min: 0,
      default: 100,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    plagiarismLastCheckedAt: {
      type: Date,
    },
    plagiarismAutoCheckedAt: {
      type: Date,
    },
    plagiarismReport: {
      generatedAt: { type: Date },
      thresholdPercent: { type: Number },
      totalSubmissions: { type: Number },
      totalPairs: { type: Number },
      flaggedPairs: { type: Number },
      pairs: {
        type: [
          {
            student_a: {
              id: { type: String },
              name: { type: String },
            },
            student_b: {
              id: { type: String },
              name: { type: String },
            },
            similarity: { type: Number },
            flagged: { type: Boolean },
          },
        ],
        default: [],
      },
    },
  },
  { timestamps: true }
);

// Fast listing: all deliverables for a course filtered by status
DeliverableSchema.index({ course: 1, status: 1 });
// Sort by deadline when rendering the assignments list
DeliverableSchema.index({ course: 1, deadline: 1 });

export default model<IDeliverable>("Deliverable", DeliverableSchema);
