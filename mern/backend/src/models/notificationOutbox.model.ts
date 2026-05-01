import mongoose, { Document, Schema } from "mongoose";
import { NotificationChannel, NotificationEventName, NotificationJobStatus } from "../notifications/types";

export interface INotificationOutbox extends Document {
  eventName: NotificationEventName;
  channel: NotificationChannel;
  recipient: {
    email: string;
    userId?: string;
    name?: string;
  };
  payload: Record<string, unknown>;
  idempotencyKey: string;
  status: NotificationJobStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: Date;
  lockedAt?: Date;
  sentAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationOutboxSchema = new Schema<INotificationOutbox>(
  {
    eventName: {
      type: String,
      required: true,
      enum: [
        "course.announcement.created",
        "course.material.created",
        "course.deliverable.created",
        "submission.graded",
      ],
    },
    channel: {
      type: String,
      required: true,
      enum: ["email"],
    },
    recipient: {
      email: { type: String, required: true, lowercase: true, trim: true },
      userId: { type: String },
      name: { type: String },
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "processing", "failed", "sent", "dead"],
      default: "pending",
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      required: true,
      default: 5,
      min: 1,
    },
    nextAttemptAt: {
      type: Date,
      default: Date.now,
    },
    lockedAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
    },
    lastError: {
      type: String,
    },
  },
  { timestamps: true }
);

NotificationOutboxSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
NotificationOutboxSchema.index({ "recipient.email": 1, createdAt: -1 });

export default mongoose.model<INotificationOutbox>("NotificationOutbox", NotificationOutboxSchema);
