import express from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  createStudentEvent,
  deleteStudentEvent,
  listStudentEvents,
  updateStudentEvent,
} from "../controllers/studentEvent.controller";

const router = express.Router();

router.use(requireAuth);

router.get("/", listStudentEvents);
router.post("/", createStudentEvent);
router.patch("/:id", updateStudentEvent);
router.delete("/:id", deleteStudentEvent);

export default router;
