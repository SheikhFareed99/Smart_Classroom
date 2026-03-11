import { Schema, Document, model, Types } from "mongoose";

export interface ICourse extends Document {
  title: string;
  description?: string;
  courseCode: string;
  instructor: Types.ObjectId;
  inviteCode: string;
  isArchived: boolean;
  settings: {
    allowStudentQuestions: boolean;
    allowStudentComments: boolean;
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
      trim: true 
    },
    description: { 
      type: String, 
      trim: true 
    },
    courseCode: { 
      type: String, 
      required: true, 
      unique: true, 
      uppercase: true 
    },
    instructor: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    inviteCode: { 
      type: String,
      required: true, 
      unique: true 
    },
    isArchived: { 
      type: Boolean, 
      default: false 
    },
    settings: {
      allowStudentQuestions: { 
        type: Boolean, 
        default: true 
      },
      allowStudentComments: { 
        type: Boolean, 
        default: true 
      },

      // commenting this out since pomodoro timers r user specific n not course specific
      // pomodoroDefault: {
      //   focusMinutes: { type: Number, default: 25 },
      //   breakMinutes: { type: Number, default: 5 },
      // },
    },
  },
  { timestamps: true }
);

export default model<ICourse>("Course", CourseSchema);


