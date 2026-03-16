import mongoose, { Schema, Document } from "mongoose";

// this is the material schema, it represents learning content within a module

export interface IMaterial extends Document {
  title: string;
  type: "pdf" | "video" | "link" | "text" | "image";
  url: string;
  sizeBytes?: number;
  uploadedAt: Date;
  vectorIndexId?: string;
  isIndexed: boolean;
  module: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialSchema = new Schema<IMaterial>(
  {
    title: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["pdf", "video", "link", "text", "image"],
      required: true,
    },

    url: {
      type: String,
      required: true,
    },

    sizeBytes: {
      type: Number,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    vectorIndexId: {
      type: String,
    },

    isIndexed: {
      type: Boolean,
      default: false,
    },

    module: {
      type: Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IMaterial>("Material", MaterialSchema);