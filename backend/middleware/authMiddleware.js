import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';

const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.jwt;
  if (!token) {
    res.status(401);
    throw new Error('Not authorized. No token provided.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof decoded.userId !== 'string' || !/^[a-f0-9]{24}$/i.test(decoded.userId)) {
      throw new Error('Invalid user ID');
    }
  } catch {
    res.status(401);
    throw new Error('Not authorized. Invalid token.');
  }

  const user = await User.findById(decoded.userId).select('-password');
  if (!user) {
    res.status(401);
    throw new Error('Not authorized. Account no longer exists.');
  }
  if ((decoded.sessionVersion ?? 0) !== (user.sessionVersion ?? 0)) {
    res.status(401);
    throw new Error('Your password has been reset. Please sign out and sign in again.');
  }
  // Preserve access for legacy accounts without an approval field.
  if (user.isApproved === false) {
    res.status(403);
    throw new Error(
      user.hasBeenApproved === true
        ? 'Your account has been deactivated. Please contact an administrator.'
        : 'Your account is pending admin approval.',
    );
  }
  req.user = user;
  next();
});

export { protect };
