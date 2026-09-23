import mongoose from "mongoose";

const cheatingLogSchema = new mongoose.Schema(
  {
    noFaceCount: { type: Number, default: 0 },
    multipleFaceCount: { type: Number, default: 0 },
    cellPhoneCount: { type: Number, default: 0 },
    tabSwitchCount: { type: Number, default: 0 },

    examId: { type: String, required: true },
    email: { type: String, required: true },
    username: { type: String, required: true },

    screenshots: [
      {
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ["noFace", "multipleFace", "cellPhone", "tabSwitch"],
          required: true,
        },
        detectedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const CheatingLog = mongoose.model("CheatingLog", cheatingLogSchema);

export default CheatingLog;
