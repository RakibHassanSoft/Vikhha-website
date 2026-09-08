'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { taka, timeAgoBn } from '@/lib/bn';

/**
 * Built on the Leaflet API directly for the same reason as PinMap: owning the
 * instance means the effect cleanup genuinely destroys it, so StrictMode's
 * double mount, fast refresh and route changes can never hand Leaflet a
 * container it already initialised.
 */

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const CATEGORY_COLORS = {
  disabled: '#f43f5e',
  elderly: '#f59e0b',
  hafeez: '#14b8a6',
  artist: '#818cf8',
  other: '#10b981',
};

const BD_CENTER = [23.777, 90.4];

/** Someone sharing live gets a pulsing halo, so a donor can tell at a glance
 *  who is out there right now versus whose pin is a remembered spot. */
const liveIcon = L.divIcon({
  className: 'vikha-live-pin',
  html: `<span style="position:relative;display:flex;align-items:center;justify-content:center;width:26px;height:26px">
    <span style="position:absolute;width:26px;height:26px;border-radius:9999px;background:#34d39955;animation:vikha-ping 1.8s cubic-bezier(0,0,0.2,1) infinite"></span>
    <span style="position:relative;width:12px;height:12px;border-radius:9999px;background:#34d399;border:2px solid #022c22"></span>
  </span>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

/** Popups are real DOM so the donate button can carry a listener rather than
 *  an inline handler on an HTML string. */
function buildPopup(seeker, onDonate) {
  const root = document.createElement('div');
  root.className = 'min-w-[200px] space-y-2';

  const name = document.createElement('p');
  name.className = 'text-sm font-bold text-white';
  name.textContent = seeker.name;
  root.appendChild(name);

  if (seeker.isLive) {
    const live = document.createElement('p');
    live.className = 'text-[11px] font-semibold text-emerald-400';
    live.textContent = `● এখন লাইভ · ${timeAgoBn(seeker.live?.lastPingAt)} আপডেট`;
    root.appendChild(live);
  }

  const address = document.createElement('p');
  address.className = 'text-xs text-slate-400';
  address.textContent = `📍 ${seeker.location.address}`;
  root.appendChild(address);

  const progress = document.createElement('p');
  progress.className = 'text-xs text-slate-300';
  progress.textContent = `আজ: ${taka(seeker.stats?.collectedToday || 0)} / ${taka(seeker.dailyTarget)}`;
  root.appendChild(progress);

  const button = document.createElement('button');
  button.type = 'button';
  button.className =
    'w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500';
  button.textContent = 'সদকা দিন';
  button.addEventListener('click', () => onDonate?.(seeker));
  root.appendChild(button);

  return root;
}

export default function SeekerMap({ seekers = [], onDonate }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  const onDonateRef = useRef(onDonate);
  onDonateRef.current = onDonate;

  /* ------------------------- create once, destroy once ------------------------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    if (el._leaflet_id) delete el._leaflet_id;

    const map = L.map(el, { center: BD_CENTER, zoom: 7, scrollWheelZoom: true });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const settle = setTimeout(() => map.invalidateSize(), 120);

    return () => {
      clearTimeout(settle);
      map.off();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  /* ------------------------------ redraw markers ------------------------------ */
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    seekers.forEach((seeker) => {
      const { lat, lng } = seeker.location || {};
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const position = [lat, lng];
      const color = CATEGORY_COLORS[seeker.category] || CATEGORY_COLORS.other;

      const marker = seeker.isLive
        ? L.marker(position, { icon: liveIcon })
        : L.circleMarker(position, {
            radius: 9,
            color,
            fillColor: color,
            fillOpacity: 0.6,
            weight: 2,
          });

      marker.bindTooltip(`${seeker.isLive ? '● ' : ''}${seeker.name}`, {
        direction: 'top',
        offset: [0, -10],
      });

      // Built lazily so a map of many pins does not construct every popup up front.
      marker.bindPopup(() => buildPopup(seeker, onDonateRef.current));

      marker.addTo(layer);
    });
  }, [seekers]);

  return (
    <div
      ref={containerRef}
      className="h-[460px] w-full rounded-2xl border border-slate-800"
      aria-label="সাহায্যপ্রার্থীদের ম্যাপ"
    />
  );
}
