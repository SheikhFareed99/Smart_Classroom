import express from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  upload,
  createModule,
  listModules,
  deleteModule,
  uploadMaterial,
  listMaterialsByModule,
  listAllMaterialsByCourse,
  deleteMaterial,
} from "../controllers/material.controller";

const router = express.Router();

router.use(requireAuth);

// ── Module routes ─────────────────────────────────────────────────────────────
// POST   /api/courses/:courseId/modules               — teacher creates module
// GET    /api/courses/:courseId/modules               — list all modules
router
  .route("/courses/:courseId/modules")
  .post(createModule)
  .get(listModules);

// DELETE /api/courses/:courseId/modules/:moduleId     — teacher deletes module + cascade materials
router.delete("/courses/:courseId/modules/:moduleId", deleteModule);

// ── Material routes ───────────────────────────────────────────────────────────
// POST   /api/courses/:courseId/modules/:moduleId/materials   — teacher uploads file
// GET    /api/courses/:courseId/modules/:moduleId/materials   — list materials in module
router
  .route("/courses/:courseId/modules/:moduleId/materials")
  .post(upload.single("file"), uploadMaterial)
  .get(listMaterialsByModule);

// DELETE /api/courses/:courseId/modules/:moduleId/materials/:materialId — delete one material
router.delete(
  "/courses/:courseId/modules/:moduleId/materials/:materialId",
  deleteMaterial
);

// GET /api/courses/:courseId/materials — all materials across all modules (student view)
router.get("/courses/:courseId/materials", listAllMaterialsByCourse);

export default router;
