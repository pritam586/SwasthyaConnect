"""CNN inference and Grad-CAM heatmaps for conjunctiva photos."""

from __future__ import annotations

import io
import logging
from dataclasses import dataclass

import numpy as np
from PIL import Image

from app.model import LoadedModel

logger = logging.getLogger("ml.inference")
INPUT_SIZE = (224, 224)


@dataclass
class Prediction:
    screening_label: str
    confidence: float  # percent, 0-100
    triage_level: str
    explanation: str
    anemia_probability: float


def preprocess(image: Image.Image) -> np.ndarray:
    # The trained model rescales pixels itself (Rescaling layer), so raw 0-255 values go in.
    return np.asarray(image.convert("RGB").resize(INPUT_SIZE), dtype=np.float32)[np.newaxis, ...]


def interpret(p_anemia: float) -> Prediction:
    if 0.40 <= p_anemia < 0.60:
        return Prediction("inconclusive", round(max(p_anemia, 1 - p_anemia) * 100, 1), "YELLOW",
                          f"The model could not separate the classes clearly (anaemia probability {p_anemia:.2f}). "
                          "Retake the photo or ask a health worker for an assisted capture.", p_anemia)
    if p_anemia >= 0.60:
        return Prediction("anemia_likely", round(p_anemia * 100, 1), "RED" if p_anemia >= 0.85 else "YELLOW",
                          f"The model flags conjunctival pallor (anaemia probability {p_anemia:.2f}).", p_anemia)
    return Prediction("anemia_unlikely", round((1 - p_anemia) * 100, 1), "GREEN",
                      f"The model does not flag conjunctival pallor (anaemia probability {p_anemia:.2f}).", p_anemia)


def predict(model: LoadedModel, batch: np.ndarray) -> Prediction:
    raw = float(np.asarray(model.keras_model.predict(batch, verbose=0)).reshape(-1)[0])
    return interpret(raw if model.output_is_anemia else 1.0 - raw)


def grad_cam(model: LoadedModel, batch: np.ndarray) -> np.ndarray | None:
    """Class-activation map for the anaemia class from the last convolutional feature map.

    Supports the train_cnn.py layout (a Sequential wrapping a MobileNetV3 sub-model) and plain
    functional models. Returns None, rather than a substitute picture, if it cannot be computed.
    """
    try:
        import tensorflow as tf

        keras_model = model.keras_model
        nested = [layer for layer in keras_model.layers if isinstance(layer, tf.keras.Model)]
        inputs = tf.convert_to_tensor(batch)
        with tf.GradientTape() as tape:
            if nested:
                base = nested[-1]
                index = keras_model.layers.index(base)
                x = inputs
                for layer in keras_model.layers[:index]:
                    x = layer(x, training=False)
                features = base(x, training=False)
                tape.watch(features)
                y = features
                for layer in keras_model.layers[index + 1:]:
                    y = layer(y, training=False)
            else:
                conv = [layer for layer in keras_model.layers if len(getattr(layer, "output", np.zeros(0)).shape) == 4][-1]
                probe = tf.keras.Model(keras_model.inputs, [conv.output, keras_model.output])
                features, y = probe(inputs, training=False)
            score = y[:, 0] if model.output_is_anemia else 1.0 - y[:, 0]
        grads = tape.gradient(score, features)
        if grads is None:
            return None
        weights = tf.reduce_mean(grads, axis=(1, 2))
        cam = tf.nn.relu(tf.reduce_sum(features * weights[:, tf.newaxis, tf.newaxis, :], axis=-1))[0].numpy()
        peak = float(cam.max())
        return cam / peak if peak > 0 else None
    except Exception:  # Grad-CAM is an explanation aid; failure must not block the screening result
        logger.exception("Grad-CAM could not be computed")
        return None


def heatmap_png(image: Image.Image, cam: np.ndarray) -> bytes:
    """Overlay the normalised CAM on the photo (blue = low, red = high attention)."""
    base = image.convert("RGB").resize(INPUT_SIZE)
    cam_img = Image.fromarray(np.uint8(cam * 255)).resize(INPUT_SIZE, Image.Resampling.BILINEAR)
    v = np.asarray(cam_img, dtype=np.float32) / 255.0
    colours = np.stack([np.clip(1.5 - abs(4 * v - 3), 0, 1), np.clip(1.5 - abs(4 * v - 2), 0, 1),
                        np.clip(1.5 - abs(4 * v - 1), 0, 1)], axis=-1)
    overlay = Image.fromarray(np.uint8(colours * 255))
    buffer = io.BytesIO()
    Image.blend(base, overlay, alpha=0.45).save(buffer, format="PNG")
    return buffer.getvalue()
