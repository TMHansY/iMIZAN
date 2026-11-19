import asyncHandler from "express-async-handler";
import Course from "../models/courseModel.js";
import User from "../models/userModel.js";
import Exam from "../models/examModel.js";
import Enrollment from "../models/enrollmentModel.js";
import { v4 as uuidv4 } from "uuid";

// @desc    Get all courses
// @route   GET /api/courses
// @access  Private
const getCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find()
    .populate("lecturer", "name email")
    .sort({ createdAt: -1 });
  res.status(200).json(courses);
});

// @desc    Create a course
// @route   POST /api/courses
// @access  Private (Admin only)
const createCourse = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }

  const { courseCode, courseName, description, lecturer, studentLimit } = req.body;

  const exists = await Course.findOne({ courseCode });
  if (exists) {
    res.status(400);
    throw new Error("A course with this code already exists");
  }

  if (lecturer) {
    const lecturerUser = await User.findById(lecturer);
    if (!lecturerUser || lecturerUser.role !== "lecturer") {
      res.status(400);
      throw new Error("Assigned user must be a lecturer");
    }
  }

  const course = await Course.create({
    courseCode,
    courseName,
    description,
    lecturer: lecturer || null,
    studentLimit,
  });

  res.status(201).json(course);
});

// @desc    Update a course
// @route   PUT /api/courses/:courseId
// @access  Private (Admin only)
const updateCourse = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }

  const { courseId } = req.params;
  const { courseCode, courseName, description, lecturer, studentLimit } = req.body;

  const course = await Course.findOne({ courseId });
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  if (lecturer) {
    const lecturerUser = await User.findById(lecturer);
    if (!lecturerUser || lecturerUser.role !== "lecturer") {
      res.status(400);
      throw new Error("Assigned user must be a lecturer");
    }
  }

  course.courseCode = courseCode ?? course.courseCode;
  course.courseName = courseName ?? course.courseName;
  course.description = description ?? course.description;
  course.studentLimit = studentLimit ?? course.studentLimit;
  // Allow explicitly clearing the lecturer by passing null
  if (lecturer !== undefined) {
    course.lecturer = lecturer || null;
  }

  const updated = await course.save();
  res.status(200).json(updated);
});

// @desc    Delete a course
// @route   DELETE /api/courses/:courseId
// @access  Private (Admin only)
const deleteCourse = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }

  const { courseId } = req.params;

  const course = await Course.findOne({ courseId });
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  const examCount = await Exam.countDocuments({ courseId });
  if (examCount > 0) {
    res.status(400);
    throw new Error(
      `This course has ${examCount} exam(s) attached. Delete or reassign them before deleting the course.`
    );
  }

  await Course.deleteOne({ courseId });
  await Enrollment.deleteMany({ courseId });

  res.status(200).json({ message: `${course.courseCode} deleted.` });
});

// @desc    Get all lecturers (for the admin's assignment dropdown)
// @route   GET /api/courses/lecturers
// @access  Private (Admin only)
const getLecturers = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }

  const lecturers = await User.find({ role: "lecturer", isApproved: true }).select(
    "name email"
  );
  res.status(200).json(lecturers);
});

// @desc    Get courses assigned to the current lecturer
// @route   GET /api/courses/mine
// @access  Private (Lecturer only)
const getMyCourses = asyncHandler(async (req, res) => {
  if (req.user.role !== "lecturer") {
    res.status(403);
    throw new Error("Not authorized");
  }

  const courses = await Course.find({ lecturer: req.user._id });
  res.status(200).json(courses);
});

const addCourseSection = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") { res.status(403); throw new Error("Not authorized"); }
  const course = await Course.findOne({ courseId: req.params.courseId });
  if (!course) { res.status(404); throw new Error("Course not found"); }
  const name = String(req.body.name || "").trim();
  const studentLimit = Number(req.body.studentLimit || course.studentLimit);
  if (!name || !Number.isInteger(studentLimit) || studentLimit < 1) { res.status(400); throw new Error("Enter a section name and a valid student limit"); }
  if (course.sections.some((section) => section.name.toLowerCase() === name.toLowerCase())) { res.status(400); throw new Error("A section with this name already exists"); }
  course.sections.push({ sectionId: uuidv4(), name, studentLimit });
  await course.save();
  res.status(201).json(course.sections);
});

const updateCourseSection = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") { res.status(403); throw new Error("Not authorized"); }
  const course = await Course.findOne({ courseId: req.params.courseId });
  if (!course) { res.status(404); throw new Error("Course not found"); }
  const section = course.sections.find((item) => item.sectionId === req.params.sectionId);
  if (!section) { res.status(404); throw new Error("Section not found"); }
  const name = String(req.body.name || "").trim();
  const studentLimit = Number(req.body.studentLimit);
  if (!name || !Number.isInteger(studentLimit) || studentLimit < 1) { res.status(400); throw new Error("Enter a section name and a valid student limit"); }
  if (course.sections.some((item) => item !== section && item.name.toLowerCase() === name.toLowerCase())) { res.status(400); throw new Error("A section with this name already exists"); }
  section.name = name;
  section.studentLimit = studentLimit;
  await course.save();
  res.json(course.sections);
});

export {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getLecturers,
  getMyCourses,
  addCourseSection,
  updateCourseSection,
};
