import express from "express";
import {
  createCourse,
  getCourse,
  joinCourse,
  deleteCourse,
  getMyCourses,
  leaveCourse,
  removeStudentFromCourse,
} from "../controllers/course.controller";

const router = express.Router();

router.post("/", createCourse);                // create a course
router.get("/user/:userId", getMyCourses);     // get my courses
router.get("/:id", getCourse);                 // get a single course
router.post("/join", joinCourse);              // join via invite code
router.delete("/:id", deleteCourse);           // delete a course
router.post("/:id/leave", leaveCourse);        // leave a course (student)
router.delete("/:id/students/:studentId", removeStudentFromCourse); // remove student (instructor)

export default router;