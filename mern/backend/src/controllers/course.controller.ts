import { Request, Response } from "express";


import * as CourseService from "../services/course.service";
import * as EnrollmentService from "../services/enrollment.service";
import * as DeliverableService from "../services/deliverable.service";
import * as SubmissionService from "../services/submission.service";
import ExcelJS from "exceljs";



// POST /api/courses
export const createCourse = async (req: Request, res: Response) => {
  try {
    const { title, description, courseCode } = req.body;
    const instructorId = String((req.user as any)?._id || "");

    if (!instructorId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const course = await CourseService.createCourse({ title, description, courseCode, instructorId });
    res.status(201).json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create course", error });
  }
};

// GET /api/courses/:id
export const getCourse = async (req: Request, res: Response) => {
  try {
    const course = await CourseService.findCourseByIdPopulated(String(req.params.id));

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const enrollments = await EnrollmentService.getCourseEnrollments(course._id.toString());

    res.status(200).json({
      success: true,
      course: {
        ...course.toObject(),
        enrollments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get course", error });
  }
};

// POST /api/courses/join
export const joinCourse = async (req: Request, res: Response) => {
  try {
    const { inviteCode } = req.body;
    const studentId = String((req.user as any)?._id || "");

    if (!studentId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const course = await CourseService.findCourseByInviteCode(inviteCode);

    if (!course) {
      return res.status(404).json({ success: false, message: "Invalid invite code" });
    }

    const alreadyEnrolled = await EnrollmentService.isStudentEnrolled(course._id.toString(), studentId);

    if (alreadyEnrolled) {
      return res.status(400).json({ success: false, message: "Already enrolled" });
    }

    const enrollment = await EnrollmentService.enrollStudent(course._id.toString(), studentId);

    res.status(200).json({
      success: true,
      message: "Joined successfully",
      enrollment,
      course,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to join course", error });
  }
};

// DELETE /api/courses/:id
export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const courseId = String(req.params.id);
    const course = await CourseService.findCourseById(courseId);

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    await EnrollmentService.removeAllCourseEnrollments(course._id.toString());
    await CourseService.deleteCourse(courseId);

    res.status(200).json({ success: true, message: "Course deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete course", error });
  }
};

// POST /api/courses/:id/leave
export const leaveCourse = async (req: Request, res: Response) => {
  try {
    const courseId = String(req.params.id);
    const studentId = String((req.user as any)?._id || "");

    if (!studentId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const course = await CourseService.findCourseById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    const result = await EnrollmentService.unenrollStudent(courseId, studentId);
    if (!result) return res.status(400).json({ success: false, message: "Not enrolled or already dropped" });

    res.status(200).json({ success: true, message: "Left course" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to leave course", error });
  }
};

// DELETE /api/courses/:id/students/:studentId
export const removeStudentFromCourse = async (req: Request, res: Response) => {
  try {
    const courseId = String(req.params.id);
    const studentId = String(req.params.studentId);

    const course = await CourseService.findCourseById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    const removed = await EnrollmentService.removeEnrollment(courseId, studentId);
    if (!removed) return res.status(400).json({ success: false, message: "Student not found in course" });

    res.status(200).json({ success: true, message: "Student removed" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to remove student", error });
  }
};

// GET /api/courses/user/:userId
export const getMyCourses = async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
     const sessionUserId = String((req.user as any)?._id || "");

    if (!sessionUserId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    if (sessionUserId !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const teaching = await CourseService.getCoursesByInstructor(userId);
    const enrollments = await EnrollmentService.getStudentEnrollments(userId);
    const enrolled = enrollments.map((e) => e.course).filter((c) => !!c);

    res.status(200).json({ success: true, teaching, enrolled });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get courses", error });
  }
};

// GET /api/courses/:id/marksheet
export const exportMarksheet = async (req: Request, res: Response) => {
  try {
    const courseId = String(req.params.id);
    const sessionUserId = String((req.user as any)?._id || "");

    if (!sessionUserId) return res.status(401).json({ success: false, message: "Not authenticated" });

    const course = await CourseService.findCourseByIdPopulated(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    // Only instructor may export marksheet
    const instructorId = String((course as any).instructor?._id || (course as any).instructor || "");
    if (instructorId !== sessionUserId) return res.status(403).json({ success: false, message: "Forbidden" });

    // Get published deliverables for the course
    const allDeliverables = await DeliverableService.getDeliverablesByCourse(courseId);
    const deliverables = allDeliverables.filter((d: any) => d.status === "published");

    // Get enrolled students
    const enrollments = await EnrollmentService.getCourseEnrollments(courseId);
    const students = enrollments.map((e: any) => e.student).filter((s: any) => !!s);

    // Build submissions map: deliverableId -> Map(studentId -> grade)
    const subsByDeliverable: Record<string, Record<string, number | null>> = {};
    for (const d of deliverables) {
      const subs = await SubmissionService.getSubmissionsByDeliverable(String(d._id));
      const map: Record<string, number | null> = {};
      subs.forEach((s: any) => {
        map[String(s.student?._id || s.student)] = typeof s.grade === "number" ? s.grade : null;
      });
      subsByDeliverable[String(d._id)] = map;
    }

    const format = String(req.query.format || "").toLowerCase();

    // XLSX export
    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Marksheet");

      const headerCols = ["Student ID", "Student Name", "Email"];
      const deliverableCols = deliverables.map((d: any) => `${d.title} (${d.totalPoints})`);
      const allCols = headerCols.concat(deliverableCols).concat(["Total Obtained", "Total Possible"]);

      worksheet.columns = allCols.map((col) => ({ header: col, key: col, width: Math.max(12, String(col).length + 2) }));

      // Style header
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true } as any;
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD3D3D3" } } as any;

      const totalPossible = deliverables.reduce((s: number, d: any) => s + (d.totalPoints || 0), 0);

      for (const stu of students) {
        const rowObj: Record<string, any> = {};
        rowObj["Student ID"] = String(stu._id || "");
        rowObj["Student Name"] = stu.name || "";
        rowObj["Email"] = stu.email || "";

        let obtainedSum = 0;
        for (const d of deliverables) {
          const colKey = `${d.title} (${d.totalPoints})`;
          const map = subsByDeliverable[String(d._id)] || {};
          const grade = map[String(stu._id)] ?? null;
          if (grade === null || grade === undefined) {
            rowObj[colKey] = "-";
          } else {
            rowObj[colKey] = Number(grade);
            obtainedSum += Number(grade) || 0;
          }
        }

        rowObj["Total Obtained"] = obtainedSum;
        rowObj["Total Possible"] = totalPossible;

        worksheet.addRow(rowObj);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `marksheet_${(course as any).courseCode || courseId}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.status(200).send(buffer);
    }

    // CSV helpers
    function csvEscape(v: any) {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }

    const headerCols = ["Student ID", "Student Name", "Email"];
    const deliverableCols = deliverables.map((d: any) => `${d.title} (${d.totalPoints})`);
    const allCols = headerCols.concat(deliverableCols).concat(["Total Obtained", "Total Possible"]);

    const rows: string[] = [];
    rows.push(allCols.map(csvEscape).join(","));

    const totalPossible = deliverables.reduce((s: number, d: any) => s + (d.totalPoints || 0), 0);

    for (const stu of students) {
      const row: any[] = [];
      row.push(String(stu._id || ""));
      row.push(stu.name || "");
      row.push(stu.email || "");

      let obtainedSum = 0;
      for (const d of deliverables) {
        const map = subsByDeliverable[String(d._id)] || {};
        const grade = map[String(stu._id)] ?? null;
        if (grade === null || grade === undefined) {
          row.push("-");
        } else {
          row.push(String(grade));
          obtainedSum += Number(grade) || 0;
        }
      }

      row.push(String(obtainedSum));
      row.push(String(totalPossible));

      rows.push(row.map(csvEscape).join(","));
    }

    const csv = rows.join("\n");
    const filename = `marksheet_${(course as any).courseCode || courseId}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to export marksheet", error });
  }
};