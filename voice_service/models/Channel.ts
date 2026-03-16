import mongoose, { Schema, Document } from "mongoose";

// ── Participant subdocument ────────────────────────────────
// Embedded inside Channel — represents one person currently
// in the voice channel. Gets added on join, removed on leave.

export interface IParticipant {
  userId:   string;
  name:     string;
  email?:   string;
  role:     "host" | "participant";
  joinedAt: Date;
  isMuted:  boolean;
}

const ParticipantSchema = new Schema(
  {
    userId:   { type: String, required: true },
    name:     { type: String, required: true },
    email:    { type: String },
    role:     {
      type:    String,
      enum:    ["host", "participant"],
      default: "participant",
    },
    joinedAt: { type: Date, default: Date.now },
    isMuted:  { type: Boolean, default: false },
  },
  { _id: false } // no separate _id for subdocuments
);

// ── Channel document ──────────────────────────────────────

export interface IChannel extends Document {
  name:         string;
  courseId:     string;
  createdBy:    string;
  participants: IParticipant[];
  isActive:     boolean;
  createdAt:    Date;
  updatedAt:    Date;
}

const ChannelSchema = new Schema(
  {
    name:      { type: String, required: true, trim: true },
    courseId:  { type: String, required: true },
    createdBy: { type: String, required: true },
    participants: {
      type:    [ParticipantSchema],
      default: [],
    },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true } // auto-manages createdAt + updatedAt
);

export default mongoose.model("Channel", ChannelSchema);