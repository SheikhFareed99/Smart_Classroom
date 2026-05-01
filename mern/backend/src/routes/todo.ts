import express from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { getStudentTodo } from "../controllers/todo.controller";

const router = express.Router();

router.use(requireAuth);

// GET /api/todo — student's aggregated to-do list across all enrolled courses
router.get("/", getStudentTodo);

export default router;
