# SwasthyaConnect — Part 1 Architecture

**Status:** repository audit complete. Feature implementation is **not** started in this document.  
**Date:** 2026-10-07  
**Scope:** understand the existing system, freeze architectural decisions, and list what to keep, change, or rebuild.

This document is the source of truth for later implementation. It describes the **repository as it exists today**, not the aspirational root `README.md`.

---

## 1. Current project architecture

### What the repo actually is

SwasthyaConnect is **not** the Flutter + Node.js + PostgreSQL stack described in the root README. The live and in-progress layers are:

| Layer | Reality |
| --- | --- |
| Product UI (prototype) | React 19 + Vite 8 + Tailwind v4, Figma Make scaffold, screen machine in `ui/src/App.tsx` |
| Product UI (rebuild, incomplete) | Next.js 15 App Router in `frontend/` — landing + login only; services/types exist; most routes missing |
| Backend | FastAPI gateway in `ui/backend/app.py` (imported as package `backend` via path hack) |
| Database | SQLite (`swasthya_connect.db` at cwd / `ui/`), WAL, schema created at process start |
| ML | Heuristic conjunctiva pallor pipeline in `ui/ml/inference_service.py`; training scripts exist; **no deployed CNN weights** |
| ML vendor dump | `ml_runtime/` is a full Python environment (numpy/scipy/tensorflow/fastapi packages), not application code |
| Duplicate copies | `.pnpm-store/v11/projects/daffbfc81e9cef81aa0842356283db8c/` mirrors `ui/` including backend |

### Runtime composition today

```text
Browser
  ├── Vite prototype :8443   (ui/)     same-origin /api via Vite proxy
  └── Next.js :3000          (frontend/)  rewrites /api and /uploads → FastAPI
           │
           ▼
FastAPI (uvicorn :8000)  ui/backend/app.py
   ├── auth_service
   ├── patient_service + doctor_router
   ├── pharmacy_service + med_router
   ├── reports_service
   ├── appointment_service
   ├── triage/service
   ├── clinical_workflow/service
   ├── abha/service
   ├── admin_service
   └── ml/inference_service  (mounted as visual-screening)
           │
           ▼
SQLite  swasthya_connect.db
   + local files  uploads/reports  uploads/heatmaps
```

There is **no Express**, **no PostgreSQL**, **no Flutter**, **no Docker**, **no Alembic migrations**, and **no repo-root `.gitignore`**. Root `backend/__init__.py` only appends `ui/backend` onto the `backend` package path so `from backend.x` works.

### Vite prototype navigation (not URL routing)

In-memory `useState<Screen>`:

splash → language → auth → profileSummary → abha → consent → eyeCapture → analyzing → screeningResult → symptomChat → triageResult → (selfCare | pharmacy | bookAppointment | connectingDoctor | teleconsult | prescriptionReceived | emergency) and a separate doctorDashboard.

### Next.js rebuild status

Exists and is the intended product UI. Currently implemented:

- `app/page.tsx` landing (no fake clinical data)
- `app/login`, `app/login/clinician`
- Auth provider, cookie flag middleware, typed services aligned to real API paths
- Shared components (shell, empty/error/loading, camera, pharmacy card)
- `nav-config.ts` lists routes that **do not have pages yet** (`/dashboard`, `/signup`, `/reports`, …)

Not implemented: signup page, patient dashboard, records, pharmacy map page, screening flow, clinician queue, admin, i18n port.

---

## 2. Data flow (as designed vs as wired)

```text
Frontend  →  /api/v1/...  →  FastAPI router  →  SQLite  →  JSON  →  UI
```

### Backend intent (partially correct)

Authenticated patient endpoints under `/api/v1/patients/me/*`, `/api/v1/reports/my`, `/api/v1/appointments/my` take identity from the JWT `sub` claim via `get_current_user`. They do **not** trust a patient id in the path for those `/me` routes.

### Vite client wiring (broken)

Several `ui/src/modules` still send **user ids in the URL/body and omit Authorization**:

| Client call | Expected backend | Result |
| --- | --- | --- |
| `GET /api/v1/reports/user/{userId}` | `GET /api/v1/reports/my` + Bearer | 404 |
| `POST /api/v1/reports/upload` without token, with `user_id` form field | upload requires JWT; ignores form `user_id` | 401 |
| `GET /api/v1/appointments/patient/{patientId}` | `GET /api/v1/appointments/my` | 404 |
| `POST /api/v1/appointments/book` without token, with `patient_id` | book requires JWT | 401 |
| `GET /api/v1/clinical-workflow/cases` without token | `Depends(get_current_doctor)` | 401 |
| `POST .../prescription` with `freq` not `frequency` | Pydantic `PrescriptionMedicineItem.frequency` | 422 |
| `GET /api/v1/medicines/search?query=` | query param is `q` | 422 |
| `POST /api/v1/pharmacies/find-all-medicines` | `/search-prescription` | 404 |
| visual screening `fetch` without Authorization | persistence only if Bearer present | analysis not saved |

Triage `POST /api/v1/triage/assess` is **unauthenticated** and accepts `user_id` from the body. Token, if present, overwrites it; if absent, the client-supplied id is stored.

`ui/src/modules/patient/patientService.ts` **does** send Bearer tokens and hits `/me/*` correctly. Medications/encounters in the prototype can work if `sc_token` is set.

### Next.js client wiring (correct so far)

`frontend/services/*` call the real routes (`/reports/my`, `/pharmacies/search-prescription`, `/medicines/search?q=`) and attach Authorization via `lib/api-client.ts` with refresh-on-401. Those services are unused by missing pages.

**Rule going forward:** never accept resource owner ids from the client. Identity comes only from a verified access token.

---

## 3. Authentication architecture (current)

Implemented in `ui/backend/auth_service.py`:

- Signup (patient only), login, doctor-login, refresh with rotation, logout, `/me`
- PBKDF2-HMAC-SHA256 (`crypto_utils.py`) with legacy SHA-256 upgrade on login
- Access JWT (default 60 min) + hashed refresh tokens in `refresh_tokens`
- RBAC helpers: `get_current_user`, `require_role`, patient/doctor/admin convenience deps
- Phone OTP abstraction: Twilio, MSG91, or **dev provider enabled by default** (`ENABLE_DEV_OTP=true`) which **returns the OTP in the JSON response** (`otp_hint`)

Gaps:

- Default `JWT_SECRET` is hardcoded in source (`swasthya-connect-jwt-secret-key-2026-secure`)
- Signup OTP is optional; signup password min length is 4
- `check-user` is an enumeration oracle (exists, name, role)
- Doctor login matches `phone OR email OR name LIKE %input%`
- No `PHARMACY` role, no doctor self-registration, no email verification
- Logout does not require auth; only revokes if `refresh_token` provided
- No rate limiting, lockout, or httpOnly JWT cookies
- CORS default `*`
- Vite stores `sc_token` in localStorage; Next stores access/refresh in localStorage plus a **spoofable** `sc_session=1` cookie (middleware does not verify JWT)
- `get_current_patient` allows ADMIN as well as PATIENT (admin can hit `/patients/me/*` as if they were a patient)

---

## 4. Database architecture (current)

SQLite is initialized in `database.init_db()` with `CREATE TABLE IF NOT EXISTS` plus opportunistic `ALTER TABLE` column adds. There are **no versioned migrations**.

### Existing tables

| Table | Purpose | Notes |
| --- | --- | --- |
| `users` | identity, role, demographics | PATIENT / DOCTOR / ADMIN only |
| `refresh_tokens` | hashed refresh tokens | rotation on refresh |
| `patient_profiles` | extra clinical demographics | duplicated fields vs `users` |
| `doctors` | clinician directory | `verification_status` defaults to **VERIFIED**; `rating` defaults 4.8 |
| `doctor_availabilities` | weekly slots | **unused by services** |
| `medications` | per-patient med list | not FK-linked to catalogue `medicines` |
| `health_encounters` | visit notes | denormalized `doctor_name` |
| `medical_reports` | uploads + extracted JSON | `user_id` is a legacy alias of `patient_id` |
| `prescriptions` | header + `medicines_json` blob | **no `prescription_items` table** |
| `appointments` | booking workflow | no FK to `doctors.id` |
| `ai_analyses` | screening history | model_version labeled MobileNetV3 even when heuristic |
| `triage_cases` | clinician queue | can exist with null `user_id` |
| `pharmacies` | directory + lat/lng | seeded demo locations |
| `medicines` | catalogue | seeded essential list |
| `pharmacy_inventory` | stock | seeded |
| `notifications` | in-app | written, barely shown in UI |
| `otp_verifications` | OTP | stores **plaintext** OTP |
| `audit_logs` | security events | swallows errors; IP rarely captured |

Missing vs required core entities: `roles` table (enum on `users` instead), `pharmacy_profiles` / pharmacy users, `prescription_items`, `sessions` (opaque cookie session), screening vs analysis split (one table is enough if named honestly).

### Seed / fake directory data

`seed_directory_data_if_empty()` runs on every API boot:

- Doctor **Dr. Anjali Verma** / phone `9876543210` / password `doctor123`
- Admin **Chief Medical Admin** / `9999999999` / `admin123`
- 8 medicines, 5 pharmacies (Hapur / Meerut / Pune), inventory rows

This violates the no-fake-data policy for **users**. A **reference medicines catalogue** and **operator-managed pharmacy directory** are legitimate, but they must not be auto-created demo clinicians, and inventory must not be presented as live stock unless an operator entered it.

---

## 5. API map

Prefix: `/api/v1`

### Auth — `/auth`

`POST /check-user`, `/send-otp`, `/verify-otp`, `/signup`, `/login`, `/doctor-login`, `/refresh`, `/logout`  
`GET /me` (Bearer)

### Patients — `/patients` (Bearer)

`GET|PATCH /me/profile`  
`GET /me/dashboard-summary`  
`GET|POST /me/medications`, `DELETE /me/medications/{id}`  
`GET|POST /me/health-encounters`  
`GET /me/prescriptions`  
`GET|POST /me/ai-analyses`  
`GET /me/notifications`, `PATCH /me/notifications/{id}/read`

### Doctors — `/doctors` (public)

`GET /`, `GET /{doc_id}` — **no auth**; availability falls back to hardcoded slot list on JSON parse failure.

### Pharmacy — `/pharmacies` (public)

`GET /nearby`, `GET /nearest`  
`POST /search-prescription`

### Medicines — `/medicines` (public)

`GET /`, `GET /search?q=`

### Reports — `/reports` (Bearer)

`POST /upload`, `GET /my`, `DELETE /{report_id}`

### Appointments — `/appointments`

`POST /book`, `GET /my`, `POST /{id}/cancel` (patient JWT)  
`GET /doctor/my`, `PATCH /{id}/status` (doctor JWT)

### Triage — `/triage`

`POST /assess` — **optional** auth

### Clinical workflow — `/clinical-workflow` (doctor JWT)

`GET /cases`, `POST /cases/{id}/prescription`

### Visual screening — `/visual-screening`

`POST /analyze` — **optional** auth; quality gate + heuristic inference; writes `ai_analyses` only if JWT present

### ABHA — `/abha`

`POST /link` — **unauthenticated**; any 14-digit number is treated as verified; sets PM-JAY ₹5 lakh without ABDM

### Admin — `/admin` (ADMIN JWT)

`GET /stats`, `/users`, `/pharmacies`, `/audit-logs`  
`PATCH /users/{id}/status`  
`POST /pharmacies`, `/inventory`, `/medicines`  
`CreateDoctorRequest` exists but **no create-doctor route**

Static: `/uploads` is mounted with **no authentication**.

Health: `GET /health`, `GET /api/health`

---

## 6. Frontend architecture (current)

### `ui/` (Figma Make Vite)

- Almost all UI in `ui/src/App.tsx` (~2400 lines)
- Thin service modules under `ui/src/modules/*`
- i18n dictionary in `ui/src/i18n.ts` (partial; many screens English-only)
- No React Router
- Unauthenticated default state is **hardcoded** `DEFAULT_USER` (Pritam Prajapati / `usr-0421dc38`)
- Auth form pre-filled with that identity; doctor form pre-filled with seed credentials
- Profile medications/encounters: API-driven with empty states (good)
- Reports: wrong URLs / no token
- Pharmacy: GPS + Haversine backend; error path logs “fallback to local list”
- Self-care, prescription-received, teleconsult, doctor Rx writer: **hardcoded Ferrous Sulfate / Folic Acid / Dr. Anjali Verma**
- ABHA failure path writes fake ABHA `12-3456-7890-1234`
- Signup sets `pmjay_eligible: true` unconditionally
- Camera capture exists (`EyeCaptureScreen`)
- No map SDK; pharmacy “map” is a stylized pin overlay

### `frontend/` (Next.js)

- App Router, Tailwind v4, typed API client with refresh
- Empty/error/loading components — correct empty-state policy
- Middleware role gates rely on cookies that the client can set without a valid JWT
- Pages for product flows are missing; links to `/signup` 404

---

## 7. ML integration (current vs required)

Training path (`preprocess_dataset.py`, `train_cnn.py`) is real research code (MobileNetV3Small, leakage-aware splits). Serving path does **not** load those weights.

Serving instead:

1. Resolution / brightness / contrast quality gate (Pillow)
2. Mean RGB erythema heuristic
3. Pixel-loop “heatmap” saved under `/uploads/heatmaps`
4. Labels the model `MobileNetV3-v1` in the database anyway

`ui/ml/README.md` states the CNN endpoint should 503 until a model **and** `model_validation.json` exist. The live `/analyze` route ignores that contract.

Triage fusion is keyword matching on symptom strings plus visual confidence thresholds — not a trained multimodal model.

`ml_runtime/` appears to be a vendored interpreter site-packages tree and must not be treated as product source.

---

## 8. Problems discovered (summary)

1. README / folder layout describe a different product than the code.
2. Two frontends: a working-looking Vite prototype with broken API contracts, and a correct-but-incomplete Next.js scaffold.
3. Fake users, fake ABHA, fake prescriptions, seed doctor/admin, hardcoded dashboard medicines in `ui/`.
4. SQLite + boot-time schema + seed is not a production health-data store.
5. Dual copies of backend (`ui/backend`, pnpm-store) plus empty root `backend` package shim.
6. `ml_runtime/` vendor tree pollutes the repo.
7. Uploads and heatmaps are world-readable.
8. No PHARMACY role, no prescription line items, unused availability table.
9. Visual “CNN” is a heuristic; Grad-CAM is not Grad-CAM.
10. ABHA is a regex, not ABDM.
11. No tests, no rate limits, default secrets, default CORS `*`. Incomplete `requirements.txt` (PyJWT, pypdf, numpy not declared).
12. Teleconsult is a visual mock. Offline-first sync claimed in README is unimplemented.
13. Checked-in SQLite DBs and a sample uploaded PDF.

---

## 9. KEEP / MODIFY / REFACTOR / REMOVE / REBUILD

### KEEP

- FastAPI as the API runtime (do **not** rewrite to Express to match the old README).
- Password hashing design in `crypto_utils.py`.
- JWT access + hashed refresh + rotation concept.
- `get_current_user` / `require_role` pattern.
- Patient `/me/*` ownership queries.
- Appointment status workflow (REQUESTED → CONFIRMED / REJECTED / CANCELLED / COMPLETED).
- Haversine nearby-pharmacy query (against a real directory, not invented distances).
- Report MIME/size validation and disk storage pattern (after adding auth on files).
- Quality-gate idea and screening disclaimer text.
- Dataset preprocess / train scripts as **research tooling** under `ml/`.
- Empty-state policy already used for medications/encounters (Vite) and `frontend/components/feedback/*`.
- i18n language list and translation keys (port into Next.js).
- Camera capture UX as a starting interaction (`EyeCaptureScreen` / `CameraCapture.tsx`).
- Next.js `frontend/services/*`, `lib/api-client.ts`, types — they already match the backend contract.

### MODIFY

- Align remaining Vite clients **or stop using them**; Next.js is the product client.
- Make OTP required for signup in non-dev; never return OTP in API JSON in production.
- Persist visual screening and triage only for the JWT subject (require auth).
- Pharmacy/medicine catalogue: treat seed as **optional operator import**, not auto-created demo world.
- Doctor verification default should be `PENDING`, not `VERIFIED`.
- `requirements.txt` must declare PyJWT, pypdf, numpy, and other imports.
- ABHA: store number + consent on the user; do not claim PM-JAY coverage from a format check.
- Serve uploads through an authorized download endpoint, not public StaticFiles.
- Next.js middleware must not trust a client-set `sc_session=1` cookie.

### REFACTOR

- Move `ui/backend` into a real `backend/` package with `src/` layout.
- Normalize prescriptions into header + items.
- Collapse duplicated user vs patient_profile demographics with a clear split.
- Unify imports (`from backend.x` vs relative) once `backend/` is the real package.
- Replace ad-hoc SQLite `init_db()` with Alembic migrations targeting PostgreSQL.
- Structured logging and audit that records IP / action outcome.
- Split remaining Vite `App.tsx` logic into Next.js routes (rebuild, not incremental split in Vite).

### REMOVE

- `DEFAULT_USER` and prefilled demo credentials in the Vite auth UI.
- Hardcoded Ferrous/Folic prescription UI.
- ABHA catch-block fake ID.
- `seed_directory_data_if_empty` auto-creating doctor/admin accounts.
- Duplicate FastAPI `app = FastAPI()` inside `abha/service.py` and `ml/inference_service.py`.
- Figma Make plugins and `.figma/` as the primary app shell once Next.js is feature-complete.
- Root README claims of Flutter/Node/Postgres until they are true or rewritten.
- Checked-in SQLite DBs, uploaded PDF samples, `__pycache__`, `.pnpm-store` backend copies, `ml_runtime/` if it is a venv dump.
- Clinical workflow README that contradicts the live mutating API.

### REBUILD

- **Frontend pages:** Next.js App Router screens for every role (Vite is a prototype of visual language only).
- **Auth UX:** signup, verify-phone, role homes; prefer httpOnly refresh cookie.
- **Doctor workstation:** real queue + editable Rx, not a canned iron protocol.
- **Pharmacy role + inventory management** (does not exist as a user type).
- **ML serving:** load a validated model or explicitly expose heuristic as `heuristic-v1`.
- **ABDM/ABHA** if required: sandbox client, not a regex.
- **Teleconsult:** real session model or an honest “not implemented” empty state.
- **Notifications UI and admin console UI.**
- **Offline-first sync** only if still a product requirement; otherwise drop the claim.

---

## 10. Proposed final architecture

Keep Python FastAPI. Make `backend/` a first-class package. Finish the Next.js app in `frontend/`. Keep ML as a sibling module. Use PostgreSQL as the source of truth for deployment; SQLite only as a documented local-dev fallback.

```text
SwasthyaConnect/
├── frontend/                 # Next.js (already created; complete it)
│   ├── app/                  # (public), (patient), (clinician), (pharmacy), (admin)
│   ├── components/
│   ├── features/             # add only when a domain has multiple screens
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── types/
│   ├── providers/
│   ├── constants/            # i18n, copy
│   ├── public/
│   └── middleware.ts
├── backend/                  # move from ui/backend
│   ├── src/
│   │   ├── main.py
│   │   ├── core/             # config, security, deps, errors
│   │   ├── db/               # session, models
│   │   └── modules/          # auth, patients, doctors, pharmacy, reports, …
│   ├── alembic/
│   ├── tests/
│   └── requirements.txt
├── ml/                       # moved from ui/ml
│   ├── preprocess/
│   ├── train/
│   ├── serve/
│   └── models/               # gitignored weights + validation json
├── docs/architecture/
└── README.md                 # rewritten to match reality
```

Do not create empty folders “just in case”. Add `workers/`, `docker-compose.yml`, and pharmacy app routes when those features are implemented.

**Do not keep `ui` as the primary frontend.** After Next.js covers flows, archive or delete `ui/`. Until then, treat `ui/` as a visual/reference prototype only.

### Why FastAPI, not Node

The working clinical/auth/pharmacy/report/screening code is Python. Rewriting it to Express would destroy working ownership checks and delay the Next.js rebuild.

### Why PostgreSQL

Healthcare records need concurrent access, constraints, and backups. SQLite is acceptable only for a single-laptop demo.

### Why Next.js

Required: URL routes, middleware auth, scalable feature layout, replacement of the Figma Make shell.

---

## 11. Authentication flow (target)

```text
Signup (role=PATIENT by default)
  → validate phone/password
  → send OTP (never echo OTP)
  → verify OTP
  → hash password
  → create users + patient_profiles (empty clinical collections)
  → issue access JWT (short) + refresh (httpOnly cookie or rotated opaque token)

Login
  → verify password
  → load role from DB
  → issue tokens
  → Next.js sends user to role home

Every private API
  → Authorization: Bearer <access>  OR  httpOnly cookie
  → load user from DB by token sub
  → RBAC
  → ownership: resource.patient_id == current_user.id
       doctor: appointment.doctor_id == current_doctor.profile_id
       pharmacy: inventory.pharmacy_id == current_pharmacy.id
       admin: platform scope only

Logout
  → revoke refresh
  → clear cookies/storage
```

Roles:

| Role | Can |
| --- | --- |
| PATIENT | own profile, meds, reports, prescriptions, appointments, screening, triage submit, pharmacy search |
| DOCTOR | own profile, assigned/queued consented cases, own appointments, issue prescriptions to linked patients |
| PHARMACY | own pharmacy profile + inventory; cannot read clinical notes |
| ADMIN | directory, user activation, audit, catalogue; not a substitute clinician |

Doctors are **not** auto-verified. Pharmacies do not see other pharmacies’ stock admin APIs.

---

## 12. API communication flow (target)

```text
Next.js
  → lib/api-client.ts (token, refresh-on-401, typed errors)
  → FastAPI routers
  → PostgreSQL (or SQLite in local dev)
  → JSON
  → UI empty / error / data states only — never mock arrays
```

If the backend is down, screens show an **integration error**, not a fake list.

Public (rate-limited): medicine search, pharmacy nearby (directory), healthz.  
Everything else: authenticated.

---

## 13. Proposed database entities

Reuse existing tables; add/normalize rather than duplicate.

**Identity**

- `users` (id, phone unique, email unique nullable, password_hash, role, is_active, phone_verified, email_verified, last_login_at, timestamps)
- `patient_profiles` (user_id unique, dob, sex, blood_group, address, geo, emergency_contact, allergies, chronic_conditions, abha_id, pmjay_status)
- `doctor_profiles` (user_id unique, specialization, qualification, license_number, clinic, fee, verification_status, rating nullable)
- `pharmacy_profiles` (user_id unique, pharmacy_id)
- `refresh_tokens`
- `otp_verifications` (hash of OTP, not plaintext, in production)
- `audit_logs` (user_id, action, resource, ip, user_agent)

**Clinical**

- `medications` (patient_id, optional medicine_id FK, prescription_item_id)
- `health_encounters`
- `appointments` (FK patient, FK doctor, status, slot)
- `doctor_availabilities` (actually used)
- `prescriptions`
- `prescription_items` (**new**, replace JSON blob)
- `medical_reports`
- `ai_analyses` (honest `model_version`; keep table name)
- `triage_cases` (patient_id required for registered users)
- `notifications`

**Directory (operator data, not patient data)**

- `pharmacies` (admin-entered coordinates)
- `medicines` (catalogue)
- `pharmacy_inventory`

**Do not auto-insert demo patients, demo doctors, or demo prescriptions.**  
Optional: `scripts/seed_dev.py` behind `ALLOW_DEV_SEED=1`, never on by default in production.

---

## 14. Pharmacy / location flow (target)

```text
Patient (GPS or typed location)
  → GET nearby with lat,lng, optional medicine
  → DB pharmacies in radius + Haversine
  → inventory join if medicine requested
  → UNKNOWN if no inventory row (never invent stock)
  → empty state if none in radius
```

No frontend `const pharmacies = [...]`. Preset city coordinates may exist only as **manual location helpers**, labeled as such.

---

## 15. Report / prescription flow (target)

```text
Patient uploads file (auth)
  → store blob privately
  → extract text (PDF) / OCR later
  → match catalogue medicines
  → save report owned by token subject
  → empty list if none

Doctor issues Rx on a consented case
  → prescription + items
  → copy items into patient medications
  → encounter row
  → notify patient
```

Frontend never sends `patient_id`. Doctors cannot attach Rx to an arbitrary id.

---

## 16. ML integration (target)

```text
Capture
  → quality gate (keep)
  → if fail: inconclusive, no diagnosis language
  → if model_validation.json + weights exist: CNN inference + real Grad-CAM
  → else: 503 or explicit algorithm=heuristic-v1 (never label as MobileNet)
  → persist to ai_analyses for JWT user only
  → triage consumes screening as one signal, with disclaimer
```

---

## 17. Architectural decisions

1. **Python FastAPI stays.** Node rewrite is rejected.
2. **Next.js in `frontend/` is the product UI.** Figma Make `ui/` is a prototype of visual language.
3. **`ui` is not the primary frontend.** After port, merge `ui/backend` → `backend/`, `ui/ml` → `ml/`, then remove `ui/`.
4. **PostgreSQL is the deployment source of truth.** SQLite is local-only.
5. **No fake clinical data.** Empty states are required.
6. **JWT + refresh, identity from token only.**
7. **Roles: PATIENT, DOCTOR, PHARMACY, ADMIN.**
8. **Directory data (pharmacies, medicines) is operator-owned**, not “the logged-in patient’s pharmacies.”
9. **ML must not impersonate a trained CNN** until weights and validation exist.
10. **Do not destroy working `/me` ownership queries**; port them.

---

## 18. Dependencies

### Backend add

`PyJWT`, `pypdf`, `numpy`, `python-multipart`, `uvicorn[standard]`, `Pillow` (already listed), `pydantic-settings`, `alembic`, `sqlalchemy`, `psycopg` (Postgres), `httpx`. Optional `twilio`. Keep custom PBKDF2.

### Backend remove / avoid

Do not add Express. Do not vendor TensorFlow into the API process until serving the CNN.

### Frontend (Next.js)

Already: `next@15`, `react@19`, Tailwind v4. Later: no faker. Cookie session helpers if moving tokens off localStorage.

### Frontend remove

Vite Figma plugins as production deps once `ui/` is retired.

### ML

Keep `tensorflow-cpu`, Pillow, FastAPI in `ml/requirements-ml.txt`. Do not commit `ml_runtime/` site-packages.

---

## 19. Files that will be renamed / moved

| From | To |
| --- | --- |
| `ui/backend/` | `backend/src/` (module split) |
| `ui/ml/` | `ml/` |
| `ui/src/i18n.ts` | `frontend/constants/i18n` |
| `ui/src/modules/*Service.ts` | already superseded by `frontend/services/*` (do not copy broken Vite clients) |
| `ui/` remaining visual components | port into `frontend/components` / `frontend/features` then delete `ui/` |

`frontend/` already exists; it is **not** a rename of `ui/` yet. Completing the Next.js app, then deleting `ui/`, is the rename/restructure.

---

## 20. Files that will be deleted (after port)

- `ui/src/App.tsx` screen machine
- Figma Make: `ui/.figma/**`, figma plugins in `vite.config.ts`
- Duplicate FastAPI apps in `abha/service.py` and `inference_service.py`
- Seed doctor/admin block in `database.py` (replaced by optional seed script)
- Checked-in `swasthya_connect.db`, `ui/swasthya_connect.db`, sample `uploads/reports/*.pdf`
- `ml_runtime/` (venv dump)
- `.pnpm-store` copies of backend
- Root `backend/__init__.py` path-hack once the real package exists

---

## 21. Files that will be created (later parts — not this task)

**Frontend pages (missing today)**

- `app/signup/page.tsx`, `app/verify-phone/page.tsx`
- `app/dashboard/page.tsx`
- `app/health-records/page.tsx`, `medications`, `reports`, `prescriptions`, `appointments`, `doctors`
- `app/pharmacies/page.tsx`, `screening/page.tsx`, `profile`, `settings`
- `app/clinician/page.tsx`, `app/clinician/appointments/page.tsx`
- `app/admin/**` (when admin UI starts)

**Backend**

- `backend/src/core/config.py`, `deps.py`, `security.py`
- `backend/src/db/models.py`, Alembic migrations
- `backend/.env.example`
- `scripts/seed_dev.py` (flag-gated)
- Tests: auth ownership, appointment isolation, pharmacy UNKNOWN stock

**Repo hygiene**

- Root `.gitignore` (db, pycache, ml_runtime, .pnpm-store, uploads, .env)
- Rewritten root `README.md`

---

## 22. Proposed Next.js `app/` structure

```text
frontend/app/
├── page.tsx                 # public landing (exists)
├── login/page.tsx           # exists
├── login/clinician/page.tsx # exists
├── signup/page.tsx
├── verify-phone/page.tsx
├── (patient)/
│   ├── dashboard/page.tsx
│   ├── health-records/page.tsx
│   ├── medications/page.tsx
│   ├── reports/page.tsx
│   ├── prescriptions/page.tsx
│   ├── appointments/page.tsx
│   ├── doctors/page.tsx
│   ├── pharmacies/page.tsx
│   ├── screening/page.tsx
│   ├── profile/page.tsx
│   └── settings/page.tsx
├── (clinician)/
│   ├── clinician/page.tsx
│   └── clinician/appointments/page.tsx
├── (pharmacy)/              # after PHARMACY role exists
└── (admin)/
    └── admin/page.tsx
```

Route groups are optional; `nav-config.ts` already uses the URL paths above. Do not add a `features/` folder until a domain has more than one substantial screen.

---

## 23. Implementation order (later parts — not this task)

1. Freeze API contract: require JWT on triage/screening persistence; stop accepting client `user_id`.
2. Extract backend to `backend/` with env-based secrets and no auto-seed users.
3. Complete Next.js pages wired to existing `/me` APIs with empty/error states.
4. Port reports, appointments, pharmacy search, screening.
5. Port doctor queue with real Rx items.
6. Honest ML labeling; gate CNN.
7. Pharmacy role + admin UI.
8. Delete Vite `ui` once Next.js is feature-complete.

Do not delete working FastAPI `/me` endpoints until the Next.js client is calling them successfully.
