import Module, { IModule } from "../models/module.model";
import { Types } from "mongoose";

// Find module by ID
export const findModuleById = async (moduleId: string): Promise<IModule | null> => {
  return Module.findById(moduleId);
};

// Find module by ID with course populated
export const findModuleByIdPopulated = async (moduleId: string): Promise<IModule | null> => {
  return Module.findById(moduleId).populate("course", "title courseCode");
};

// Get all modules for a course (ordered)
export const getModulesByCourse = async (courseId: string): Promise<IModule[]> => {
  return Module.find({ course: courseId }).sort({ order: 1 });
};

// Create a new module
export const createModule = async (data: {
  title: string;
  description?: string;
  courseId: string | Types.ObjectId;
  order?: number;
}): Promise<IModule> => {
  // If no order specified, put it at the end
  let order = data.order;
  if (order === undefined) {
    const lastModule = await Module.findOne({ course: data.courseId })
      .sort({ order: -1 })
      .select("order");
    order = lastModule ? lastModule.order + 1 : 0;
  }

  const module = await Module.create({
    title: data.title,
    description: data.description,
    course: data.courseId,
    order,
  });

  console.log("Created new module:", module.title);
  return module;
};

// Update module
export const updateModule = async (
  moduleId: string,
  updates: Partial<Pick<IModule, "title" | "description" | "order">>
): Promise<IModule | null> => {
  return Module.findByIdAndUpdate(moduleId, updates, { new: true, runValidators: true });
};

// Delete module
export const deleteModule = async (moduleId: string): Promise<IModule | null> => {
  return Module.findByIdAndDelete(moduleId);
};

// Delete all modules for a course
export const deleteModulesByCourse = async (courseId: string): Promise<number> => {
  const result = await Module.deleteMany({ course: courseId });
  return result.deletedCount;
};

// Reorder modules in a course
export const reorderModules = async (
  courseId: string,
  moduleOrders: { moduleId: string; order: number }[]
): Promise<void> => {
  const bulkOps = moduleOrders.map(({ moduleId, order }) => ({
    updateOne: {
      filter: { _id: moduleId, course: courseId },
      update: { $set: { order } },
    },
  }));

  await Module.bulkWrite(bulkOps);
};

// Count modules in a course
export const countModulesByCourse = async (courseId: string): Promise<number> => {
  return Module.countDocuments({ course: courseId });
};
