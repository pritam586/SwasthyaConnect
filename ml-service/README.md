# SwasthyaConnect ML service

Internal FastAPI service for visual anaemia screening. Only the backend API calls it.
Training and model approval: `training/README.md`. Deployment: root `README.md`.

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | `{"status": "ok", "model_ready": bool}` |
| `POST /v1/analyze` | Multipart `image`. Quality gate, CNN prediction, Grad-CAM heatmap (base64 PNG). Header `X-Internal-Token` when `ML_SERVICE_TOKEN` is set. |

Behaviour that must not change:

- A photo that fails the quality gate returns `quality_passed: false` and no prediction.
- Without an installed model **and** `model_validation.json` with `"approved": true`, `/v1/analyze` returns **503**. There is no fallback result.
- If Grad-CAM cannot be computed, `heatmap_png_base64` is `null` (no substitute image).

```bash
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --port 8001
pytest
```

| Path | Contents |
| --- | --- |
| `app/` | Service: `quality.py`, `model.py` (loading, approval, class order, bundle download), `inference.py` (prediction, Grad-CAM) |
| `training/` | `preprocess_dataset.py`, `train_cnn.py` |
| `datasets/cp_anemic/` | CP-AnemiC source images and the prepared split |
| `models/` | Trained model files (git-ignored) |
| `Dockerfile` | Production image (TensorFlow CPU) |
