# Digital Vikha API

Express 4 + Mongoose 8 REST API. ES modules, Node 20+.

```
src/
├── server.js            boot: env check → db → listen, with graceful shutdown
├── app.js               express app (no db) — importable by tests
├── config/              env, db connection, cloudinary client
├── models/              User, Seeker, Donation
├── validators/          zod schemas, one per resource
├── middleware/          auth, validate, rate limits, upload, error handler
├── controllers/         request handling
├── routes/              route tables
├── services/            cloudinary + gemini integrations
├── utils/               ApiError, tokens, slugs, Dhaka-day helpers, constants
└── seed/                seed script and sample data
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Watch mode on port 5000 |
| `npm start` | Production start (Render uses this) |
| `npm run seed` | Create the admin user and sample seekers (idempotent) |
| `npm run seed:fresh` | Wipe seekers/donations/non-admin users, then seed |
| `npm test` | 67 offline tests — no database, no network |
| `npm run test:smoke` | End-to-end against a throwaway `<db>_test` database |

## A note on the two test suites

`npm test` runs three suites, none of which needs a database or network, so
they run in CI without any secrets:

- `tests/unit.test.js` — Dhaka-day arithmetic, slug and receipt generation, JWT
  round trips, validator behaviour, the Gemini fallback path.
- `tests/models.test.js` — schema validators, defaults, virtuals, indexes, and
  the `toJSON` transforms that keep password hashes, identity documents and
  anonymous donors from leaking. Also covers the live-location expiry rule, so a
  forgotten switch can never keep broadcasting. Mongoose validates in memory, so
  these catch most model bugs before you ever connect.
- `tests/routes.test.js` — routing, validation envelopes, auth guards, CORS,
  malformed JSON.

`npm run test:smoke` needs a real `MONGODB_URI`. It boots the app, walks the
whole donor→seeker→admin lifecycle, then drops the throwaway database it made.

## Error format

Every failure comes back the same shape, so the frontend can map problems onto
form fields without special cases:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [{ "field": "trxId", "message": "Transaction ID should be 6–20 letters/digits" }]
  }
}
```
