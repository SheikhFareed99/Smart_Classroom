import { Schema, Document, model, Types } from "mongoose";
import { AttachmentSchema, IAttachment } from "./deliverable_subdocuments/attachment.subdoc";

export type DeliverableStatus = "draft" | "published";

export interface IDeliverable extends Document {
  title: string;
  description?: string;
  course: Types.ObjectId;         // ref: "Course"
  attachments: IAttachment[];     
  deadline?: Date;
  totalPoints: number;
  status: DeliverableStatus;
  createdAt: Date;
  updatedAt: Date;
}

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
  },
  { timestamps: true }
);

// Fast listing: all deliverables for a course filtered by status
DeliverableSchema.index({ course: 1, status: 1 });
// Sort by deadline when rendering the assignments list
DeliverableSchema.index({ course: 1, deadline: 1 });

export default model<IDeliverable>("Deliverable", DeliverableSchema);
