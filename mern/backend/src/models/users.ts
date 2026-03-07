import mongoose, { Schema, Document } from "mongoose";

// this is the user schema, it includes fields for both email/password and google oauth authentication


export interface IUser extends Document {
  name: string;
  email: string;

  // authentication
  password?: string;
  googleId?: string;

  // course relationships
  enrolledCourses: mongoose.Types.ObjectId[];
  teachingCourses: mongoose.Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: false, // only for email login
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true, // allows multiple null values
    },

    enrolledCourses: [
      {
        type: Schema.Types.ObjectId,
        ref: "Course",
      },
    ],

    teachingCourses: [
      {
        type: Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);