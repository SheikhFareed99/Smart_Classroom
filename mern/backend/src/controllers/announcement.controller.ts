import { Request,Response } from "express";

import * as AnnouncementService from "../services/announcement.service";

// POST /api/courses/:courseId/announcements
export const createAnnouncement=async(req:Request,res:Response)=>{
    try {
        const { courseId, text } = req.body;
        const authorId = String((req.user as any)?._id || "");
        
        if (!authorId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }
        
        const announcement = await AnnouncementService.createAnnouncement({ 
            courseId, 
            authorId, 
            text 
        });

        res.status(201).json({ 
            success: true, 
            announcement 
        });

    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: "Failed to create announcement",
            error
             });
    }
};

// GET /api/courses/:courseId/announcements
export const listAnnouncementsByCourse=async(req:Request,res:Response)=>{
    try {
        const courseId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
        const announcements = await AnnouncementService.listAnnouncementsByCourse(courseId);
        
        res.status(200).json({ success: true, announcements });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to list announcements", error });
    }
};



// POST /api/announcements/:announcementId/comments
export const addCommentToAnnouncement=async(req:Request,res:Response)=>{
    try {
        const announcementId = Array.isArray(req.params.announcementId) ? req.params.announcementId[0] : req.params.announcementId;
        const { text } = req.body;
        const authorId = String((req.user as any)?._id || "");
        
        if (!authorId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }
        
        const updatedAnnouncement = await AnnouncementService.addCommentToAnnouncement({
            announcementId,
            authorId,
            text
        });

        if (!updatedAnnouncement) {
            return res.status(404).json({ success: false, message: "Announcement not found" });
        }

        res.status(200).json({ success: true, announcement: updatedAnnouncement });

    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to add comment", error });
    }
};


//Authorization rules:
// Create: only course instructor
// Read: instructor or active enrolled student
// Comment: instructor or active enrolled student