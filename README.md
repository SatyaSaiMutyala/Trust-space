# TruSpace

Facilities and lease management for TrustLab Diagnostics — premises, leases, rent and invoices, joint inspections, repairs, owner messages, exits, site scouting and franchise partners.

| Folder | Stack | Dev URL |
| --- | --- | --- |
| `web/` | React 19 + Vite + MUI, Redux Toolkit (RTK Query) | http://localhost:5173 |
| `backend/` | Node 20 + Express 5 + MongoDB (Mongoose), files in AWS S3 | http://localhost:5000/api |
| `reference/` | The original single-file prototype the web app was ported from | — |

## Run locally

```bash
# 1. API — with MongoDB installed (or MONGODB_URI pointing to Atlas):
cd backend && npm install && cp .env.example .env
npm run seed          # sample portfolio + sample accounts
npm run dev

#    …or without MongoDB: an in-memory database with the sample data (lost when stopped)
npm run dev:memory    # set STORAGE_DRIVER=local in .env if S3 keys are not set yet

# 2. Web — in a second terminal (Vite proxies /api to http://localhost:5000)
cd web && npm install && npm run dev
```

Sign in with `admin@trustlab.example` / `Trust@1234` (also `facilities@trustlab.example`, any sample owner email such as `sr.kondapalli@example.com` or mobile `98480 11223`, and partner emails such as `medpoint@example.com`).

## How the web app talks to the API

- **State:** Redux Toolkit — `web/src/app/` (`store.js`, `slices.js`: auth, notify, entities, lists; `api.js`: RTK Query).
- **Sign-in:** `/api/auth/*`. The access token lives in memory, and an httpOnly cookie keeps the session; the client renews tokens automatically.
- **Messages:** every success or error from the API is shown in the snackbar with the API's own `message`.
- **Lists:** `components/list/useServerList` + `ListControls` give each list server-side search, filters, date ranges and pagination (`?search=&page=&limit=&from=&to=&…`). The params are kept in Redux.
- **Records for calculations:** after sign-in, every record the user may see is loaded (the API limits it by role) for the overview figures, rent roll, ledgers and statuses. Edits go through `save()` / `remove()` (`store/store.js`) → RTK Query → API.
- **Files:** uploads go to `/api/assets` → S3. Images and videos load through `/api/assets/:id/file?t=<media token>`.

API reference: [backend/API.md](backend/API.md) · Porting notes: [web/PORTING.md](web/PORTING.md)

## Tests

```bash
cd backend && npm test   # API tests on an in-memory MongoDB
cd web && npx oxlint src && npm run build
```
