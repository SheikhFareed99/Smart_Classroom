import express from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  createStudentTodo,
  deleteStudentTodo,
  listStudentTodos,
  updateStudentTodo,
} from "../controllers/studentTodo.controller";

const router = express.Router();

router.use(requireAuth);

router.get("/", listStudentTodos);
router.post("/", createStudentTodo);
router.patch("/:id", updateStudentTodo);
router.delete("/:id", deleteStudentTodo);

export default router;
