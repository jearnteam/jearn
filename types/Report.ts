import mongoose, { Schema } from "mongoose";

const ReportSchema = new Schema(
  {
    postId: { type: String, required: true },
    reporterId: { type: String, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "reviewed", "ignored"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Report ||
  mongoose.model("Report", ReportSchema);
