import { env, assertEnv } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Seeker } from '../models/Seeker.js';
import { Donation } from '../models/Donation.js';
import { uniqueSlug } from '../utils/slug.js';
import { dhakaDateKey } from '../utils/dhaka.js';
import { seekers as seedSeekers } from './data.js';

const fresh = process.argv.includes('--fresh');

async function upsertAdmin() {
  let admin = await User.findOne({ email: env.admin.email });
  if (!admin) {
    admin = new User({ name: env.admin.name, email: env.admin.email, role: 'admin' });
    await admin.setPassword(env.admin.password);
    await admin.save();
    console.log(`[seed] admin created -> ${admin.email} / ${env.admin.password}`);
  } else {
    console.log(`[seed] admin already exists -> ${admin.email}`);
  }
  return admin;
}

async function main() {
  assertEnv();
  await connectDB();

  if (fresh) {
    await Promise.all([
      Donation.deleteMany({}),
      Seeker.deleteMany({}),
      User.deleteMany({ role: { $ne: 'admin' } }),
    ]);
    console.log('[seed] cleared seekers, donations and non-admin users');
  }

  const admin = await upsertAdmin();

  let inserted = 0;
  for (const s of seedSeekers) {
    const exists = await Seeker.findOne({ name: s.name });
    if (exists) continue;

    await Seeker.create({
      ...s,
      slug: uniqueSlug(s.name),
      status: 'approved',
      reviewedBy: admin._id,
      reviewedAt: new Date(),
      stats: {
        collectedToday: 0,
        collectedTotal: 0,
        donationCount: 0,
        todayKey: dhakaDateKey(),
      },
    });
    inserted += 1;
  }

  const total = await Seeker.countDocuments();
  console.log(`[seed] inserted ${inserted} seekers (${total} total in db)`);

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
