"""Train the research-only CNN for the visual-screening module.

The prepared data must come from preprocess_dataset.py so duplicated source
images cannot leak between train, validation, and test sets.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, type=Path, help="Prepared dataset directory")
    parser.add_argument("--output", required=True, type=Path, help="Directory for model and metrics")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--imagenet", action="store_true", help="Use ImageNet MobileNetV3 weights when available")
    args = parser.parse_args()

    try:
        import tensorflow as tf
    except ImportError as error:
        raise SystemExit("TensorFlow is required. Install ml/requirements-ml.txt before training.") from error

    tf.keras.utils.set_random_seed(args.seed)
    data = args.data.resolve()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)

    loader_args = {
        "image_size": (224, 224),
        "batch_size": args.batch_size,
        "label_mode": "binary",
        "seed": args.seed,
    }
    train = tf.keras.utils.image_dataset_from_directory(data / "train", shuffle=True, **loader_args)
    validation = tf.keras.utils.image_dataset_from_directory(data / "validation", shuffle=False, **loader_args)
    test = tf.keras.utils.image_dataset_from_directory(data / "test", shuffle=False, **loader_args)

    autotune = tf.data.AUTOTUNE
    train = train.cache().shuffle(512, seed=args.seed).prefetch(autotune)
    validation = validation.cache().prefetch(autotune)
    test = test.cache().prefetch(autotune)

    base = tf.keras.applications.MobileNetV3Small(
        include_top=False,
        input_shape=(224, 224, 3),
        weights="imagenet" if args.imagenet else None,
    )
    base.trainable = False
    model = tf.keras.Sequential([
        tf.keras.layers.Input((224, 224, 3)),
        tf.keras.layers.Rescaling(1.0 / 255),
        tf.keras.layers.RandomContrast(0.08),
        base,
        tf.keras.layers.GlobalAveragePooling2D(),
        tf.keras.layers.Dropout(0.30),
        tf.keras.layers.Dense(1, activation="sigmoid", name="anemia_probability"),
    ])
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="binary_crossentropy",
        metrics=["accuracy", tf.keras.metrics.AUC(name="auc"), tf.keras.metrics.Precision(), tf.keras.metrics.Recall()],
    )
    callbacks = [
        tf.keras.callbacks.EarlyStopping(monitor="val_auc", mode="max", patience=4, restore_best_weights=True),
        tf.keras.callbacks.ModelCheckpoint(output / "best_model.keras", monitor="val_auc", mode="max", save_best_only=True),
    ]
    history = model.fit(train, validation_data=validation, epochs=args.epochs, callbacks=callbacks)
    metrics = model.evaluate(test, return_dict=True)
    model.save(output / "visual_screening.keras")
    (output / "metrics.json").write_text(
        json.dumps({"test_metrics": metrics, "history": history.history, "labels": train.class_names}, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
