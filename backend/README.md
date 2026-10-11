# SwasthyaConnect backend API

FastAPI + SQLAlchemy 2 + Alembic. PostgreSQL in production, SQLite for local development.
Full setup, environment variables and deployment: see the root `README.md`.

```bash
python -m venv .venv && .venv/Scripts/activate      # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head                                 # create/upgrade the schema
python -m scripts.seed_demo                          # development demo data (refuses in production)
uvicorn app.main:app --reload --port 8000            # API docs at http://127.0.0.1:8000/api/docs
pytest
```

## Structure (MVC)

| Path | Role |
| --- | --- |
| `app/models/` | **Models**: SQLAlchemy tables, relationships, indexes, constraints |
| `app/schemas/` | **Validators**: Pydantic request/response schemas |
| `app/controllers/` | **Controllers**: thin HTTP handlers (validate input, call one service, return a schema) |
| `app/routes/` | Route table: mounts each controller under `/api/v1/...` |
| `app/services/` | Business logic, database workflows, ML-service and SMS integrations |
| `app/middleware/` | Auth and role checks, error format, rate limiting, security headers, access log |
| `app/config/` | Settings from the environment, database engine/sessions, CORS |
| `app/utils/`, `app/constants/` | Security helpers, geo distance, phone parsing, shared enums |
| `app/main.py` / `app/server.py` | App factory / production entry point (`python -m app.server`) |
| `alembic/` | Schema migrations |
| `scripts/` | `seed_demo`, `create_admin`, `import_pharmacies`, `migrate_sqlite` |
| `tests/` | API tests against a temporary SQLite database |

Views are the separate Next.js frontend.
