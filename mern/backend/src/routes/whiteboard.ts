import express, { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import Whiteboard from "../models/Whiteboard";

const router = express.Router();

// POST /create - Creates a new whiteboard for a student.
router.post("/create", async (req: Request, res: Response) => {
  try {
    const { studentID, title } = req.body;

    const whiteboard = await Whiteboard.create({
      whiteboardID: uuidv4(),
      studentID,
      title,
    });

    return res.status(201).json(whiteboard);
  } catch (error: any) {
    return res.status(500).json({
      message: "Server error",
      error: error?.message,
    });
  }
});

// GET /student/:studentID - Returns all whiteboards for a specific student.
router.get("/student/:studentID", async (req: Request, res: Response) => {
  try {
    const { studentID } = req.params;
    const whiteboards = await Whiteboard.find({ studentID });

    return res.status(200).json(whiteboards);
  } catch (error: any) {
    return res.status(500).json({
      message: "Server error",
      error: error?.message,
    });
  }
});

// GET /:whiteboardID - Returns one whiteboard with full dataJSON for canvas restore.
router.get("/:whiteboardID", async (req: Request, res: Response) => {
  try {
    const { whiteboardID } = req.params;
    const whiteboard = await Whiteboard.findOne({ whiteboardID });

    if (!whiteboard) {
      return res.status(404).json({ message: "Whiteboard not found" });
    }

    return res.status(200).json(whiteboard);
  } catch (error: any) {
    return res.status(500).json({
      message: "Server error",
      error: error?.message,
    });
  }
});

// POST /:whiteboardID/save - Saves the current Fabric.js canvas JSON string.
router.post("/:whiteboardID/save", async (req: Request, res: Response) => {
  try {
    const { whiteboardID } = req.params;
    const { dataJSON } = req.body;

    const whiteboard = await Whiteboard.findOneAndUpdate(
      { whiteboardID },
      {
        dataJSON,
        lastSavedAt: new Date(),
      },
      { new: true }
    );

    if (!whiteboard) {
      return res.status(404).json({ message: "Whiteboard not found" });
    }

    return res.status(200).json(whiteboard);
  } catch (error: any) {
    return res.status(500).json({
      message: "Server error",
      error: error?.message,
    });
  }
});

// PATCH /:whiteboardID/rename - Updates the title of a whiteboard.
router.patch("/:whiteboardID/rename", async (req: Request, res: Response) => {
  try {
    const { whiteboardID } = req.params;
    const { title } = req.body;

    const whiteboard = await Whiteboard.findOneAndUpdate(
      { whiteboardID },
      { title },
      { new: true }
    );

    if (!whiteboard) {
      return res.status(404).json({ message: "Whiteboard not found" });
    }

    return res.status(200).json(whiteboard);
  } catch (error: any) {
    return res.status(500).json({
      message: "Server error",
      error: error?.message,
    });
  }
});

// DELETE /:whiteboardID - Deletes a whiteboard document.
router.delete("/:whiteboardID", async (req: Request, res: Response) => {
  try {
    const { whiteboardID } = req.params;
    const whiteboard = await Whiteboard.findOneAndDelete({ whiteboardID });

    if (!whiteboard) {
      return res.status(404).json({ message: "Whiteboard not found" });
    }

    return res.status(200).json({ message: "Whiteboard deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({
      message: "Server error",
      error: error?.message,
    });
  }
});

export default router;