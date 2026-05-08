import mongoose, { Document, Schema } from "mongoose";

export interface IStudentTodo extends Document {
  student: mongoose.Types.ObjectId;
  text: string;
  completed: boolean;
}

const StudentTodoSchema = new Schema<IStudentTodo>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

StudentTodoSchema.index({ student: 1, createdAt: -1 });

export default mongoose.model<IStudentTodo>("StudentTodo", StudentTodoSchema);
