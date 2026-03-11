import mongoose, { Schema, Document } from "mongoose";

// this is the module schema, it represents a section/unit within a course

export interface IModule extends Document {
  title: string;
  description?: string;
  order: number;
  course: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ModuleSchema = new Schema<IModule>(
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

    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IModule>("Module", ModuleSchema);