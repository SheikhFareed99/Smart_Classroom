import mongoose, { Document, Schema } from "mongoose";

export interface IWhiteboard extends Document {
  whiteboardID: string;
  studentID: string;
  title: string;
  dataJSON: string;
  createdAt: Date;
  lastSavedAt: Date;
}

const WhiteboardSchema = new Schema<IWhiteboard>({
  whiteboardID: {
    type: String,
    required: true,
    unique: true,
  },
  studentID: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: "My Whiteboard",
  },
  // Stores the full serialized Fabric.js canvas JSON as a plain string.
  dataJSON: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastSavedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IWhiteboard>("Whiteboard", WhiteboardSchema);