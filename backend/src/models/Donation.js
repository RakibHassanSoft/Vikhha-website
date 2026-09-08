import mongoose from 'mongoose';
import { PAYMENT_METHODS, DONATION_STATUSES, BD_MOBILE_RE, TRX_ID_RE } from '../utils/constants.js';

/**
 * A donation is a record of money the donor sent DIRECTLY to the seeker's
 * bKash/Nagad/Rocket personal number. The portal never touches the money; it
 * records the transaction id and an admin confirms it against the seeker's
 * statement. Nothing here simulates or imitates an MFS checkout.
 */
const donationSchema = new mongoose.Schema(
  {
    receiptNo: { type: String, required: true, unique: true, uppercase: true },

    seeker: { type: mongoose.Schema.Types.ObjectId, ref: 'Seeker', required: true, index: true },

    donor: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, trim: true, maxlength: 120, default: 'নাম প্রকাশে অনিচ্ছুক' },
      phone: {
        type: String,
        trim: true,
        validate: {
          validator: (v) => !v || BD_MOBILE_RE.test(v),
          message: 'Invalid Bangladeshi mobile number',
        },
      },
      isAnonymous: { type: Boolean, default: false },
    },

    amount: { type: Number, required: true, min: 1, max: 500000 },
    method: { type: String, enum: PAYMENT_METHODS, required: true, index: true },

    /** The number the donor sent FROM. */
    senderNumber: {
      type: String,
      required: true,
      trim: true,
      validate: { validator: (v) => BD_MOBILE_RE.test(v), message: 'Invalid sender number' },
    },
    /** The number the money was sent TO (snapshot of the seeker's number). */
    receiverNumber: { type: String, required: true, trim: true },

    trxId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      validate: { validator: (v) => TRX_ID_RE.test(v), message: 'Invalid transaction ID format' },
    },

    message: { type: String, trim: true, maxlength: 500 },
    duaText: { type: String, trim: true, maxlength: 600 },

    status: { type: String, enum: DONATION_STATUSES, default: 'pending', index: true },
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
        if (ret.donor?.isAnonymous) {
          ret.donor = { name: 'নাম প্রকাশে অনিচ্ছুক', isAnonymous: true };
        }
        return ret;
      },
    },
  }
);

// The same transaction id can never be claimed twice for the same method.
donationSchema.index({ method: 1, trxId: 1 }, { unique: true });
donationSchema.index({ status: 1, createdAt: -1 });
donationSchema.index({ seeker: 1, status: 1, createdAt: -1 });

export const Donation = mongoose.model('Donation', donationSchema);
