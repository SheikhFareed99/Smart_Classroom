import express from "express";
import axios from "axios";
import { requireAuth } from "../middleware/auth.middleware";
import * as MaterialService from "../services/material.service";

const router = express.Router();
const AI_BACKEND = process.env.AI_BACKEND_URL || "http://localhost:8000";

router.use(requireAuth);

/**
 * GET /api/chatbot/courses/:courseId/materials
 * Returns the list of materials for a course that are already indexed in the
 * vector database.  The namespace used during ingest is the material title, so
 * we fetch all materials for the course and return their titles.
 */
router.get("/courses/:courseId/materials", async (req, res) => {
  try {
    const courseId = req.params.courseId as string;

    // All materials saved for this course
    const materials = await MaterialService.getMaterialsByCourse(courseId);

    // Filter to only those that have been ingested into the vector DB
    // (isIndexed is set to true after successful ingest)
    const indexed = materials.filter((m) => m.isIndexed);

    const list = indexed.map((m) => ({
      _id: m._id,
      title: m.title,
      type: m.type,
      // book_name is what we used as the namespace on ingest (material title)
      book_name: m.title,
    }));

    return res.json({ success: true, materials: list });
  } catch (err: any) {
    console.error("chatbot/materials error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/chatbot/query
 * Body: { book_name: string, query: string, top_k?: number }
 * Proxies to ai_backend POST /query and returns the answer.
 */
router.post("/query", async (req, res) => {
  try {
    const { book_name, query, top_k = 5 } = req.body as {
      book_name: string;
      query: string;
      top_k?: number;
    };

    if (!book_name || !query) {
      return res
        .status(400)
        .json({ success: false, message: "book_name and query are required" });
    }

    const aiRes = await axios.post(
      `${AI_BACKEND}/query`,
      { book_name, query, top_k },
      { timeout: 60_000 }
    );

    return res.json({ success: true, ...aiRes.data });
  } catch (err: any) {
    const detail =
      err?.response?.data?.detail || err?.message || "AI backend error";
    console.error("chatbot/query error:", detail);
    return res.status(502).json({ success: false, message: detail });
  }
});

export default router;
