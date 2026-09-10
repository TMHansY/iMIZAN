import asyncHandler from "express-async-handler";
import User from "./../models/userModel.js";
import generateToken from "../utils/generateToken.js";

const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

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
  const { name, email, password, role } = req.body;

  const userExist = await User.findOne({ email });

  if (userExist) {
    res.status(400);
    throw new Error("User Already Exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    isApproved: false,
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

  const pendingUsers = await User.find({ isApproved: false }).select("-password");
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
  await user.save();

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

  await User.deleteOne({ _id: req.params.id });

  res.status(200).json({ message: `${user.email} rejected and removed.` });
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
};
