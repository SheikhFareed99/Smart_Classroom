import { Schema } from "mongoose";


export interface IAttachment {
  fileName: string;
  url: string;        
  mimeType?: string;    // e.g. "application/pdf", "image/png"
  sizeBytes?: number;
  uploadedAt: Date;
}

export const AttachmentSchema = new Schema<IAttachment>(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
    },
    sizeBytes: {
      type: Number,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true } 
);
