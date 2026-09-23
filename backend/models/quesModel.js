import mongoose from "mongoose";

const questionSchema = mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
    },
    options: [
      {
        optionText: {
          type: String,
          required: true,
        },
        isCorrect: {
          type: Boolean,
          required: true,
        },
      },
    ],
    imageUrl: {
      type: String,
      default: null,
    },
    ansmarks: {
      type: Number,
      required: false,
      default: 0,
    },
    examId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Question = mongoose.model("Question", questionSchema);
export default Question;
