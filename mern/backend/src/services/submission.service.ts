import Submission, { ISubmission, SubmissionStatus } from "../models/submission.model";
import { Types } from "mongoose";

// ─── Upsert submission (create or replace) ────────────────────────────────────

export const upsertSubmission = async (data: {
  deliverableId: string | Types.ObjectId;
  studentId: string | Types.ObjectId;
  courseId: string | Types.ObjectId;
  fileUrl: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
}): Promise<ISubmission> => {
  const filter = {
    deliverable: data.deliverableId,
    student: data.studentId,
  };

  const update = {
    $set: {
      deliverable: data.deliverableId,
      student: data.studentId,
      course: data.courseId,
      status: "submitted" as SubmissionStatus,
      submittedAt: new Date(),
    },
    $push: {
      attachments: {
        fileName: data.fileName,
        url: data.fileUrl,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        uploadedAt: new Date(),
      },
    },
  };

  // If submission exists, we replace attachments completely (one file only)
  const existing = await Submission.findOne(filter);
  if (existing) {
    existing.attachments = [
      {
        fileName: data.fileName,
        url: data.fileUrl,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        uploadedAt: new Date(),
      } as any,
    ];
    existing.status = "submitted";
    existing.submittedAt = new Date();
    return existing.save();
  }

  return Submission.create({
    deliverable: data.deliverableId,
    student: data.studentId,
    course: data.courseId,
    status: "submitted" as SubmissionStatus,
    submittedAt: new Date(),
    attachments: [
      {
        fileName: data.fileName,
        url: data.fileUrl,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        uploadedAt: new Date(),
      },
    ],
  });
};

// ─── Read ─────────────────────────────────────────────────────────────────────

export const getSubmissionByDeliverableAndStudent = async (
  deliverableId: string,
  studentId: string
): Promise<ISubmission | null> => {
  return Submission.findOne({ deliverable: deliverableId, student: studentId });
};

export const getSubmissionsByDeliverable = async (
  deliverableId: string
): Promise<ISubmission[]> => {
  return Submission.find({ deliverable: deliverableId })
    .populate("student", "name email")
    .sort({ submittedAt: -1 });
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteSubmissionsByDeliverable = async (
  deliverableId: string
): Promise<number> => {
  const result = await Submission.deleteMany({ deliverable: deliverableId });
  return result.deletedCount;
};
