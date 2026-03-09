import { Schema } from "mongoose";

// this is the material schema, it represents learning materials within a module (embedded in Module)


export interface IMaterial {
  title: string;
  type: "pdf" | "video" | "link" | "text" | "image";
  url: string;
  sizeBytes?: number;
  uploadedAt: Date;
  vectorIndexId?: string;
  isIndexed: boolean;
}

export const MaterialSchema = new Schema<IMaterial>(
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
  },
  { _id: false }
);