import { env } from '../config/env.js';

/**
 * Bangla dua generation. Gemini is optional: when no key is configured (or the
 * call fails) we fall back to a curated local pool, so the endpoint never 500s
 * and the UI always has something to speak aloud.
 */

const OCCASION_HINT = {
  general: 'সাধারণ সদকা কবুল ও বরকতের দোয়া',
  parents: 'দানকারীর মা-বাবার মাগফিরাত ও জান্নাতের দোয়া',
  health: 'সুস্থতা, শেফা ও দীর্ঘায়ুর দোয়া',
  rizq: 'রিজিক বৃদ্ধি ও অভাব দূর হওয়ার দোয়া',
  business: 'ব্যবসায় উন্নতি ও বরকতের দোয়া',
  exam: 'পরীক্ষায় সাফল্য ও জ্ঞান বৃদ্ধির দোয়া',
  travel: 'নিরাপদ সফর ও হেফাজতের দোয়া',
};

const FALLBACK = {
  general: [
    'আল্লাহ্ আপনার এই দান কবুল করুন এবং আপনার সম্পদে বরকত দান করুন।',
    'আপনার দানের বিনিময়ে আল্লাহ্ আপনাকে উত্তম প্রতিদান দিন, আমীন।',
  ],
  parents: [
    'হে আল্লাহ্, এই দানকারীর মা-বাবাকে ক্ষমা করে দিন ও জান্নাতুল ফেরদাউস নসিব করুন।',
    'আল্লাহ্ আপনার মা-বাবার কবর নূরে ভরে দিন এবং তাঁদের মাগফিরাত দান করুন।',
  ],
  health: [
    'আল্লাহ্ আপনাকে ও আপনার পরিবারকে সুস্থতা দান করুন এবং হায়াতে বরকত দিন।',
    'আল্লাহ্ আপনার সব রোগ-ব্যাধি দূর করে পূর্ণ শেফা দান করুন।',
  ],
  rizq: [
    'আল্লাহ্ আপনার রিজিকে বরকত দিন এবং অভাব-অনটন দূর করে দিন।',
    'আল্লাহ্ আপনাকে হালাল রিজিকে পরিপূর্ণ করে দিন, আমীন।',
  ],
  business: [
    'আল্লাহ্ আপনার ব্যবসায় তরক্কী দান করুন এবং সব বাধা দূর করে দিন।',
    'আল্লাহ্ আপনার হালাল উপার্জনে অফুরন্ত বরকত দান করুন।',
  ],
  exam: [
    'আল্লাহ্ আপনার জ্ঞান বৃদ্ধি করুন এবং সাফল্য দান করুন।',
    'আল্লাহ্ আপনার পরিশ্রম কবুল করুন ও উত্তম ফলাফল দান করুন।',
  ],
  travel: [
    'আল্লাহ্ আপনার সফর নিরাপদ করুন এবং সব বিপদ থেকে হেফাজত করুন।',
    'আল্লাহ্ আপনাকে ও আপনার পরিবারকে সর্বদা হেফাজতে রাখুন।',
  ],
};

function fallbackDua(occasion = 'general') {
  const pool = FALLBACK[occasion] || FALLBACK.general;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildPrompt({ donorName, amount, occasion, category, tone, seekerName }) {
  const lengthHint =
    tone === 'short' ? 'সর্বোচ্চ ১টি বাক্য' : tone === 'formal' ? '২টি বাক্য, শালীন ও আনুষ্ঠানিক' : '১-২টি বাক্য, আন্তরিক ও উষ্ণ';

  return [
    'তুমি একজন বাংলাদেশি সাহায্যপ্রার্থীর পক্ষ থেকে দানকারীর জন্য দোয়া লিখছ।',
    'নিয়ম:',
    '- শুধুমাত্র বাংলা ভাষায় লেখো।',
    `- ${lengthHint}।`,
    '- কোনো ভূমিকা, উদ্ধৃতি চিহ্ন, ইমোজি, তালিকা বা ব্যাখ্যা দিও না — শুধু দোয়াটুকু লেখো।',
    '- সম্মানজনক, আন্তরিক ও সহজ ভাষা ব্যবহার করো।',
    '- টাকার অঙ্ক উল্লেখ করো না।',
    '',
    'প্রসঙ্গ:',
    `- দোয়ার ধরন: ${OCCASION_HINT[occasion] || OCCASION_HINT.general}`,
    donorName ? `- দানকারীর নাম: ${donorName}` : null,
    seekerName ? `- সাহায্যপ্রার্থীর নাম: ${seekerName}` : null,
    category ? `- সাহায্যপ্রার্থীর শ্রেণী: ${category}` : null,
    amount ? '- দানকারী আজ সদকা দিয়েছেন।' : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function generateDua(input = {}) {
  const occasion = input.occasion || 'general';

  if (!env.gemini.enabled) {
    return { text: fallbackDua(occasion), source: 'fallback' };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.gemini.model}:generateContent`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.gemini.apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 200, topP: 0.95 },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      // eslint-disable-next-line no-console
      console.warn(`[gemini] ${res.status} ${body.slice(0, 200)}`);
      return { text: fallbackDua(occasion), source: 'fallback' };
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .join('')
      .trim()
      .replace(/^["'“”]|["'“”]$/g, '');

    if (!text) return { text: fallbackDua(occasion), source: 'fallback' };
    return { text, source: 'gemini' };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[gemini] request failed:', err.message);
    return { text: fallbackDua(occasion), source: 'fallback' };
  } finally {
    clearTimeout(timer);
  }
}
