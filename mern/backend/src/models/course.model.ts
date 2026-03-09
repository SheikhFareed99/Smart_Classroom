import mongoose, { Schema, Document } from "mongoose";
import { IModule, ModuleSchema } from "./course_subdocuments/module.subdoc";
import { IEnrollment, EnrollmentSchema } from "./course_subdocuments/enrollment.subdoc";

// this is the course schema, it represents a course with modules, enrollments, and settings


export interface ICourse extends Document {
  title: string;
  description?: string;
  courseCode: string;
  instructor: mongoose.Types.ObjectId;
  enrollments: IEnrollment[];
  inviteCode: string;
  modules: IModule[];
  isArchived: boolean;
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
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    courseCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    enrollments: [EnrollmentSchema],

    inviteCode: {
      type: String,
      required: true,
      unique: true,
    },

    modules: [ModuleSchema],

    isArchived: {
      type: Boolean,
      default: false,
    },

    settings: {
      allowStudentQuestions: {
        type: Boolean,
        default: true,
      },
      allowStudentComments:{
        type: Boolean,
        default: true,
      }
    },
  },
  { timestamps: true }
);

CourseSchema.index({ "enrollments.student": 1 });
CourseSchema.index({ instructor: 1 });
CourseSchema.index({ inviteCode: 1 });

export default mongoose.model<ICourse>("Course", CourseSchema);
