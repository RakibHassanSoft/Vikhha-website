import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { generateDua } from '../services/gemini.service.js';
import { Seeker } from '../models/Seeker.js';
import { env } from '../config/env.js';

export const dua = asyncHandler(async (req, res) => {
  const { seekerId, ...rest } = req.body;

  let seekerName;
  let category = rest.category;
  if (seekerId) {
    const seeker = await Seeker.findById(seekerId).select('name category');
    if (seeker) {
      seekerName = seeker.name;
      category = category || seeker.category;
    }
  }

  const result = await generateDua({ ...rest, category, seekerName });
  return ok(res, result);
});

export const aiStatus = asyncHandler(async (_req, res) =>
  ok(res, { enabled: env.gemini.enabled, model: env.gemini.enabled ? env.gemini.model : null })
);
