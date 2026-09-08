'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Deliberately built on the Leaflet API directly rather than react-leaflet.
 *
 * React StrictMode runs every effect setup → cleanup → setup again in
 * development, and react-leaflet's MapContainer throws "Map container is
 * already initialized" on that second pass because it hands Leaflet a DOM node
 * it already owns. Owning the instance here means the cleanup below really does
 * tear the map down, so a remount — StrictMode, fast refresh, or a route
 * change — always starts from a clean container. It also drops a dependency
 * whose peer range is pinned to React 18.
 */

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Leaflet's default marker points at bundled image files that Next does not
 *  resolve, so the pin is an inline SVG instead. */
const pinIcon = L.divIcon({
  className: 'vikha-pin',
  html: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 27 15 27s15-16 15-27c0-8.3-6.7-15-15-15z" fill="#10b981"/>
    <circle cx="15" cy="15" r="6" fill="#022c22"/>
  </svg>`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
});

const DHAKA = [23.7806, 90.4074];

export default function PinMap({ lat, lng, accuracy, onPick, height = 260 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  // Held in a ref so a new callback identity never forces the map to rebuild.
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const hasFix = Number.isFinite(lat) && Number.isFinite(lng);

  /* ------------------------- create once, destroy once ------------------------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    // Belt and braces: if a previous instance left its marker on the node,
    // clear it so initialisation cannot fail.
    if (el._leaflet_id) delete el._leaflet_id;

    const map = L.map(el, {
      center: DHAKA,
      zoom: 12,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);

    map.on('click', (e) => {
      onPickRef.current?.(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    });

    mapRef.current = map;

    // The container is often still being laid out on first paint (it lives
    // inside a form section that has just appeared), which leaves Leaflet with
    // zero size and a grey box. One invalidate after layout settles fixes it.
    const settle = setTimeout(() => map.invalidateSize(), 120);

    return () => {
      clearTimeout(settle);
      map.off();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, []);

  /* --------------------------- sync the pin and view --------------------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!hasFix) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (circleRef.current) {
        circleRef.current.remove();
        circleRef.current = null;
      }
      return;
    }

    const position = [lat, lng];

    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    } else {
      const marker = L.marker(position, { icon: pinIcon, draggable: true }).addTo(map);
      marker.on('dragend', (e) => {
        const p = e.target.getLatLng();
        onPickRef.current?.(Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6)));
      });
      markerRef.current = marker;
    }

    if (accuracy > 0) {
      const radius = Math.min(accuracy, 500);
      if (circleRef.current) {
        circleRef.current.setLatLng(position).setRadius(radius);
      } else {
        circleRef.current = L.circle(position, {
          radius,
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.12,
          weight: 1,
        }).addTo(map);
      }
    } else if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }

    map.setView(position, Math.max(map.getZoom(), 15), { animate: true });
  }, [lat, lng, accuracy, hasFix]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full rounded-2xl border border-slate-800"
      aria-label="অবস্থান নির্বাচনের ম্যাপ"
    />
  );
}
