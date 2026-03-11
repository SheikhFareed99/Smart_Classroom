import { Schema, Document, model, Types } from "mongoose";

export interface IModule extends Document {
  title: string;
  description?: string;
  order: number;
  course: Types.ObjectId; // FK to Course
  createdAt: Date;
}

const ModuleSchema = new Schema<IModule>(
  {
    title: { type: String, required: true },
    description: { type: String },
    order: { type: Number, default: 0 },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  },
  { timestamps: true }
);

export default model<IModule>("Module", ModuleSchema);