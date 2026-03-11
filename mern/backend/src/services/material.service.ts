import Material, { IMaterial } from "../models/material.model";
import { Types } from "mongoose";

// Find material by ID
export const findMaterialById = async (materialId: string): Promise<IMaterial | null> => {
  return Material.findById(materialId);
};

// Find material by ID with module populated
export const findMaterialByIdPopulated = async (materialId: string): Promise<IMaterial | null> => {
  return Material.findById(materialId).populate("module", "title course");
};

// Get all materials for a module
export const getMaterialsByModule = async (moduleId: string): Promise<IMaterial[]> => {
  return Material.find({ module: moduleId }).sort({ uploadedAt: 1 });
};

// Get all materials for a course (via modules)
export const getMaterialsByCourse = async (courseId: string): Promise<IMaterial[]> => {
  // First get all module IDs for this course
  const Module = (await import("../models/module.model")).default;
  const modules = await Module.find({ course: courseId }).select("_id");
  const moduleIds = modules.map((m) => m._id);

  return Material.find({ module: { $in: moduleIds } })
    .populate("module", "title order")
    .sort({ "module.order": 1, uploadedAt: 1 });
};

// Create a new material
export const createMaterial = async (data: {
  title: string;
  type: IMaterial["type"];
  url: string;
  moduleId: string | Types.ObjectId;
  sizeBytes?: number;
}): Promise<IMaterial> => {
  const material = await Material.create({
    title: data.title,
    type: data.type,
    url: data.url,
    module: data.moduleId,
    sizeBytes: data.sizeBytes,
    uploadedAt: new Date(),
    isIndexed: false,
  });

  console.log("Created new material:", material.title);
  return material;
};

// Update material
export const updateMaterial = async (
  materialId: string,
  updates: Partial<Pick<IMaterial, "title" | "type" | "url" | "sizeBytes">>
): Promise<IMaterial | null> => {
  return Material.findByIdAndUpdate(materialId, updates, { new: true, runValidators: true });
};

// Delete material
export const deleteMaterial = async (materialId: string): Promise<IMaterial | null> => {
  return Material.findByIdAndDelete(materialId);
};

// Delete all materials for a module
export const deleteMaterialsByModule = async (moduleId: string): Promise<number> => {
  const result = await Material.deleteMany({ module: moduleId });
  return result.deletedCount;
};

// Mark material as indexed (for vector search)
export const markAsIndexed = async (
  materialId: string,
  vectorIndexId: string
): Promise<IMaterial | null> => {
  return Material.findByIdAndUpdate(
    materialId,
    { isIndexed: true, vectorIndexId },
    { new: true }
  );
};

// Get unindexed materials
export const getUnindexedMaterials = async (limit = 50): Promise<IMaterial[]> => {
  return Material.find({ isIndexed: false })
    .limit(limit)
    .sort({ uploadedAt: 1 });
};

// Get materials by type
export const getMaterialsByType = async (
  moduleId: string,
  type: IMaterial["type"]
): Promise<IMaterial[]> => {
  return Material.find({ module: moduleId, type });
};

// Count materials in a module
export const countMaterialsByModule = async (moduleId: string): Promise<number> => {
  return Material.countDocuments({ module: moduleId });
};

// Get total size of materials in a module
export const getTotalSizeByModule = async (moduleId: string): Promise<number> => {
  const result = await Material.aggregate([
    { $match: { module: new Types.ObjectId(moduleId) } },
    { $group: { _id: null, totalSize: { $sum: "$sizeBytes" } } },
  ]);
  return result[0]?.totalSize || 0;
};
