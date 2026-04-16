import express from "express";
import { requireAuth, requireSameUserFromParam } from "../middleware/auth.middleware";
import { createAnnouncement, listAnnouncementsByCourse, addCommentToAnnouncement } from "../controllers/announcement.controller";

const router = express.Router();

router.post("/courses/:courseId/announcements", requireAuth, createAnnouncement);
router.get("/courses/:courseId/announcements", requireAuth, listAnnouncementsByCourse);
router.post("/announcements/:announcementId/comments", requireAuth, addCommentToAnnouncement);

export default router;