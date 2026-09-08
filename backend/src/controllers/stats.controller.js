import { Donation } from '../models/Donation.js';
import { Seeker } from '../models/Seeker.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { dhakaDayStart } from '../utils/dhaka.js';

export const overview = asyncHandler(async (_req, res) => {
  const dayStart = dhakaDayStart();

  const [todayAgg, lifetimeAgg, activeSeekers, pendingSeekers, pendingDonations, topDistricts] =
    await Promise.all([
      Donation.aggregate([
        { $match: { status: 'verified', reviewedAt: { $gte: dayStart } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Donation.aggregate([
        { $match: { status: 'verified' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Seeker.countDocuments({ status: 'approved' }),
      Seeker.countDocuments({ status: 'pending' }),
      Donation.countDocuments({ status: 'pending' }),
      Seeker.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$location.district', seekers: { $sum: 1 } } },
        { $sort: { seekers: -1 } },
        { $limit: 6 },
        { $project: { _id: 0, district: '$_id', seekers: 1 } },
      ]),
    ]);

  return ok(res, {
    today: {
      collected: todayAgg[0]?.total || 0,
      donations: todayAgg[0]?.count || 0,
    },
    lifetime: {
      collected: lifetimeAgg[0]?.total || 0,
      donations: lifetimeAgg[0]?.count || 0,
    },
    activeSeekers,
    pendingSeekers,
    pendingDonations,
    topDistricts,
  });
});

export const leaderboard = asyncHandler(async (_req, res) => {
  const rows = await Seeker.find({ status: 'approved' })
    .sort({ 'stats.collectedTotal': -1 })
    .limit(10)
    .select('name slug avatarUrl category location.district stats.collectedTotal stats.donationCount');
  return ok(res, rows);
});
