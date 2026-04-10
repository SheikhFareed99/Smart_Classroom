import express from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  upload,
  createDeliverable,
  listDeliverables,
  getDeliverable,
  deleteDeliverable,
  submitAssignment,
  listSubmissions,
} from "../controllers/deliverable.controller";

const router = express.Router();

router.use(requireAuth);

// ── Per-course assignment routes ──────────────────────────────────────────────
// POST   /api/courses/:courseId/deliverables          — teacher creates
// GET    /api/courses/:courseId/deliverables          — list all
router
  .route("/courses/:courseId/deliverables")
  .post(upload.single("file"), createDeliverable)
  .get(listDeliverables);

// ── Per-deliverable routes ────────────────────────────────────────────────────
// GET    /api/deliverables/:deliverableId             — get single + own submission
// DELETE /api/deliverables/:deliverableId             — teacher deletes
router
  .route("/deliverables/:deliverableId")
  .get(getDeliverable)
  .delete(deleteDeliverable);

// POST   /api/deliverables/:deliverableId/submit      — student submits file
router.post("/deliverables/:deliverableId/submit", upload.single("file"), submitAssignment);

// GET    /api/deliverables/:deliverableId/submissions — teacher views all submissions
router.get("/deliverables/:deliverableId/submissions", listSubmissions);

export default router;
