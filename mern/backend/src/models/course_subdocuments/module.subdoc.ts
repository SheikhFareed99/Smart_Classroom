import { Schema } from "mongoose";
import { IMaterial, MaterialSchema } from "./material.subdoc";

// this is the module schema, it represents a course module containing materials (embedded in Course)


export interface IModule {
  title: string;
  description?: string;
  order: number;
  materials: IMaterial[];
  createdAt: Date;
}

export const ModuleSchema = new Schema<IModule>(
  {
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

    order: {
      type: Number,
      default: 0,
    },

    materials: [MaterialSchema],

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);