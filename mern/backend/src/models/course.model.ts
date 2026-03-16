import mongoose, { Schema, Document, model } from "mongoose";

// ── Sub-interfaces (add fields as needed) ─────────────────
export interface IEnrollment {
  student:    mongoose.Types.ObjectId;
  enrolledAt: Date;
}

export interface IModule {
  title:   string;
  content: string;
  order:   number;
}

export interface ICourse extends Document {
  title:       string;
  description?: string;
  courseCode:  string;
  instructor:  mongoose.Types.ObjectId;
  enrollments: IEnrollment[];
  inviteCode:  string;
  modules:     IModule[];
  isArchived:  boolean;
  settings: {
    allowStudentQuestions: boolean;
    pomodoroDefault: {
      focusMinutes: number;
      breakMinutes: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    title: {
      type: String, required: true, trim: true,
    },
    description: {
      type: String, trim: true,
    },
    courseCode: {
      type: String, required: true, unique: true, uppercase: true,
    },
    instructor: {
      type: Schema.Types.ObjectId, ref: "User", required: true,
    },
    inviteCode: {
      type: String, required: true, unique: true,
    },
    isArchived: {
      type: Boolean, default: false,
    },
    settings: {
      allowStudentQuestions: { type: Boolean, default: true },
      allowStudentComments:  { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export default model<ICourse>("Course", CourseSchema);