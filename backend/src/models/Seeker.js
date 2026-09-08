import mongoose from 'mongoose';
import {
  SEEKER_CATEGORIES,
  SEEKER_STATUSES,
  CATEGORY_LABELS_BN,
  BD_MOBILE_RE,
} from '../utils/constants.js';
import { dhakaDateKey } from '../utils/dhaka.js';

const paymentSchema = new mongoose.Schema(
  {
    bkash: {
      type: String,
      trim: true,
      validate: { validator: (v) => !v || BD_MOBILE_RE.test(v), message: 'Invalid bKash number' },
    },
    nagad: {
      type: String,
      trim: true,
      validate: { validator: (v) => !v || BD_MOBILE_RE.test(v), message: 'Invalid Nagad number' },
    },
    rocket: {
      type: String,
      trim: true,
      validate: { validator: (v) => !v || BD_MOBILE_RE.test(v), message: 'Invalid Rocket number' },
    },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    address: { type: String, required: true, trim: true, maxlength: 200 },
    district: { type: String, trim: true, maxlength: 60, default: 'ঢাকা', index: true },
    lat: { type: Number, min: 20.5, max: 26.7 },
    lng: { type: Number, min: 88.0, max: 92.7 },
    /** GPS accuracy in metres, as reported by the device that sent the fix. */
    accuracy: { type: Number, min: 0, max: 100000 },
    /** How the coordinates were obtained. */
    source: { type: String, enum: ['manual', 'device', 'live'], default: 'manual' },
    updatedAt: { type: Date },
  },
  { _id: false }
);

/**
 * Live sharing is opt-in and self-expiring: the seeker's device pings while the
 * switch is on, and a pin stops counting as live once the pings stop, so a
 * forgotten switch or a dead battery cannot leave someone permanently
 * broadcasting a stale position.
 */
const LIVE_TTL_MS = 10 * 60 * 1000;

const liveSchema = new mongoose.Schema(
  {
    isSharing: { type: Boolean, default: false },
    lastPingAt: { type: Date },
    startedAt: { type: Date },
  },
  { _id: false }
);

const seekerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true },

    category: { type: String, enum: SEEKER_CATEGORIES, required: true, index: true },
    story: { type: String, required: true, trim: true, minlength: 20, maxlength: 1200 },
    dua: { type: String, required: true, trim: true, maxlength: 400 },

    location: { type: locationSchema, required: true },
    live: { type: liveSchema, default: () => ({}) },
    payments: { type: paymentSchema, required: true },

    avatarUrl: { type: String, trim: true },
    avatarPublicId: { type: String, trim: true, select: false },
    // Identity/disability proof, only ever exposed to admins.
    proofUrl: { type: String, trim: true, select: false },
    proofPublicId: { type: String, trim: true, select: false },

    dailyTarget: { type: Number, required: true, min: 100, max: 20000 },

    stats: {
      collectedToday: { type: Number, default: 0, min: 0 },
      collectedTotal: { type: Number, default: 0, min: 0 },
      donationCount: { type: Number, default: 0, min: 0 },
      todayKey: { type: String, default: () => dhakaDateKey() },
      lastDonationAt: { type: Date },
    },

    status: { type: String, enum: SEEKER_STATUSES, default: 'pending', index: true },
    statusNote: { type: String, trim: true, maxlength: 300 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

seekerSchema.index({ name: 'text', story: 'text', 'location.address': 'text' });
seekerSchema.index({ status: 1, category: 1, createdAt: -1 });
seekerSchema.index({ status: 1, 'live.isSharing': 1, 'live.lastPingAt': -1 });

seekerSchema.virtual('categoryLabel').get(function categoryLabel() {
  return CATEGORY_LABELS_BN[this.category] || CATEGORY_LABELS_BN.other;
});

/** True only while the switch is on AND a fix arrived recently. */
seekerSchema.virtual('isLive').get(function isLive() {
  if (!this.live?.isSharing || !this.live?.lastPingAt) return false;
  return Date.now() - new Date(this.live.lastPingAt).getTime() < LIVE_TTL_MS;
});

seekerSchema.virtual('progressPercent').get(function progressPercent() {
  if (!this.dailyTarget) return 0;
  const today = this.stats?.todayKey === dhakaDateKey() ? this.stats.collectedToday : 0;
  return Math.min(100, Math.round((today / this.dailyTarget) * 100));
});

/** Rolls the daily counter over when the Bangladesh day has changed. */
seekerSchema.methods.rollDailyWindow = function rollDailyWindow() {
  const key = dhakaDateKey();
  if (this.stats.todayKey !== key) {
    this.stats.todayKey = key;
    this.stats.collectedToday = 0;
  }
  return this;
};

export const Seeker = mongoose.model('Seeker', seekerSchema);

export { LIVE_TTL_MS };
