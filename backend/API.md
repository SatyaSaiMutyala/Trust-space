# TruSpace API

Node 20 + Express 5 + MongoDB (Mongoose). Base URL: `http://localhost:5000/api`

## Run

```bash
cd backend
npm install
cp .env.example .env            # set MONGODB_URI if MongoDB is not on localhost
npm run seed                    # load the sample portfolio (replaces existing data)
npm run dev                     # API with auto-restart
npm run dev:memory              # no MongoDB installed? in-memory database + sample data (lost on stop)
npm test                        # API tests on an in-memory database
```

## Response format

Every response — success or error — has the same envelope. `message` is plain language meant to be shown to the user exactly as sent.

```json
{
  "success": true,
  "message": "3 properties found for “hyd” · showing 1–2.",
  "data": [ ... ],
  "pagination": { "page": 1, "limit": 2, "total": 3, "totalPages": 2, "hasNext": true, "hasPrev": false }
}
```

Errors add `code` (machine-readable) and, for validation, `errors` (field → message):

```json
{
  "success": false,
  "message": "Please fix 2 fields: Owner name is required; Owner type must be one of: Individual, HUF, Company, LLP, Firm, Trust.",
  "code": "validation_failed",
  "errors": { "name": "Owner name is required", "kind": "Owner type must be one of: …" }
}
```

| Status | When | `code` |
| --- | --- | --- |
| 200 / 201 | OK / created | — |
| 400 | invalid field, query param or JSON | `validation_failed` |
| 401 | not signed in / session expired or ended | `unauthenticated`, `token_expired`, `session_ended`, `invalid_credentials` |
| 403 | not allowed for this role, or account disabled | `forbidden`, `account_disabled` |
| 404 | record or route not found | `not_found` |
| 423 / 429 | account locked after failed sign-ins / too many sign-in requests | `account_locked`, `rate_limited` |
| 409 | duplicate (site code, lease ref, invoice number…), id taken, or delete blocked by linked records | `conflict`, `has_dependents` |
| 413 / 415 | upload too large / wrong file type | `too_large`, `unsupported_type` |
| 503 | database unreachable | — |

## Sign-in — `/api/auth`

All data APIs (`/api/<resource>`, `/api/assets`, `/api/users`) need `Authorization: Bearer <accessToken>`. Only `/api/health` and `/api/auth/*` are public.

| Method | Path | Body | Does |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | `{ login, password, remember }` | `login` = email **or** mobile number. Returns `{ user, accessToken, tokenType, expiresIn, sessionExpiresAt }` and sets the `ts_refresh` httpOnly cookie |
| POST | `/api/auth/refresh` | — (cookie) | new access token; the refresh token rotates on every use |
| POST | `/api/auth/logout` | — (cookie) | ends this session (its access tokens stop working at once) |
| POST | `/api/auth/logout-all` | — | ends every session of the signed-in user |
| GET | `/api/auth/me` | — | the signed-in user |
| POST | `/api/auth/forgot-password` | `{ login }` | always the same reply, so nobody can check which accounts exist. Outside production the reply includes `devResetToken` / `devResetLink` (email/SMS delivery is not connected yet) |
| POST | `/api/auth/reset-password` | `{ token, password }` | sets the new password and signs out everywhere |
| POST | `/api/auth/change-password` | `{ currentPassword, newPassword }` | keeps this session (returns a fresh `accessToken`), ends the others |

- **Access token:** JWT, 15 minutes (`ACCESS_TOKEN_TTL`). Keep it in memory; call `/refresh` when it expires (`code: "token_expired"`).
- **Session:** 1 day, or 30 days with “Remember me” (`REFRESH_DAYS`, `REMEMBER_DAYS`); stored as a hash in `sessions`, removed automatically when expired.
- **Passwords:** scrypt hashes; at least 8 characters with a letter and a number.
- **Protection:** 5 wrong passwords lock the account for 15 minutes (`code: "account_locked"`, status `423`); max 30 sign-in requests per device per 15 minutes (`429`).
- **Roles:** `admin`, `staff` (TrustLab), `owner` (linked `ownerId`), `franchisee` (linked `partnerId`).
- Example messages: “Welcome back, Srinivasa.”, “The email/mobile number or password is incorrect. 2 attempts left before the account is locked for 15 minutes.”, “Your session has expired. Please sign in again.”

## Accounts — `/api/users` (admins and TrustLab staff)

| Method | Path | Does |
| --- | --- | --- |
| GET | `/api/users?search=&page=&limit=&role=&status=&ownerId=&partnerId=` | list accounts (search name, email, mobile) |
| GET | `/api/users/:id` | one account |
| POST | `/api/users` | `{ name, email?, phone?, role, ownerId?, partnerId?, password? }` — without `password` a temporary one is generated and returned once as `temporaryPassword` |
| PATCH | `/api/users/:id` | change name, email, phone, role, links or `status` (`active` / `disabled`; disabling signs them out) |
| DELETE | `/api/users/:id` | delete (not your own) |
| POST | `/api/users/:id/unlock` | clear a failed-sign-in lock |
| POST | `/api/users/:id/reset-password` | new temporary password; signs them out everywhere |

Staff can manage owner and franchise-partner accounts; only admins can create or change admin and staff accounts. Password hashes are never returned.

**Sample accounts** (`npm run seed` / `npm run dev:memory`), password `Trust@1234` (`SEED_PASSWORD`): `admin@trustlab.example` (admin), `facilities@trustlab.example` (staff), every owner email (e.g. `sr.kondapalli@example.com`, or mobile `98480 11223`) and partner email (e.g. `medpoint@example.com`).

## Resources

All resources share the same endpoints:

| Method | Path | Does |
| --- | --- | --- |
| GET | `/api/<resource>?search=&page=&limit=&sort=&order=&from=&to=&<filters>` | list (paginated) |
| GET | `/api/<resource>/:id` | one record |
| POST | `/api/<resource>` | create (id optional — generated if missing) |
| PUT | `/api/<resource>/:id` | create or replace the whole record (what the web app's *save* does) |
| PATCH | `/api/<resource>/:id` | update only the fields sent |
| DELETE | `/api/<resource>/:id` | delete (blocked while linked records exist) |

### List query parameters (every GET list)

| Param | Example | Notes |
| --- | --- | --- |
| `search` | `search=noida` | partial, case-insensitive, across the resource's search fields |
| `page` | `page=2` | starts at 1 |
| `limit` | `limit=10` | 1–100, default 10 |
| `sort`, `order` | `sort=date&order=desc` | any field; default per resource |
| `from`, `to` | `from=2026-04-01&to=2027-03-31` | on the resource's date field (inclusive) |
| filters | `status=Paid,Approved&propertyId=p1` | exact match; comma = any of |

| Resource | Search fields | Filters | Date field | Default sort |
| --- | --- | --- | --- | --- |
| `properties` | name, code, city, state, address, branch, type | status, type, city, state, ownerId, managedBy, partnerId, branch | — | name ↑ |
| `owners` | name, phone, email, pan, gstin, addr.city, bankName | kind, partnerId, bankVerified (bool), bankPending (bool), prefContact | — | name ↑ |
| `leases` | ref, clauses | propertyId, ownerId, status, gstMode, payTiming, registered (bool) | start | start ↓ |
| `invoices` | number, desc, type, utr, period | propertyId, leaseId, ownerId, type, status, period, source | date | date ↓ |
| `tickets` | no, title, category, assignee, raisedBy | propertyId, status, priority, responsibility, category | createdAt | createdAt ↓ |
| `messages` | text, by, kind | propertyId, ownerId, from, kind | at | at ↓ |
| `inspections` | inspector, ownerRep, kind, status | propertyId, leaseId, ownerId, kind, status | date | date ↓ |
| `sites` | name, code, locality, city, address, ownerName, broker, scoutedBy | reqId, stage, purpose, city, propertyId, leaseId | scoutedOn | scoutedOn ↓ |
| `reqs` (scouting requirements) | code, city, area, purpose, reason, raisedBy | city, state, purpose, priority, status, model, partnerId | raisedOn | raisedOn ↓ |
| `partners` (franchise) | name, contact, city, email, phone, agreementRef | status, model, city, premisesMgmt (bool) | — | name ↑ |
| `people` (portal access) | label, uid | role, ownerId, partnerId | — | label ↑ |

### Rules checked on save

- **Required:** properties (name, code, address, city) · owners (name) · leases (ref, propertyId, start, end, rent) · invoices (number, propertyId, leaseId, type, period, date, base) · tickets (no, propertyId, title, priority) · messages (propertyId, from, text) · inspections (kind, propertyId, leaseId) · sites (code, reqId) · reqs (code, city, area, purpose, reason) · partners (name) · people (uid, role)
- **Allowed values** (statuses, types, priorities…) and **numbers** (rent, deposit, amounts…) are validated.
- **Links must exist:** e.g. a lease's `propertyId`, an invoice's `leaseId`, a site's `reqId`.
- **Unique:** property code, lease ref, ticket number, site code, requirement code, invoice number per owner, portal user uid.
- **Delete protection:** a property with leases/tickets/invoices, an owner with properties/leases, a lease with invoices/inspections, a requirement with sites, a partner with requirements/premises.
- Records keep the web app's ids (`p1`, `l3`, generated ids). `createdAt` is kept, `updatedAt` is set on every save.

## Files — `/api/assets` (stored in AWS S3, bucket `trust-space`)

| Method | Path | Does |
| --- | --- | --- |
| POST | `/api/assets` | upload one file, multipart field `file`; photos, videos, PDF; max 20 MB |
| GET | `/api/assets?search=&page=&limit=&type=image\|video\|pdf` | list uploads |
| GET | `/api/assets/:id` | file details; for S3 also `downloadUrl` (signed, valid `S3_URL_EXPIRES` seconds) |
| GET | `/api/assets/:id/file` | the file itself — S3: `302` redirect to a short-lived signed URL; local: streamed |
| DELETE | `/api/assets/:id` | delete the record and the stored file |

Upload response `data`: `{ id, name, type, size, storage: "s3", bucket: "trust-space", key: "uploads/2026/10/<id>.jpg", url: "/api/assets/<id>/file", createdAt }`.
Use `url` (prefixed with the API host) in `<img>`, `<video>` and links — it always resolves to the current file, so the bucket can stay private.

### S3 setup

Settings in `backend/.env`:

| Setting | Value |
| --- | --- |
| `STORAGE_DRIVER` | `s3` (`local` = keep files in `backend/uploads`; the tests use this) |
| `S3_BUCKET` | `trust-space` |
| `AWS_REGION` | the bucket's region, e.g. `ap-south-1` (Mumbai) |
| `S3_PREFIX` | folder inside the bucket, default `uploads/` |
| `S3_URL_EXPIRES` | how long signed download links work, in seconds (default 3600) |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | keys of an IAM user for the API; leave empty on AWS servers that use an IAM role |

1. Create the bucket `trust-space` in your region and keep **Block all public access** on.
2. Create an IAM user (or role) for the API with this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"], "Resource": "arn:aws:s3:::trust-space/uploads/*" },
    { "Effect": "Allow", "Action": "s3:ListBucket", "Resource": "arn:aws:s3:::trust-space" }
  ]
}
```

3. Put the keys and region in `backend/.env`, restart the API, and open `GET /api/health?storage=check`. It confirms the bucket is reachable, or says exactly what is wrong (missing keys, no permission, wrong bucket or region).

## Health — `GET /api/health`

Reports the database and file storage. `?storage=check` also tests access to the S3 bucket. `200` when everything is reachable, `503` with the reason otherwise.
