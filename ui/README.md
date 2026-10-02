# SwasthyaConnect

This repository currently implements Sairaj Harpale's Module 1: guided conjunctiva-image capture and a future visual anaemia screening API boundary.

## Safety contract

The patient interface provides informational screening support only. It must not present a diagnosis, prescription, treatment recommendation, urgency classification, or emergency action. A licensed clinician retains responsibility for clinical assessment and every diagnosis, prescription, treatment, and escalation decision.

The visual-screening endpoint accepts `multipart/form-data` with an `image` field at `POST /api/v1/visual-screening/analyze`. It returns a technical-quality failure as an `inconclusive` response. It returns HTTP 503 whenever the model is absent, its validation record is missing or invalid, or inference has not been enabled. The frontend must not manufacture a result when either condition occurs.

## Run and verify

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env
python -m pip install -r backend/requirements.txt
pnpm run dev:backend
pnpm run dev
pnpm run check
```

For the research ML tools, install `ml/requirements-ml.txt` in an isolated Python environment before running the service or preprocessing command.

The frontend sends every local `/api` request to the single backend gateway at `backend/app.py`. It composes all four modules; do not run their individual `service.py` files as separate production APIs.
