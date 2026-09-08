import mongoose from 'mongoose';
import { Seeker, LIVE_TTL_MS } from '../models/Seeker.js';
import { Donation } from '../models/Donation.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created } from '../utils/respond.js';
import { uniqueSlug } from '../utils/slug.js';
import { dhakaDateKey } from '../utils/dhaka.js';
import { env } from '../config/env.js';
import { q } from '../middleware/validate.js';

const SORTS = {
  newest: { createdAt: -1 },
  urgent: { 'stats.collectedToday': 1, createdAt: -1 },
  progress: { 'stats.collectedToday': -1 },
  target: { dailyTarget: -1 },
};

function buildFilter({ q: search, category, district, status }) {
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (district) filter['location.district'] = district;
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { story: rx }, { 'location.address': rx }, { 'location.district': rx }];
  }
  return filter;
}

/** Zeroes stale daily counters so a card never shows yesterday's progress. */
function normaliseDaily(doc) {
  const json = doc.toJSON();
  if (json.stats?.todayKey !== dhakaDateKey()) {
    json.stats = { ...json.stats, collectedToday: 0, todayKey: dhakaDateKey() };
    json.progressPercent = 0;
  }
  return json;
}

export const listPublicSeekers = asyncHandler(async (req, res) => {
  const { page, limit, sort, ...rest } = q(req);
  const filter = buildFilter({ ...rest, status: 'approved' });

  const [items, total] = await Promise.all([
    Seeker.find(filter)
      .sort(SORTS[sort] || SORTS.newest)
      .skip((page - 1) * limit)
      .limit(limit),
    Seeker.countDocuments(filter),
  ]);

  return ok(res, items.map(normaliseDaily), {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  });
});

export const mapSeekers = asyncHandler(async (req, res) => {
  const liveOnly = String(req.query.live || '') === 'true';

  const filter = {
    status: 'approved',
    'location.lat': { $ne: null },
    'location.lng': { $ne: null },
  };

  if (liveOnly) {
    filter['live.isSharing'] = true;
    filter['live.lastPingAt'] = { $gte: new Date(Date.now() - LIVE_TTL_MS) };
  }

  const items = await Seeker.find(filter).select(
    'name slug category avatarUrl location live dailyTarget stats payments'
  );

  return ok(res, items.map(normaliseDaily));
});

/**
 * Updates only the seeker's coordinates. This is deliberately separate from
 * PATCH /seekers/:id — that route sends an edited profile back for review, and
 * a person walking down the street should not knock their own profile offline
 * every thirty seconds.
 */
export const updateMyLocation = asyncHandler(async (req, res) => {
  const seeker = await Seeker.findOne({ user: req.user._id });
  if (!seeker) throw ApiError.notFound('You have not created a seeker profile yet');

  const { lat, lng, accuracy, isSharing, address } = req.body;
  const sharing = isSharing !== false;

  seeker.location.lat = lat;
  seeker.location.lng = lng;
  seeker.location.accuracy = accuracy;
  seeker.location.source = sharing ? 'live' : 'device';
  seeker.location.updatedAt = new Date();

  // The address is only accepted while the profile is still unreviewed, so a
  // reverse-geocoded string can never quietly replace text an admin approved.
  if (address && seeker.status !== 'approved') {
    seeker.location.address = address;
  }

  if (sharing) {
    if (!seeker.live.isSharing) seeker.live.startedAt = new Date();
    seeker.live.isSharing = true;
    seeker.live.lastPingAt = new Date();
  }

  await seeker.save();

  return ok(res, {
    location: seeker.location,
    live: seeker.live,
    isLive: seeker.isLive,
  });
});

/** Turns live sharing off. The last known position is kept on the profile. */
export const stopSharingLocation = asyncHandler(async (req, res) => {
  const seeker = await Seeker.findOne({ user: req.user._id });
  if (!seeker) throw ApiError.notFound('You have not created a seeker profile yet');

  seeker.live.isSharing = false;
  seeker.live.lastPingAt = undefined;
  seeker.live.startedAt = undefined;
  if (seeker.location.source === 'live') seeker.location.source = 'device';
  await seeker.save();

  return ok(res, { live: seeker.live, isLive: false });
});

export const getSeekerBySlug = asyncHandler(async (req, res) => {
  const seeker = await Seeker.findOne({ slug: req.params.slug });
  if (!seeker) throw ApiError.notFound('Seeker profile not found');

  const isOwner = req.user && seeker.user && String(seeker.user) === String(req.user._id);
  const isAdmin = req.user?.role === 'admin';
  if (seeker.status !== 'approved' && !isOwner && !isAdmin) {
    throw ApiError.notFound('Seeker profile not found');
  }

  const recentDonations = await Donation.find({ seeker: seeker._id, status: 'verified' })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('receiptNo amount method donor createdAt message');

  return ok(res, { seeker: normaliseDaily(seeker), recentDonations });
});

export const createSeekerProfile = asyncHandler(async (req, res) => {
  const existing = await Seeker.findOne({ user: req.user._id });
  if (existing) throw ApiError.conflict('You already have a seeker profile');

  const seeker = await Seeker.create({
    ...req.body,
    user: req.user._id,
    slug: uniqueSlug(req.body.name),
    status: env.autoApproveSeekers ? 'approved' : 'pending',
    stats: { collectedToday: 0, collectedTotal: 0, donationCount: 0, todayKey: dhakaDateKey() },
  });

  if (req.user.role === 'donor') {
    req.user.role = 'seeker';
    await req.user.save();
  }

  return created(res, seeker);
});

export const getMyProfile = asyncHandler(async (req, res) => {
  const seeker = await Seeker.findOne({ user: req.user._id }).select('+proofUrl');
  if (!seeker) throw ApiError.notFound('You have not created a seeker profile yet');

  const pendingCount = await Donation.countDocuments({ seeker: seeker._id, status: 'pending' });
  return ok(res, { seeker: normaliseDaily(seeker), pendingDonations: pendingCount });
});

export const updateSeekerProfile = asyncHandler(async (req, res) => {
  const seeker = await Seeker.findById(req.params.id);
  if (!seeker) throw ApiError.notFound('Seeker profile not found');

  const isOwner = seeker.user && String(seeker.user) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw ApiError.forbidden();

  Object.assign(seeker, req.body);

  // Any edit by the seeker sends the profile back for review, unless an admin
  // made the change or auto-approval is on.
  if (isOwner && req.user.role !== 'admin' && !env.autoApproveSeekers) {
    seeker.status = 'pending';
    seeker.statusNote = 'তথ্য পরিবর্তনের কারণে পুনরায় যাচাই প্রয়োজন';
  }

  await seeker.save();
  return ok(res, normaliseDaily(seeker));
});

export const deleteSeekerProfile = asyncHandler(async (req, res) => {
  const seeker = await Seeker.findById(req.params.id);
  if (!seeker) throw ApiError.notFound('Seeker profile not found');

  const isOwner = seeker.user && String(seeker.user) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw ApiError.forbidden();

  await seeker.deleteOne();
  return ok(res, { message: 'Seeker profile removed' });
});

/* ---------------------------- admin ---------------------------- */

export const adminListSeekers = asyncHandler(async (req, res) => {
  const { page, limit, sort, ...rest } = q(req);
  const filter = buildFilter(rest);

  const [items, total] = await Promise.all([
    Seeker.find(filter)
      .sort(SORTS[sort] || SORTS.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('+proofUrl')
      .populate('user', 'name email phone'),
    Seeker.countDocuments(filter),
  ]);

  return ok(res, items, { page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

export const reviewSeeker = asyncHandler(async (req, res) => {
  const seeker = await Seeker.findById(req.params.id);
  if (!seeker) throw ApiError.notFound('Seeker profile not found');

  seeker.status = req.body.status;
  seeker.statusNote = req.body.statusNote;
  seeker.reviewedBy = req.user._id;
  seeker.reviewedAt = new Date();
  await seeker.save();

  return ok(res, seeker);
});

export const districts = asyncHandler(async (_req, res) => {
  const rows = await Seeker.aggregate([
    { $match: { status: 'approved' } },
    { $group: { _id: '$location.district', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, district: '$_id', count: 1 } },
  ]);
  return ok(res, rows);
});

export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
