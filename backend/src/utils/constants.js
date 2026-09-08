export const ROLES = ['donor', 'seeker', 'admin'];

export const SEEKER_CATEGORIES = ['disabled', 'elderly', 'hafeez', 'artist', 'other'];

export const CATEGORY_LABELS_BN = {
  disabled: 'শারীরিক প্রতিবন্ধী',
  elderly: 'বয়স্ক ও কর্মক্ষমতাহীন',
  hafeez: 'অন্ধ হাফেজ / এতিমখানা',
  artist: 'পথশিল্পী ও বাউল',
  other: 'অসহায় সাহায্যপ্রার্থী',
};

export const SEEKER_STATUSES = ['pending', 'approved', 'rejected', 'suspended'];

export const PAYMENT_METHODS = ['bkash', 'nagad', 'rocket'];

export const DONATION_STATUSES = ['pending', 'verified', 'rejected'];

/** Bangladeshi mobile number: 11 digits starting 013–019. */
export const BD_MOBILE_RE = /^01[3-9]\d{8}$/;

/** MFS transaction ids are alphanumeric, typically 8–12 chars. */
export const TRX_ID_RE = /^[A-Z0-9]{6,20}$/;
