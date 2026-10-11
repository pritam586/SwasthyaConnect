# SwasthyaConnect ML inference service (TensorFlow CPU).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TF_CPP_MIN_LOG_LEVEL=2

WORKDIR /srv
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app
# Model files are not baked in: mount them at /srv/models or set MODEL_BUNDLE_URL.
RUN mkdir -p /srv/models && useradd --create-home appuser && chown -R appuser /srv
USER appuser

ENV MODEL_DIR=/srv/models PORT=8001
EXPOSE 8001
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --timeout-graceful-shutdown 20"]
