import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import User from '../models/userModel.js';

export const adminResetPassword = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only administrators can reset passwords.' });
  }
  const { id } = req.params;
  if (!/^[a-f0-9]{24}$/i.test(id || '')) {
    return res.status(400).json({ message: 'Invalid account ID.' });
  }
  if (String(req.user._id).toLowerCase() === id.toLowerCase()) {
    return res
      .status(400)
      .json({ message: 'Use your account settings to change your own password.' });
  }
  const { password, confirmPassword, adminPassword } = req.body || {};
  if (
    typeof password !== 'string' ||
    password.length < 6 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res
      .status(400)
      .json({
        message: 'Use at least 6 characters and no more than 72 UTF-8 bytes for the new password.',
      });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'The new passwords do not match.' });
  }
  if (
    typeof adminPassword !== 'string' ||
    !adminPassword ||
    Buffer.byteLength(adminPassword, 'utf8') > 72
  ) {
    return res.status(400).json({ message: 'Enter your administrator password to confirm.' });
  }
  const administrator = await User.findById(req.user._id);
  if (!administrator || !(await administrator.matchPassword(adminPassword))) {
    return res.status(403).json({ message: 'Your administrator password is incorrect.' });
  }

  const hash = await bcrypt.hash(password, 10);
  // Update only the password and session version, preserving approval and role.
  // Hash explicitly because query updates do not execute the save hook.
  const user = await User.findOneAndUpdate(
    { _id: id },
    { $set: { password: hash }, $inc: { sessionVersion: 1 } },
    { new: true },
  );
  if (!user) return res.status(404).json({ message: 'Account not found.' });
  res.set('Cache-Control', 'no-store');
  res.json({
    message:
      'Password reset. Share the new password privately with the user and ask them to change it after signing in.',
  });
});
