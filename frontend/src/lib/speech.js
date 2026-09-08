/**
 * Speaks a Bangla dua using the browser's speech synthesis. Voice support for
 * bn-BD varies a lot between browsers, so we pick the best available voice and
 * report back whether anything could actually be spoken.
 */
export function speakBangla(text, { rate = 0.9, pitch = 1 } = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { ok: false, reason: 'unsupported' };
  }
  if (!text) return { ok: false, reason: 'empty' };

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'bn-BD';
  utterance.rate = rate;
  utterance.pitch = pitch;

  const voices = window.speechSynthesis.getVoices() || [];
  const voice =
    voices.find((v) => v.lang === 'bn-BD') ||
    voices.find((v) => v.lang?.startsWith('bn')) ||
    voices.find((v) => v.lang?.startsWith('hi'));
  if (voice) utterance.voice = voice;

  window.speechSynthesis.speak(utterance);
  return { ok: true, voice: voice?.name || null };
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
