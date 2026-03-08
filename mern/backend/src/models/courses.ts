import mongoose, { Schema, Document } from "mongoose";

// ─── Interfaces ───────────────────────────────────────────────────────────

interface IMaterial {
  title: string;
  type: "pdf" | "video" | "link" | "text" | "image";
  url: string;
  sizeBytes?: number;
  uploadedAt: Date;
  vectorIndexId?: string;
  isIndexed: boolean;
}

interface IModule {
  title: string;
  description?: string;
  order: number;
  materials: IMaterial[];
  createdAt: Date;
}

interface IEnrollment {
  student: mongoose.Types.ObjectId;
  enrolledAt: Date;
  status: "active" | "dropped";
}

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
