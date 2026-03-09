import { Schema, Document, model, Types } from "mongoose";

export interface IMaterial extends Document {
  title: string;
  type: "pdf" | "video" | "link" | "text" | "image";
  url: string;
  sizeBytes?: number;
  uploadedAt: Date;
  vectorIndexId?: string;
  isIndexed: boolean;
  module: Types.ObjectId; // FK to Module
}

const MaterialSchema = new Schema<IMaterial>(
  {
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ["pdf", "video", "link", "text", "image"],
      required: true,
    },
    url: { type: String, required: true },
    sizeBytes: { type: Number },
    uploadedAt: { type: Date, default: Date.now },
    vectorIndexId: { type: String },
    isIndexed: { type: Boolean, default: false },
    module: { type: Schema.Types.ObjectId, ref: "Module", required: true },
  },
  { timestamps: true }
);

export default model<IMaterial>("Material", MaterialSchema);