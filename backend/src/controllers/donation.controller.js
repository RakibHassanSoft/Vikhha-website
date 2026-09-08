import { Donation } from '../models/Donation.js';
import { Seeker } from '../models/Seeker.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created } from '../utils/respond.js';
import { receiptNumber } from '../utils/slug.js';
import { dhakaDateKey } from '../utils/dhaka.js';
import { generateDua } from '../services/gemini.service.js';
import { q } from '../middleware/validate.js';

/**
 * Records a donation the donor has ALREADY sent from their own bKash/Nagad/
 * Rocket app to the seeker's personal number. The portal stores the reference
 * and waits for admin verification — no money moves through this API.
 */
export const createDonation = asyncHandler(async (req, res) => {
  const {
    seekerId,
    amount,
    method,
    senderNumber,
    trxId,
    donorName,
    donorPhone,
    isAnonymous,
    message,
  } = req.body;

  const seeker = await Seeker.findById(seekerId);
  if (!seeker) throw ApiError.notFound('Seeker not found');
  if (seeker.status !== 'approved') {
    throw ApiError.badRequest('This seeker is not currently accepting donations');
  }

  const receiverNumber = seeker.payments?.[method];
  if (!receiverNumber) {
    throw ApiError.badRequest(
      `This seeker has not registered a ${method} number. Please choose another method.`
    );
  }

  const duplicate = await Donation.findOne({ method, trxId });
  if (duplicate) {
    throw ApiError.conflict('This transaction ID has already been submitted');
  }

  const dua = await generateDua({
    seekerName: seeker.name,
    category: seeker.category,
    donorName: isAnonymous ? undefined : donorName,
    amount,
    occasion: 'general',
    tone: 'warm',
  });

  const donation = await Donation.create({
    receiptNo: receiptNumber(),
    seeker: seeker._id,
    donor: {
      user: req.user?._id,
      name: isAnonymous ? 'নাম প্রকাশে অনিচ্ছুক' : donorName || req.user?.name,
      phone: isAnonymous ? undefined : donorPhone || req.user?.phone,
      isAnonymous,
    },
    amount,
    method,
    senderNumber,
    receiverNumber,
    trxId,
    message,
    duaText: seeker.dua || dua.text,
    status: 'pending',
  });

  return created(res, {
    donation,
    dua: { text: donation.duaText, source: dua.source },
    notice:
      'আপনার লেনদেনটি জমা হয়েছে। যাচাইয়ের পর এটি সাহায্যপ্রার্থীর সংগ্রহে যোগ হবে।',
  });
});

export const getReceipt = asyncHandler(async (req, res) => {
  const donation = await Donation.findOne({ receiptNo: req.params.receiptNo.toUpperCase() })
    .populate('seeker', 'name slug avatarUrl location category dua');
  if (!donation) throw ApiError.notFound('Receipt not found');
  return ok(res, donation);
});

export const myDonations = asyncHandler(async (req, res) => {
  const { page, limit, status } = q(req);
  const filter = { 'donor.user': req.user._id, ...(status ? { status } : {}) };

  const [items, total] = await Promise.all([
    Donation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('seeker', 'name slug avatarUrl'),
    Donation.countDocuments(filter),
  ]);

  return ok(res, items, { page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

/** Donations received by the signed-in seeker (or any seeker, for admins). */
export const seekerDonations = asyncHandler(async (req, res) => {
  const { page, limit, status } = q(req);

  const seeker =
    req.user.role === 'admin' && req.params.seekerId
      ? await Seeker.findById(req.params.seekerId)
      : await Seeker.findOne({ user: req.user._id });

  if (!seeker) throw ApiError.notFound('Seeker profile not found');
  if (req.user.role !== 'admin' && String(seeker.user) !== String(req.user._id)) {
    throw ApiError.forbidden();
  }

  const filter = { seeker: seeker._id, ...(status ? { status } : {}) };
  const [items, total] = await Promise.all([
    Donation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Donation.countDocuments(filter),
  ]);

  return ok(res, items, { page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

/* ---------------------------- admin ---------------------------- */

export const adminListDonations = asyncHandler(async (req, res) => {
  const { page, limit, status, seekerId } = q(req);
  const filter = { ...(status ? { status } : {}), ...(seekerId ? { seeker: seekerId } : {}) };

  const [items, total] = await Promise.all([
    Donation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('seeker', 'name slug payments'),
    Donation.countDocuments(filter),
  ]);

  return ok(res, items, { page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
});

export const reviewDonation = asyncHandler(async (req, res) => {
  const donation = await Donation.findById(req.params.id);
  if (!donation) throw ApiError.notFound('Donation not found');
  if (donation.status !== 'pending') {
    throw ApiError.badRequest(`This donation is already ${donation.status}`);
  }

  const { status, statusNote } = req.body;

  if (status === 'verified') {
    const seeker = await Seeker.findById(donation.seeker);
    if (!seeker) throw ApiError.notFound('Seeker no longer exists');

    seeker.rollDailyWindow();
    seeker.stats.collectedToday += donation.amount;
    seeker.stats.collectedTotal += donation.amount;
    seeker.stats.donationCount += 1;
    seeker.stats.lastDonationAt = new Date();
    seeker.stats.todayKey = dhakaDateKey();
    await seeker.save();
  }

  donation.status = status;
  donation.statusNote = statusNote;
  donation.reviewedBy = req.user._id;
  donation.reviewedAt = new Date();
  await donation.save();

  return ok(res, donation);
});
