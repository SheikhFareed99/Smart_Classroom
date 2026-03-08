import mongoose, { Schema, Document } from "mongoose";

//Ibraheem's note: I debated whether to split materials into a separate collection, but for simplicity and performance (since materials are always accessed in the context of a course), I decided to embed them directly within the course document. This also allows us to maintain the order of materials within modules more easily.
interface IMaterial {
  title: string;
  type: "pdf" | "video" | "link" | "text" | "image";
  url: string;
  sizeBytes?: number;
  uploadedAt: Date;
  vectorIndexId?: string;
  isIndexed: boolean;
}
//Ibraheem's note: I needed Imodule for the courses model, but I didn't want to create a separate file for it since it's only used within the context of a course.
interface IModule {
  title: string;
  description?: string;
  order: number;
  materials: IMaterial[];
  createdAt: Date;
}



//basic enrollment interface to track student enrollments in courses.
interface IEnrollment {
  student: mongoose.Types.ObjectId;
  enrolledAt: Date;
  status: "active" | "dropped";
}


//main course interface
//Ahmed's Notes: Icourse is used for both the course model and course controller, course model interacts with the database and course controller interacts with the API routes.
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



const ModuleSchema = new Schema<IModule>({
  title: { type: String, required: true },
  description: { type: String },
  order: { type: Number, default: 0 },
  //materials: [MaterialSchema],
  createdAt: { type: Date, default: Date.now },
});


const EnrollmentSchema = new Schema<IEnrollment>({
  student: { type: Schema.Types.ObjectId, ref: "User", required: true },
  enrolledAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["active", "dropped"], default: "active" },
});

const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    courseCode: { type: String, required: true, unique: true, uppercase: true },
    instructor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    enrollments: [EnrollmentSchema],
    inviteCode: { type: String, required: true, unique: true },
    modules: [ModuleSchema],
    isArchived: { type: Boolean, default: false },
    settings: {
      allowStudentQuestions: { type: Boolean, default: true },
      pomodoroDefault: {
        focusMinutes: { type: Number, default: 25 },
        breakMinutes: { type: Number, default: 5 },
      },
    },
  },
  { timestamps: true }
);




// ─── Indexes ──────────────────────────────────────────────────────────────

CourseSchema.index({ "enrollments.student": 1 });
CourseSchema.index({ instructor: 1 });
CourseSchema.index({ inviteCode: 1 });

// ─── Model ────────────────────────────────────────────────────────────────

export default mongoose.model<ICourse>("Course", CourseSchema);