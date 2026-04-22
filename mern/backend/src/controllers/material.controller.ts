import { Request, Response } from "express";
import multer from "multer";
import * as ModuleService from "../services/module.service";
import * as MaterialService from "../services/material.service";
import * as CourseService from "../services/course.service";
import { uploadBuffer, blobPathFromUrl, deleteBlob } from "../services/azure.service";

// ─── Multer ───────────────────────────────────────────────────────────────────

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/png",
      "image/jpeg",
      "video/mp4",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Express 5 params are typed as string | string[] — always normalise to string
const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

function getUID(req: Request): string {
  return String((req.user as any)?._id || "");
}

function mimeToMaterialType(mime: string): "pdf" | "video" | "image" | "text" {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/"))  return "video";
  if (mime.startsWith("image/"))  return "image";
  return "text";
}

async function verifyInstructorOwns(courseId: string, instructorId: string) {
  const course = await CourseService.findCourseById(courseId);
  if (!course) throw Object.assign(new Error("Course not found"), { status: 404 });
  if (course.instructor.toString() !== instructorId)
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  return course;
}

// ═══════════════════════════════════════════════════════════════════
//  MODULE ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// POST /api/courses/:courseId/modules
export const createModule = async (req: Request, res: Response) => {
  try {
    const instructorId = getUID(req);
    if (!instructorId)
      return res.status(401).json({ success: false, message: "Not authenticated" });

    const courseId = p(req.params.courseId);
    await verifyInstructorOwns(courseId, instructorId);

    const { title, description } = req.body;
    if (!title)
      return res.status(400).json({ success: false, message: "Module title is required" });

    const module = await ModuleService.createModule({ title, description, courseId });
    return res.status(201).json({ success: true, module });
  } catch (err: any) {
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// GET /api/courses/:courseId/modules
export const listModules = async (req: Request, res: Response) => {
  try {
    const courseId = p(req.params.courseId);
    const modules  = await ModuleService.getModulesByCourse(courseId);
    return res.status(200).json({ success: true, modules });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/courses/:courseId/modules/:moduleId  (cascade deletes all materials)
export const deleteModule = async (req: Request, res: Response) => {
  try {
    const instructorId = getUID(req);
    if (!instructorId)
      return res.status(401).json({ success: false, message: "Not authenticated" });

    const courseId = p(req.params.courseId);
    const moduleId = p(req.params.moduleId);
    await verifyInstructorOwns(courseId, instructorId);

    // Delete all blob files for materials in this module
    const materials = await MaterialService.getMaterialsByModule(moduleId);
    for (const mat of materials) {
      const path = blobPathFromUrl(mat.url);
      if (path) await deleteBlob(path);
    }

    await MaterialService.deleteMaterialsByModule(moduleId);
    await ModuleService.deleteModule(moduleId);

    return res.status(200).json({ success: true, message: "Module and all its materials deleted" });
  } catch (err: any) {
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════
//  MATERIAL ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// POST /api/courses/:courseId/modules/:moduleId/materials
export const uploadMaterial = async (req: Request, res: Response) => {
  try {
    const instructorId = getUID(req);
    if (!instructorId)
      return res.status(401).json({ success: false, message: "Not authenticated" });

    const courseId = p(req.params.courseId);
    const moduleId = p(req.params.moduleId);
    await verifyInstructorOwns(courseId, instructorId);

    const mod = await ModuleService.findModuleById(moduleId);
    if (!mod || mod.course.toString() !== courseId)
      return res.status(404).json({ success: false, message: "Module not found in this course" });

    if (!req.file)
      return res.status(400).json({ success: false, message: "File is required" });

    const { title } = req.body;
    const materialTitle = (title as string) || req.file.originalname;
    const matType       = mimeToMaterialType(req.file.mimetype);

    const blobPath = `courses/${courseId}/modules/${moduleId}/materials/${Date.now()}_${req.file.originalname}`;
    const url      = await uploadBuffer(req.file.buffer, blobPath, req.file.mimetype);

    const material = await MaterialService.createMaterial({
      title: materialTitle,
      type:  matType,
      url,
      moduleId,
      sizeBytes: req.file.size,
    });

    // ── Trigger AI backend ingestion (fire-and-forget) ────────────────────────
    const AI_BACKEND = process.env.AI_BACKEND_URL || "http://localhost:8000";
    const ingestibleTypes = ["pdf", "text"]; // the types ai_backend can process
    if (ingestibleTypes.includes(matType)) {
      import("axios")
        .then(({ default: axios }) =>
          axios.post(
            `${AI_BACKEND}/ingest-async`,
            { url, book_name: materialTitle },
            { timeout: 10_000 }
          )
        )
        .then(() => {
          // Mark as indexed once the request is accepted by AI backend
          return MaterialService.markAsIndexed(String(material._id), materialTitle);
        })
        .catch((err: any) => {
          console.error("AI ingest trigger failed:", err?.message || err);
        });
    }
    // ─────────────────────────────────────────────────────────────────────────

    return res.status(201).json({ success: true, material });
  } catch (err: any) {
    console.error("uploadMaterial:", err);
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
};


// GET /api/courses/:courseId/modules/:moduleId/materials
export const listMaterialsByModule = async (req: Request, res: Response) => {
  try {
    const moduleId  = p(req.params.moduleId);
    const materials = await MaterialService.getMaterialsByModule(moduleId);
    return res.status(200).json({ success: true, materials });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/courses/:courseId/materials  (all materials across all modules)
export const listAllMaterialsByCourse = async (req: Request, res: Response) => {
  try {
    const courseId  = p(req.params.courseId);
    const materials = await MaterialService.getMaterialsByCourse(courseId);
    return res.status(200).json({ success: true, materials });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/courses/:courseId/modules/:moduleId/materials/:materialId
export const deleteMaterial = async (req: Request, res: Response) => {
  try {
    const instructorId = getUID(req);
    if (!instructorId)
      return res.status(401).json({ success: false, message: "Not authenticated" });

    const courseId   = p(req.params.courseId);
    const materialId = p(req.params.materialId);
    await verifyInstructorOwns(courseId, instructorId);

    const material = await MaterialService.findMaterialById(materialId);
    if (!material)
      return res.status(404).json({ success: false, message: "Material not found" });

    const path = blobPathFromUrl(material.url);
    if (path) await deleteBlob(path);

    await MaterialService.deleteMaterial(materialId);
    return res.status(200).json({ success: true, message: "Material deleted" });
  } catch (err: any) {
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
};
