"""ML service behaviour: quality gate, readiness, label order, and the HTTP contract."""

from __future__ import annotations

import io
import json

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app import inference, model
from app.main import app


def png(size=(300, 300), striped=True) -> bytes:
    image = Image.new("RGB", size, (190, 110, 110))
    if striped:
        for x in range(0, size[0], 20):
            image.paste((120, 40, 50), (x, 0, x + 10, size[1]))
    buffer = io.BytesIO()
    image.save(buffer, "PNG")
    return buffer.getvalue()


@pytest.fixture
def model_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("MODEL_DIR", str(tmp_path))
    monkeypatch.delenv("ML_SERVICE_TOKEN", raising=False)
    model.reset_cache()
    yield tmp_path
    model.reset_cache()


class StubKeras:
    def __init__(self, output: float):
        self.output = output
        self.layers = []

    def predict(self, batch, verbose=0):
        assert batch.shape == (1, 224, 224, 3)
        return np.array([[self.output]])


def test_quality_gate_rejects_flat_and_small_images(model_dir):
    client = TestClient(app)
    flat = client.post("/v1/analyze", files={"image": ("e.png", png(striped=False), "image/png")}).json()
    assert flat["quality_passed"] is False and flat["screening_label"] == "inconclusive"
    small = client.post("/v1/analyze", files={"image": ("e.png", png(size=(64, 64)), "image/png")}).json()
    assert small["quality_passed"] is False


def test_not_ready_without_model_or_approval(model_dir):
    client = TestClient(app)
    assert client.get("/health").json() == {"status": "ok", "model_ready": False}
    response = client.post("/v1/analyze", files={"image": ("e.png", png(), "image/png")})
    assert response.status_code == 503

    (model_dir / "visual_screening.keras").write_bytes(b"weights")
    assert model.readiness()[0] is False  # weights alone are not enough
    (model_dir / "model_validation.json").write_text(json.dumps({"approved": False}))
    assert model.readiness()[0] is False
    (model_dir / "model_validation.json").write_text(json.dumps({"approved": True}))
    assert model.readiness()[0] is True


@pytest.mark.parametrize(
    ("raw", "output_is_anemia", "label"),
    [(0.95, True, "anemia_likely"), (0.95, False, "anemia_unlikely"), (0.5, True, "inconclusive"), (0.05, True, "anemia_unlikely")],
)
def test_prediction_respects_class_order(model_dir, monkeypatch, raw, output_is_anemia, label):
    loaded = model.LoadedModel(StubKeras(raw), "cnn:stub.keras", output_is_anemia)
    monkeypatch.setattr(model, "get_model", lambda: loaded)
    monkeypatch.setattr(inference, "grad_cam", lambda *_: None)
    body = TestClient(app).post("/v1/analyze", files={"image": ("e.png", png(), "image/png")}).json()
    assert body["screening_label"] == label
    assert 0 <= body["confidence"] <= 100
    assert body["heatmap_png_base64"] is None  # no substitute picture when Grad-CAM is unavailable


def test_label_order_read_from_metrics(model_dir):
    (model_dir / "metrics.json").write_text(json.dumps({"labels": ["non_anemic", "anemic"]}))
    assert model._label_order(model_dir)[1] == "anemic"


def test_internal_token_is_enforced(model_dir, monkeypatch):
    monkeypatch.setenv("ML_SERVICE_TOKEN", "secret-token")
    client = TestClient(app)
    assert client.post("/v1/analyze", files={"image": ("e.png", png(), "image/png")}).status_code == 401
    ok = client.post("/v1/analyze", files={"image": ("e.png", png(), "image/png")}, headers={"X-Internal-Token": "secret-token"})
    assert ok.status_code == 503  # authorised, but no model installed


def test_rejects_non_images(model_dir):
    client = TestClient(app)
    assert client.post("/v1/analyze", files={"image": ("x.txt", b"hello", "text/plain")}).status_code == 415
    assert client.post("/v1/analyze", files={"image": ("x.png", b"not a png", "image/png")}).status_code == 400


def test_heatmap_overlay_is_png():
    cam = np.linspace(0, 1, 49).reshape(7, 7)
    data = inference.heatmap_png(Image.open(io.BytesIO(png())), cam)
    assert data.startswith(b"\x89PNG")


def _tensorflow_available() -> bool:
    try:
        import tensorflow  # noqa: F401
    except Exception:  # DLL load can fail on locked-down Windows machines
        return False
    return True


@pytest.mark.skipif(not _tensorflow_available(), reason="TensorFlow cannot be loaded on this machine")
def test_real_model_and_grad_cam(model_dir):
    """Builds the same architecture as training/train_cnn.py (untrained) and runs the full path."""
    import tensorflow as tf

    base = tf.keras.applications.MobileNetV3Small(include_top=False, input_shape=(224, 224, 3), weights=None)
    keras_model = tf.keras.Sequential([
        tf.keras.layers.Input((224, 224, 3)),
        tf.keras.layers.Rescaling(1.0 / 255),
        tf.keras.layers.RandomContrast(0.08),
        base,
        tf.keras.layers.GlobalAveragePooling2D(),
        tf.keras.layers.Dropout(0.30),
        tf.keras.layers.Dense(1, activation="sigmoid"),
    ])
    keras_model.save(model_dir / "visual_screening.keras")
    (model_dir / "metrics.json").write_text(json.dumps({"labels": ["anemic", "non_anemic"]}))
    (model_dir / "model_validation.json").write_text(json.dumps({"approved": True}))
    body = TestClient(app).post("/v1/analyze", files={"image": ("e.png", png(), "image/png")}).json()
    assert body["model_version"] == "cnn:visual_screening.keras"
    assert body["screening_label"] in {"anemia_likely", "anemia_unlikely", "inconclusive"}
    assert body["heatmap_png_base64"]
