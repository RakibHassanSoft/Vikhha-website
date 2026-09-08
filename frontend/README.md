# Digital Vikha — frontend

Next.js 16 (App Router, Turbopack), React 18, Tailwind, JavaScript. Bangla-first
UI, dark theme.

```
src/
├── app/
│   ├── page.js                    directory + search + filters
│   ├── map/                       Leaflet map of seeker locations
│   ├── seekers/[slug]/            public profile (server-rendered for SEO)
│   ├── register/                  seeker registration
│   ├── dashboard/                 seeker's own profile + received donations
│   ├── donations/                 donor's history
│   ├── receipt/[receiptNo]/       public receipt
│   ├── admin/                     verification queues
│   ├── login/, signup/            auth
│   └── dua/                       dua generator + speech playback
├── components/                    Navbar, DonateModal, SeekerCard, Modal,
│                                  LocationPicker, LiveLocationToggle, PinMap, …
└── lib/
    ├── api.js                     fetch wrapper + typed endpoint map
    ├── auth.jsx                   AuthProvider / useAuth
    ├── bn.js                      Bangla numerals, currency, dates
    ├── constants.js               categories, methods, labels
    ├── geo.js                     geolocation, reverse geocoding, distance
    └── speech.js                  Bangla speech synthesis
```

## Notes

- **Bangla numerals everywhere.** `lib/bn.js` converts numbers, currency and
  dates; the UI never shows raw ASCII digits except for phone numbers and
  transaction IDs, where the literal characters matter.
- **The profile page is server-rendered** (`revalidate = 30`) so a shared link
  has a real title, description and preview image. Everything else is a client
  component.
- **The maps are written against the Leaflet API directly, not react-leaflet.**
  React StrictMode runs every effect setup → cleanup → setup again in
  development, and react-leaflet's `MapContainer` throws *"Map container is
  already initialized"* on that second pass because it hands Leaflet a DOM node
  it already owns. Owning the instance ourselves means the effect cleanup really
  does call `map.remove()`, so StrictMode, fast refresh and route changes all
  start from a clean container. It also removes a dependency whose peer range is
  capped at React 18.
- **The map only mounts after hydration.** Leaflet touches `window` at import
  time, so map components are loaded with `next/dynamic({ ssr: false })`.
- **Dynamic route `params` are awaited.** Next 15+ passes them as a Promise.
  Server components `await params` (harmless on a plain object, so it is also
  correct on Next 14); the one client component that needs them unwraps with
  `use()` only when it really is a Promise — `use` is the single hook React
  permits to be called conditionally.
- **Modals render through a portal on `<body>`.** The page has a sticky header
  and backdrop-blurred cards, either of which can trap a `position: fixed`
  overlay or out-rank it in the stacking order.
- **The font is loaded with a plain `<link>`,** not `next/font`, so the
  production build never fails because Google Fonts is unreachable from a build
  machine.
- **The donation flow never asks for a PIN.** It walks the donor through
  sending money in their own MFS app and then collects the transaction ID.
- **Nobody types coordinates.** `LocationPicker` is one switch: permission →
  pin → draggable correction → reverse-geocoded address. Manual pin placement
  stays reachable the entire time, including while the GPS is still searching,
  because a phone with no fix can otherwise leave the person waiting with no way
  forward.
- **`LiveLocationToggle` throttles hard** — a ping only after ~30s *and* ~20m of
  movement — and always releases the GPS watch on unmount, so leaving the page
  cannot leave a `watchPosition` running.
- **The profile page refreshes itself once on arrival.** It is server-rendered
  and cached for 30 seconds for SEO, which is fine for the story and photo but
  would make "এখন লাইভ" and today's total read as current while being stale.

## Commands

```bash
npm install     # run this after pulling — react-leaflet was removed
npm run dev     # http://localhost:3000
npm run build   # production build
npm start       # serve the production build
```

Next 16 removed the `next lint` command, so there is no `lint` script; run
ESLint directly if you add a config.

`NEXT_PUBLIC_API_URL` must include the `/api/v1` suffix.
