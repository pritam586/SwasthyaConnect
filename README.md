# SwasthyaConnect

AI-assisted anaemia screening and telehealth for rural India. Patients screen from an eye photo and answer symptom questions; a rule-based triage orders the case for a verified doctor, who decides on diagnosis and prescription. Patients also keep health records, find nearby pharmacies that stock their medicines, and book doctors.

> **Screening support, not diagnosis.** Every screening and triage result is decision support for a licensed clinician. The doctor makes every diagnosis and prescribing decision.

Capstone project, Department of CET, MIT-WPU: Sairaj Harpale, Pritam Prajapati, Pratik Singh, Giriraj Partani.

---

## Architecture

```text
 Browser ──HTTPS──> frontend/   Next.js 15 on Vercel
    │
    └──HTTPS (bearer token)──> backend/   FastAPI on Render ──> PostgreSQL (Render)
                                   │
                                   └──private network──> ml-service/   FastAPI + TensorFlow on Render
```

| Service | Stack | Responsibility |
| --- | --- | --- |
| `frontend/` | Next.js 15 App Router, React 19, TypeScript, Tailwind 4 | All screens; English and Hindi on patient pages |
| `backend/` | FastAPI, SQLAlchemy 2, Alembic, PyJWT | Auth and roles, records, triage, pharmacy search, appointments, files, admin |
| `ml-service/` | FastAPI, TensorFlow (MobileNetV3Small) | Photo quality gate, CNN screening, Grad-CAM heatmap |
| Database | PostgreSQL (production), SQLite (local) | All data, including uploaded files (hosts have no persistent disk) |

### Backend MVC

| Layer | Folder | Role |
| --- | --- | --- |
| Model | `app/models/` | Tables, relationships, indexes, unique constraints |
| View | `frontend/` | The UI lives in the Next.js app; the API returns JSON |
| Controller | `app/controllers/` | Thin HTTP handlers: validate, call one service, return a schema |
| Routes | `app/routes/` | Mounts controllers under `/api/v1/...` |
| Services | `app/services/` | Business logic, DB workflows, ML and SMS integrations |
| Validators | `app/schemas/` | Pydantic request/response schemas |
| Middleware | `app/middleware/` | Auth and role checks, error format, rate limit, security headers, access log |
| Config | `app/config/` | Environment settings, database engine/sessions, CORS |

### Security model

- Passwords: PBKDF2-HMAC-SHA256, 600,000 iterations; older hashes upgrade on login.
- Sessions: 60-minute JWT access token plus a rotating, single-use refresh token (stored hashed).
- Roles are enforced on the API, never only in the UI. Patients reach only their own rows. Doctors reach a patient only through a workflow: a triage case in the queue, or an appointment with them. New doctors stay `PENDING` until an admin verifies their registration number. Admins manage accounts and data but cannot open medical records.
- Uploaded reports, eye photos and heatmaps are stored in the database and served only through `GET /api/v1/files/{id}` after an access check. They are never public URLs.
- Errors always use `{"error": {"code", "message", "details"?}}`. Unexpected errors are logged server-side and never leak stack traces.
- In production the API refuses to start with a missing or weak `JWT_SECRET`, wildcard CORS, the development OTP provider, or no `DATABASE_URL`.

---

## Repository layout

```text
SwasthyaConnect/
├── backend/                 FastAPI API (see backend/README.md)
│   ├── app/                 config, models, schemas, controllers, routes, services, middleware, utils
│   ├── alembic/             migrations
│   ├── scripts/             seed_demo, create_admin, import_pharmacies, migrate_sqlite
│   └── tests/
├── frontend/                Next.js app (see frontend/README.md)
│   └── src/                 app/ (route groups), features/, components/, services/, lib/, types/
├── ml-service/              ML inference service (see ml-service/README.md)
│   ├── app/                 quality gate, model loading, inference + Grad-CAM
│   ├── training/            preprocess_dataset.py, train_cnn.py
│   └── datasets/cp_anemic/  CP-AnemiC source and prepared split
├── docs/                    UI brief, earlier architecture audit
└── render.yaml              Render Blueprint (API, ML service, PostgreSQL)
```

---

## Prerequisites

- Python 3.12
- Node.js 20.19+ and npm
- For the ML service: TensorFlow-capable machine or Docker (TensorFlow is about 2 GB installed)
- Optional: PostgreSQL 15+ locally (SQLite is the default for development)

---

## Local development

Run each service in its own terminal.

**1. Backend** (`http://127.0.0.1:8000`, interactive docs at `/api/docs`)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt
alembic upgrade head
python -m scripts.seed_demo
uvicorn app.main:app --reload --port 8000
```

On macOS/Linux, activate with `source .venv/bin/activate`. `seed_demo` creates a demo doctor (phone `9876543210`), a demo admin (phone `9999999999`), a medicine catalogue and five illustrative pharmacies. Passwords come from `DEMO_DOCTOR_PASSWORD` / `DEMO_ADMIN_PASSWORD` (defaults in `backend/.env.example`). It refuses to run in production.

**2. ML service** (`http://127.0.0.1:8001`)

```bash
cd ml-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --port 8001
```

Screening stays "unavailable" until a trained, approved model is in `ml-service/models/` (see `ml-service/training/README.md`). Point the backend at it with `ML_SERVICE_URL=http://127.0.0.1:8001`.

**3. Frontend** (`http://localhost:3000`)

```bash
cd frontend
npm install
npm run dev
```

With `NEXT_PUBLIC_API_BASE_URL` unset, the dev server proxies `/api` to `BACKEND_URL` (default `http://127.0.0.1:8000`).

**Moving data from the old prototype** (one-off; keeps patients' passwords):

```bash
cd backend
python -m scripts.migrate_sqlite --source ../legacy-data/ui_swasthya_connect.db --uploads ../legacy-data/ui_uploads
```

---

## Tests and builds

| Command (run in) | What it checks |
| --- | --- |
| `pytest` (`backend/`) | Auth, role and ownership rules, triage, screening, pharmacy, appointments, reports, settings |
| `pytest` (`ml-service/`) | Quality gate, readiness and approval, class order, token check, Grad-CAM (skipped if TensorFlow cannot load) |
| `npm run lint` (`frontend/`) | ESLint |
| `npx tsc --noEmit` (`frontend/`) | Type check |
| `npm run build` (`frontend/`) | Production build |

---

## Environment variables

Example values only; each service has an `.env.example`. Never commit real values.

**backend** (Render service `swasthya-api`)

| Variable | Example | Notes |
| --- | --- | --- |
| `ENVIRONMENT` | `production` | Enables the production safety checks |
| `DATABASE_URL` | `postgres://user:pass@host:5432/db` | Required in production; empty = local SQLite |
| `JWT_SECRET` | 48+ random characters | Required in production (Render generates it) |
| `CORS_ORIGINS` | `https://swasthyaconnect.vercel.app` | Comma-separated frontend origins |
| `ML_SERVICE_URL` | `http://swasthya-ml:10000` | Empty = screening unavailable |
| `ML_SERVICE_TOKEN` | random string | Must equal the ML service's value |
| `ENABLE_DEV_OTP` | `false` | `true` only locally (returns the code in the API response) |
| `REQUIRE_PHONE_VERIFICATION` | `false` | Set `true` once SMS works |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_VERIFY_SERVICE_SID` | | Real SMS OTP; also add `twilio` to `requirements.txt` |
| `CLINIC_TIMEZONE` | `Asia/Kolkata` | Doctors' weekly hours |
| `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | `60` / `7` | |
| `MAX_UPLOAD_MB`, `AUTH_RATE_LIMIT_PER_MINUTE`, `LOG_LEVEL` | `10`, `20`, `INFO` | |

**ml-service** (Render private service `swasthya-ml`)

| Variable | Notes |
| --- | --- |
| `ENVIRONMENT` | `production` makes `ML_SERVICE_TOKEN` mandatory |
| `ML_SERVICE_TOKEN` | Shared with the backend |
| `MODEL_BUNDLE_URL` / `MODEL_BUNDLE_SHA256` | Zip of `visual_screening.keras`, `metrics.json`, `model_validation.json`, fetched at startup |
| `MODEL_DIR` | Defaults to `/srv/models` in the Docker image |

**frontend** (Vercel)

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Public URL of the Render API, e.g. `https://swasthya-api.onrender.com` |
| `BACKEND_URL` | Local development proxy target only |

---

## Deployment

### Backend, ML service and database: Render

1. Push this repository to GitHub.
2. In Render: **New > Blueprint**, pick the repository. `render.yaml` creates `swasthya-db` (PostgreSQL), `swasthya-api` (web, Python) and `swasthya-ml` (private service, Docker), and generates `JWT_SECRET` and the shared `ML_SERVICE_TOKEN`.
3. When prompted, set `CORS_ORIGINS` to your Vercel URL (you can fill it in after step 6 and redeploy). Optionally set the Twilio variables and `MODEL_BUNDLE_URL`.
4. The API runs `alembic upgrade head` before every start, then `python -m app.server` on Render's `$PORT`. Health check: `GET /health`.
5. Create the first administrator from the API service's **Shell** tab:
   ```bash
   python -m scripts.create_admin --name "Admin Name" --phone 9XXXXXXXXX --email admin@example.org
   ```
   Then load the real pharmacy dataset with `python -m scripts.import_pharmacies --medicines medicines.csv --pharmacies pharmacies.csv --stock stock.csv` (CSV formats are in the script's docstring), or add entries in the admin console.

### Frontend: Vercel

6. In Vercel: **Add New > Project**, import the repository, set **Root Directory** to `frontend` (framework is detected as Next.js), and add `NEXT_PUBLIC_API_BASE_URL` = the `swasthya-api` URL. Deploy.
7. Put the Vercel URL into `CORS_ORIGINS` on Render and redeploy the API.

### Plans and limits

- Render's free PostgreSQL expires after 30 days; use a paid plan for real data. Uploaded files are stored in the database, so its size limit applies to them too.
- Free Render web services sleep when idle (the first request after that is slow).
- TensorFlow needs more memory than the smallest instances; `render.yaml` uses `starter` for the ML service. Move to `standard` if it runs out of memory. Private services are not on the free plan.

---

## Current limitations

| Area | Status |
| --- | --- |
| Screening model | Pipeline, quality gate, inference and Grad-CAM are implemented, but **no trained, approved model is in the repo**. Until one is deployed, screening reports "unavailable" and triage uses symptoms only. |
| Eyes-defy-anemia dataset | Not yet added to preprocessing (CP-AnemiC only). |
| Triage | Keyword rules over three fixed questions, not a clinical model. No speech-to-text, chatbot or LLM summary. |
| ABHA / ABDM | Sandbox mode: format check plus consent; no live ABDM Sandbox calls. PM-JAY eligibility is a labelled mock and is never stored. |
| SMS OTP | Twilio Verify is wired but untested here (needs credentials). Without it, production signup works without phone verification. |
| Teleconsultation | "Consult now" sends a request the doctor confirms; there is no in-app video or voice call. |
| Report reading | Medicines are matched from PDF text only; photos and scanned PDFs are stored but not read (no OCR). |
| Offline-first sync, IVR channel | Not implemented. |
| Rate limiting | Per instance (in memory). |
| Hindi | Patient-facing pages only; clinician and admin pages are English. |

---

## Disclaimer

SwasthyaConnect is an academic project. It is not a substitute for professional medical advice, diagnosis or treatment.
