import asyncHandler from "express-async-handler";
import Enrollment from "../models/enrollmentModel.js";
import Course from "../models/courseModel.js";

const isCourseLecturer = (course, user) =>
  course.lecturer && course.lecturer.toString() === user._id.toString();

// @desc    Student applies to join a course
// @route   POST /api/enrollments
// @access  Private (Student only)
const applyToCourse = asyncHandler(async (req, res) => {
  if (req.user.role !== "student") {
    res.status(403);
    throw new Error("Only students can apply to courses");
  }

  const { courseId, sectionId } = req.body;

  const course = await Course.findOne({ courseId });
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }
  if (!sectionId || !course.sections.some((section) => section.sectionId === sectionId)) {
    res.status(400);
    throw new Error("Choose a valid section for this course");
  }

  const existing = await Enrollment.findOne({ courseId, student: req.user._id });
  if (existing) {
    res.status(400);
    throw new Error(
      existing.status === "pending"
        ? "You already have a pending application for this course"
        : existing.status === "approved"
        ? "You are already enrolled in this course"
        : "Your previous application to this course was rejected"
    );
  }

  const enrollment = await Enrollment.create({
    courseId,
    sectionId,
    student: req.user._id,
    status: "pending",
  });

  res.status(201).json(enrollment);
});

// @desc    Get the current student's own enrollments (all statuses)
// @route   GET /api/enrollments/mine
// @access  Private (Student only)
const getMyEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id });
  res.status(200).json(enrollments);
});

// @desc    Get all enrollments (all statuses) for a course the lecturer owns
// @route   GET /api/enrollments/course/:courseId
// @access  Private (Lecturer only, must own the course)
const getEnrollmentsForCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findOne({ courseId });
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  if (!isCourseLecturer(course, req.user)) {
    res.status(403);
    throw new Error("Not authorized to view enrollments for this course");
  }

  const enrollments = await Enrollment.find({ courseId })
    .populate("student", "name email idNumber")
    .sort({ createdAt: -1 });

  res.status(200).json(enrollments);
});

// @desc    Approve a student's enrollment application
// @route   PUT /api/enrollments/:id/approve
// @access  Private (Lecturer only, must own the course)
const approveEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findById(req.params.id);
  if (!enrollment) {
    res.status(404);
    throw new Error("Enrollment not found");
  }

  const course = await Course.findOne({ courseId: enrollment.courseId });
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  if (!isCourseLecturer(course, req.user)) {
    res.status(403);
    throw new Error("Not authorized to manage enrollments for this course");
  }

  const section = course.sections.find((item) => item.sectionId === enrollment.sectionId);
  if (!section) { res.status(400); throw new Error("The selected section is no longer available. Reassign the student before approving."); }
  const approvedCount = await Enrollment.countDocuments({
    courseId: course.courseId,
    sectionId: enrollment.sectionId,
    status: "approved",
  });

  if (approvedCount >= section.studentLimit) {
    res.status(400);
    throw new Error(
      `Section ${section.name} is at its student limit (${section.studentLimit}). Reassign a student or ask an admin to increase the limit.`
    );
  }

  enrollment.status = "approved";
  await enrollment.save();

  res.status(200).json(enrollment);
});

const changeEnrollmentSection = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findById(req.params.id);
  if (!enrollment) { res.status(404); throw new Error("Enrollment not found"); }
  const course = await Course.findOne({ courseId: enrollment.courseId });
  if (!course) { res.status(404); throw new Error("Course not found"); }
  if (!isCourseLecturer(course, req.user)) { res.status(403); throw new Error("Not authorized to manage enrollments for this course"); }
  const section = course.sections.find((item) => item.sectionId === req.body.sectionId);
  if (!section) { res.status(400); throw new Error("Choose a valid section for this course"); }
  if (enrollment.status === "approved") {
    const count = await Enrollment.countDocuments({ courseId: course.courseId, sectionId: section.sectionId, status: "approved", _id: { $ne: enrollment._id } });
    if (count >= section.studentLimit) { res.status(400); throw new Error(`Section ${section.name} is at its student limit (${section.studentLimit})`); }
  }
  enrollment.sectionId = section.sectionId;
  await enrollment.save();
  res.json(enrollment);
});

// @desc    Reject a student's enrollment application
// @route   PUT /api/enrollments/:id/reject
// @access  Private (Lecturer only, must own the course)
const rejectEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findById(req.params.id);
  if (!enrollment) {
    res.status(404);
    throw new Error("Enrollment not found");
  }

  const course = await Course.findOne({ courseId: enrollment.courseId });
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  if (!isCourseLecturer(course, req.user)) {
    res.status(403);
    throw new Error("Not authorized to manage enrollments for this course");
  }

  enrollment.status = "rejected";
  await enrollment.save();

  res.status(200).json(enrollment);
});

export { applyToCourse, getMyEnrollments, getEnrollmentsForCourse, approveEnrollment, rejectEnrollment, changeEnrollmentSection };
