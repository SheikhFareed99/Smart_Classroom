import Deliverable, { IDeliverable, DeliverableStatus } from "../models/deliverable.model";
import { Types } from "mongoose";

// ─── Create ───────────────────────────────────────────────────────────────────

export const createDeliverable = async (data: {
  title: string;
  description?: string;
  courseId: string | Types.ObjectId;
  deadline?: Date;
  totalPoints?: number;
  status?: DeliverableStatus;
  attachmentUrl?: string;
  attachmentFileName?: string;
  attachmentMimeType?: string;
  attachmentSizeBytes?: number;
}): Promise<IDeliverable> => {
  const docData: any = {
    title: data.title,
    description: data.description,
    course: data.courseId,
    deadline: data.deadline,
    totalPoints: data.totalPoints ?? 100,
    status: data.status ?? "draft",
    attachments: [],
  };

  if (data.attachmentUrl && data.attachmentFileName) {
    docData.attachments = [
      {
        fileName: data.attachmentFileName,
        url: data.attachmentUrl,
        mimeType: data.attachmentMimeType,
        sizeBytes: data.attachmentSizeBytes,
        uploadedAt: new Date(),
      },
    ];
  }

  const deliverable = await Deliverable.create(docData);
  console.log("Created deliverable:", deliverable.title);
  return deliverable;
};

// ─── Read ─────────────────────────────────────────────────────────────────────

export const getDeliverablesByCourse = async (
  courseId: string
): Promise<IDeliverable[]> => {
  return Deliverable.find({ course: courseId }).sort({ createdAt: -1 });
};

export const getDeliverableById = async (
  id: string
): Promise<IDeliverable | null> => {
  return Deliverable.findById(id);
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateDeliverable = async (
  id: string,
  updates: Partial<
    Pick<IDeliverable, "title" | "description" | "deadline" | "totalPoints" | "status">
  >
): Promise<IDeliverable | null> => {
  return Deliverable.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteDeliverable = async (
  id: string
): Promise<IDeliverable | null> => {
  return Deliverable.findByIdAndDelete(id);
};

export const deleteDeliverablesByCourse = async (
  courseId: string
): Promise<number> => {
  const result = await Deliverable.deleteMany({ course: courseId });
  return result.deletedCount;
};
