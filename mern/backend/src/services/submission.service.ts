import Submission, {
  ISubmission,
  ISubmissionComment,
  SubmissionCommentScope,
  SubmissionStatus,
} from "../models/submission.model";
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
  return Submission.findOne({ deliverable: deliverableId, student: studentId })
    .populate("privateComments.author", "name email")
    .populate("classComments.author", "name email");
};

export const getSubmissionsByDeliverable = async (
  deliverableId: string
): Promise<ISubmission[]> => {
  return Submission.find({ deliverable: deliverableId })
    .populate("student", "name email")
    .populate("privateComments.author", "name email")
    .populate("classComments.author", "name email")
    .sort({ submittedAt: -1 });
};

export const getSubmissionById = async (
  submissionId: string
): Promise<ISubmission | null> => {
  return Submission.findById(submissionId)
    .populate("student", "name email")
    .populate("privateComments.author", "name email")
    .populate("classComments.author", "name email");
};

export const addCommentToSubmission = async (data: {
  submissionId: string;
  authorId: string | Types.ObjectId;
  scope: SubmissionCommentScope;
  text: string;
}): Promise<ISubmission | null> => {
  const field = data.scope === "private" ? "privateComments" : "classComments";

  return Submission.findByIdAndUpdate(
    data.submissionId,
    {
      $push: {
        [field]: {
          author: data.authorId,
          text: data.text,
        },
      },
    },
    { new: true, runValidators: true }
  )
    .populate("student", "name email")
    .populate("privateComments.author", "name email")
    .populate("classComments.author", "name email");
};

export const ensureSubmissionThread = async (data: {
  deliverableId: string | Types.ObjectId;
  studentId: string | Types.ObjectId;
  courseId: string | Types.ObjectId;
}): Promise<ISubmission> => {
  const existing = await Submission.findOne({
    deliverable: data.deliverableId,
    student: data.studentId,
  })
    .populate("student", "name email")
    .populate("privateComments.author", "name email")
    .populate("classComments.author", "name email");

  if (existing) return existing;

  const created = await Submission.create({
    deliverable: data.deliverableId,
    student: data.studentId,
    course: data.courseId,
    status: "not_submitted" as SubmissionStatus,
    attachments: [],
  });

  const hydrated = await Submission.findById(created._id)
    .populate("student", "name email")
    .populate("privateComments.author", "name email")
    .populate("classComments.author", "name email");

  return hydrated as ISubmission;
};

export const setSubmissionGrade = async (data: {
  submissionId: string;
  grade: number;
}): Promise<ISubmission | null> => {
  return Submission.findByIdAndUpdate(
    data.submissionId,
    {
      $set: {
        grade: data.grade,
        status: "graded" as SubmissionStatus,
      },
    },
    { new: true, runValidators: true }
  )
    .populate("student", "name email")
    .populate("privateComments.author", "name email")
    .populate("classComments.author", "name email");
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteSubmissionsByDeliverable = async (
  deliverableId: string
): Promise<number> => {
  const result = await Submission.deleteMany({ deliverable: deliverableId });
  return result.deletedCount;
};
