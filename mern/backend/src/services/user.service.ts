import User, { IUser } from "../models/users.model";
import Course from "../models/course.model";
import bcrypt from "bcrypt";
import { Profile } from "passport-google-oauth20";

// Find user by ID
export const findUserById = async (userId: string): Promise<IUser | null> => {
  return User.findById(userId).select("-password");
};

// Find user by email
export const findUserByEmail = async (email: string): Promise<IUser | null> => {
  return User.findOne({ email });
};

// Find user by Google ID
export const findUserByGoogleId = async (googleId: string): Promise<IUser | null> => {
  return User.findOne({ googleId });
};

// Create user with local (email/password) authentication
export const createLocalUser = async (
  name: string,
  email: string,
  password: string
): Promise<IUser> => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({
    name,
    email,
    password: hashedPassword,
    enrolledCourses: [],
    teachingCourses: [],
  });
  console.log("Created new local user:", newUser.email);
  return newUser;
};

// Create user from Google OAuth profile
export const createGoogleUser = async (profile: Profile): Promise<IUser> => {
  const newUser = await User.create({
    name: profile.displayName,
    email: profile.emails?.[0]?.value,
    googleId: profile.id,
    enrolledCourses: [],
    teachingCourses: [],
  });
  console.log("Created new Google user:", newUser.email);
  return newUser;
};

// Link Google account to existing user
export const linkGoogleAccount = async (user: IUser, googleId: string): Promise<IUser> => {
  user.googleId = googleId;
  await user.save();
  console.log("Linked Google account to existing user:", user.email);
  return user;
};

// Verify password for local authentication
export const verifyPassword = async (
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

// Get all users
export const getAllUsers = async (): Promise<IUser[]> => {
  return User.find().select("-password");
};

// Update user
export const updateUser = async (
  userId: string,
  updates: Partial<Pick<IUser, "name" | "email">>
): Promise<IUser | null> => {
  return User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  }).select("-password");
};

// Delete user and clean up related data
export const deleteUser = async (userId: string): Promise<boolean> => {
  const user = await User.findById(userId);
  if (!user) return false;

  // Remove user from all course enrollments
  await Course.updateMany(
    { "enrollments.student": user._id },
    { $pull: { enrollments: { student: user._id } } }
  );

  // Remove user as instructor from courses
  await Course.updateMany(
    { instructor: user._id },
    { $unset: { instructor: "" } }
  );

  await user.deleteOne();
  console.log("Deleted user:", user.email);
  return true;
};

// Get user's courses (both enrolled and teaching)
export const getUserCourses = async (userId: string) => {
  const enrolledCourses = await Course.find({
    "enrollments.student": userId,
  }).populate("instructor", "name email");

  const teachingCourses = await Course.find({
    instructor: userId,
  });

  return { enrolledCourses, teachingCourses };
};
