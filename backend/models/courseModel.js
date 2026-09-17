import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const courseSchema = mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: true,
      unique: true,
    },
    courseName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    studentLimit: {
      type: Number,
      required: true,
      default: 30,
    },
    courseId: {
      type: String,
      default: uuidv4,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

const Course = mongoose.model("Course", courseSchema);

export default Course;