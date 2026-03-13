import mongoose, { Schema, Document } from "mongoose";

export interface ISession extends Document {
  channelId:      mongoose.Types.ObjectId;
  startedAt:      Date;
  endedAt:        Date | null;
  participantIds: string[];
  peakCount:      number;
  createdAt:      Date;
  updatedAt:      Date;
}

const SessionSchema = new Schema(
  {
    channelId: {
      type:     Schema.Types.ObjectId,
      ref:      "Channel",
      required: true,
    },
    startedAt:      { type: Date,     default: Date.now },
    endedAt:        { type: Date,     default: null },
    participantIds: { type: [String], default: [] },
    peakCount:      { type: Number,   default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Session", SessionSchema);