/**
 * Geolocation helpers.
 *
 * Reverse geocoding uses OpenStreetMap's Nominatim, which is free and needs no
 * API key. Their usage policy caps it at one request per second, so it is only
 * ever called after a deliberate user action (turning sharing on, or dropping
 * the pin) — never on a timer and never during live tracking.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';

/** Rough bounding box of Bangladesh — matches the backend's validators. */
export const BD_BOUNDS = { minLat: 20.5, maxLat: 26.7, minLng: 88.0, maxLng: 92.7 };

export const DHAKA = { lat: 23.7806, lng: 90.4074 };

export function isInsideBangladesh(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= BD_BOUNDS.minLat &&
    lat <= BD_BOUNDS.maxLat &&
    lng >= BD_BOUNDS.minLng &&
    lng <= BD_BOUNDS.maxLng
  );
}

export const GEO_ERRORS = {
  1: 'অবস্থানের অনুমতি দেওয়া হয়নি। ব্রাউজারের ঠিকানা বারের পাশে 🔒 চিহ্নে ক্লিক করে "Location" চালু করুন।',
  2: 'অবস্থান পাওয়া যায়নি। জিপিএস চালু আছে কিনা দেখে আবার চেষ্টা করুন।',
  3: 'অবস্থান নিতে সময় বেশি লাগছে। খোলা জায়গায় গিয়ে আবার চেষ্টা করুন।',
};

export function geoErrorMessage(err) {
  return GEO_ERRORS[err?.code] || 'অবস্থান নেওয়া যায়নি। আবার চেষ্টা করুন।';
}

/** Promise wrapper around getCurrentPosition. */
export function getCurrentPosition({ timeout = 15000, highAccuracy = true } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(Object.assign(new Error('unsupported'), { code: 0 }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : undefined,
        }),
      reject,
      { enableHighAccuracy: highAccuracy, timeout, maximumAge: 0 }
    );
  });
}

/** Turns coordinates into a readable Bangla address. Never throws. */
export async function reverseGeocode(lat, lng, { signal } = {}) {
  try {
    const url = `${NOMINATIM}?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=bn&zoom=17`;
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;

    const json = await res.json();
    const a = json.address || {};
    const parts = [
      a.road || a.pedestrian || a.neighbourhood || a.suburb,
      a.suburb && a.suburb !== a.neighbourhood ? a.suburb : null,
      a.city || a.town || a.village || a.county,
    ].filter(Boolean);

    const district = a.state_district || a.city || a.county || a.state || '';
    const address = parts.length ? parts.join(', ') : json.display_name?.split(',').slice(0, 3).join(',');

    return {
      address: address?.slice(0, 200) || null,
      district: district.replace(/\s*(District|জেলা)\s*$/i, '').slice(0, 60) || null,
    };
  } catch {
    return null;
  }
}

/** Metres between two coordinates (haversine) — used to skip tiny live updates. */
export function distanceMetres(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
