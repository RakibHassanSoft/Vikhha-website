import { User } from '../models/User.js';
import { Seeker } from '../models/Seeker.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken } from '../utils/token.js';
import { ok, created } from '../utils/respond.js';

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  createdAt: user.createdAt,
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  const exists = await User.findOne({ email });
  if (exists) throw ApiError.conflict('An account with this email already exists');

  const user = new User({ name, email, phone, role });
  await user.setPassword(password);
  await user.save();

  const token = signToken({ sub: user._id.toString(), role: user.role });
  return created(res, { token, user: publicUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Email or password is incorrect');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  const valid = await user.verifyPassword(password);
  if (!valid) throw ApiError.unauthorized('Email or password is incorrect');

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken({ sub: user._id.toString(), role: user.role });
  return ok(res, { token, user: publicUser(user) });
});

export const me = asyncHandler(async (req, res) => {
  const seekerProfile =
    req.user.role === 'seeker' ? await Seeker.findOne({ user: req.user._id }) : null;

  return ok(res, {
    user: publicUser(req.user),
    seekerProfile,
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  Object.assign(req.user, req.body);
  await req.user.save();
  return ok(res, { user: publicUser(req.user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  const valid = await user.verifyPassword(req.body.currentPassword);
  if (!valid) throw ApiError.badRequest('Current password is incorrect');

  await user.setPassword(req.body.newPassword);
  await user.save();
  return ok(res, { message: 'Password updated' });
});
