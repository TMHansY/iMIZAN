import mongoose from "mongoose";

const enrollmentSchema = mongoose.Schema(
  {
    courseId: {
      type: String,
      required: true,
    },
    // Optional for pre-section enrollments already stored in the database.
    // New applications are validated by the controller and must choose one.
    sectionId: { type: String, default: "" },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// A student can only have one active enrollment record per course
enrollmentSchema.index({ courseId: 1, student: 1 }, { unique: true });

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

export default Enrollment;
