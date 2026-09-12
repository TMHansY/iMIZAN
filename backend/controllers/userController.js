import asyncHandler from "express-async-handler";
import User from "./../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import sendEmail from "../utils/sendEmail.js";
import Exam from "./../models/examModel.js";
import Result from "./../models/resultModel.js";

const authUser = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const user = await User.findOne({
    $or: [{ email: identifier }, { idNumber: identifier }],
  });

  if (user && (await user.matchPassword(password))) {
    // isApproved === false explicitly blocks; undefined (legacy accounts)
    // or true both pass through normally.
    if (user.isApproved === false) {
      res.status(403);
      throw new Error("Your account is pending admin approval.");
    }

    generateToken(res, user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      password_encrypted: user.password,
      message: "User Successfully login with role: " + user.role,
    });
  } else {
    res.status(401);
    throw new Error("Invalid User email or password ");
  }
});

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, idNumber, password, role } = req.body;

  const userExist = await User.findOne({ $or: [{ email }, { idNumber }] });

  if (userExist) {
    res.status(400);
    throw new Error("An account with this email or ID number already exists");
  }

  const user = await User.create({
    name,
    email,
    idNumber,
    password,
    role,
    isApproved: false,
    hasBeenApproved: false,
  });

  if (user) {
    // No token issued here — the account needs admin approval before login works.
    res.status(201).json({
      message: "Account created. Please wait for an admin to approve your account before logging in.",
    });
  } else {
    res.status(400);
    throw new Error("Invalid User Data");
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    expires: new Date(0),
  });
  res.status(200).json({ message: " User logout User" });
});

const getUserProfile = asyncHandler(async (req, res) => {
  const user = {
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  };
  res.status(200).json(user);
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    });
  } else {
    res.status(404);
    throw new Error("User Not Found");
  }
});
// @desc    Get all accounts pending approval
// @route   GET /api/users/pending
// @access  Private (Admin only)
const getPendingUsers = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }

  const pendingUsers = await User.find({
    isApproved: false,
    hasBeenApproved: false,
  }).select("-password");
  res.status(200).json(pendingUsers);
});

// @desc    Approve a pending account
// @route   PUT /api/users/:id/approve
// @access  Private (Admin only)
const approveUser = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.isApproved = true;
  user.hasBeenApproved = true;
  await user.save();

  await sendEmail({
    to: user.email,
    subject: "Your iMIZAN account has been approved",
    text: `Hi ${user.name},\n\nYour account has been approved. You can now log in at the iMIZAN platform.\n\n— iMIZAN`,
  });

  res.status(200).json({ message: `${user.email} approved.` });
});

// @desc    Reject (and remove) a pending account
// @route   DELETE /api/users/:id/reject
// @access  Private (Admin only)
const rejectUser = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { name, email } = user;

  await User.deleteOne({ _id: req.params.id });

  await sendEmail({
    to: email,
    subject: "Your iMIZAN account request was not approved",
    text: `Hi ${name},\n\nYour account request was not approved. If you believe this is a mistake, please contact your administrator.\n\n— iMIZAN`,
  });

  res.status(200).json({ message: `${email} rejected and removed.` });
});

// @desc    Approve multiple pending accounts at once
// @route   POST /api/users/bulk-approve
// @access  Private (Admin only)
const bulkApproveUsers = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }

  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400);
    throw new Error("No accounts selected");
  }

  const users = await User.find({ _id: { $in: ids } });

  await User.updateMany(
    { _id: { $in: ids } },
    { isApproved: true, hasBeenApproved: true }
  );

  for (const user of users) {
    await sendEmail({
      to: user.email,
      subject: "Your iMIZAN account has been approved",
      text: `Hi ${user.name},\n\nYour account has been approved. You can now log in at the iMIZAN platform.\n\n— iMIZAN`,
    });
  }

  res.status(200).json({ message: `${users.length} account(s) approved.` });
});

// @desc    Reject (and remove) multiple pending accounts at once
// @route   POST /api/users/bulk-reject
// @access  Private (Admin only)
const bulkRejectUsers = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }

  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400);
    throw new Error("No accounts selected");
  }

  const users = await User.find({ _id: { $in: ids } });

  await User.deleteMany({ _id: { $in: ids } });

  for (const user of users) {
    await sendEmail({
      to: user.email,
      subject: "Your iMIZAN account request was not approved",
      text: `Hi ${user.name},\n\nYour account request was not approved. If you believe this is a mistake, please contact your administrator.\n\n— iMIZAN`,
    });
  }

  res.status(200).json({ message: `${users.length} account(s) rejected.` });
});

// @desc    Get all approved (active or deactivated) accounts
// @route   GET /api/users/accounts
// @access  Private (Admin only)
const getAllAccounts = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }

  const accounts = await User.find({
    $or: [{ hasBeenApproved: true }, { hasBeenApproved: { $exists: false } }],
  }).select("-password");
  res.status(200).json(accounts);
});

// @desc    Toggle an account's active status (deactivate/reactivate)
// @route   PUT /api/users/:id/toggle-active
// @access  Private (Admin only)
const toggleAccountActive = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.role === "admin") {
    res.status(400);
    throw new Error("Cannot deactivate an admin account");
  }

  user.isApproved = !user.isApproved;
  await user.save();

  res.status(200).json({
    message: `${user.email} is now ${user.isApproved ? "active" : "deactivated"}.`,
    isApproved: user.isApproved,
  });
});
// @desc    Get basic platform-wide stats
// @route   GET /api/users/admin/stats
// @access  Private (Admin only)
const getSystemStats = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }

  const [totalStudents, totalLecturers, totalExams, totalResults, pendingCount] =
    await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "lecturer" }),
      Exam.countDocuments(),
      Result.countDocuments(),
      User.countDocuments({ isApproved: false, hasBeenApproved: false }),
    ]);

  res.status(200).json({
    totalStudents,
    totalLecturers,
    totalExams,
    totalResults,
    pendingCount,
  });
});
// @desc    Permanently delete a deactivated account
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
const deleteAccount = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.role === "admin") {
    res.status(400);
    throw new Error("Cannot delete an admin account");
  }

  if (user.isApproved) {
    res.status(400);
    throw new Error("Only deactivated accounts can be deleted. Deactivate this account first.");
  }

  await User.deleteOne({ _id: req.params.id });

  res.status(200).json({ message: `${user.email} permanently deleted.` });
});
export {
  authUser,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  getPendingUsers,
  approveUser,
  rejectUser,
  bulkApproveUsers,
  bulkRejectUsers,
  getAllAccounts,
  toggleAccountActive,
  getSystemStats,
  deleteAccount,
};
