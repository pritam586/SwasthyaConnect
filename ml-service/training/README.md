# Sairaj Harpale module: visual anaemia screening

This module implements the first SwasthyaConnect module described in the project synopsis:

1. Guided conjunctiva-image capture in the patient app.
2. Image-quality gate before inference.
3. Conjunctiva crop preparation, size normalisation, and colour-ready image output.
4. Leakage-safe training, validation, and test manifests for a future CNN.
5. A future inference result containing a screening probability, confidence, and Grad-CAM image reference.

## Dataset preparation

The CP-AnemiC archive includes duplicate images. A random image-level split would place the same eye image in training and testing, which would inflate reported accuracy. `preprocess_dataset.py` removes repeated identical files before creating class-balanced, deterministic splits. It also excludes any identical image that has conflicting labels.

Run from the `ui` directory after extracting the archive:

```powershell
python ml/preprocess_dataset.py --source <extracted-cp-anemic-directory> --output ml/data/processed
```

The output contains `train`, `validation`, and `test` image folders, `manifest.csv`, and `summary.json`.

## CNN training

Install the isolated ML dependencies and train only after reviewing the processed-data summary:

```powershell
python -m pip install -r ml/requirements-ml.txt
python ml/train_cnn.py --data <prepared-directory> --output ml/models --epochs 20
```

`train_cnn.py` uses MobileNetV3Small and saves held-out test metrics. Those metrics must be reviewed across the dataset's demographic groups before any deployment decision.

## Model-serving contract

The eventual CNN endpoint should accept only an image that passes the quality gate and respond with:

```json
{
  "screening_label": "anemia_likely | anemia_unlikely | inconclusive",
  "confidence": 0.0,
  "quality_passed": true,
  "quality_reason": "",
  "grad_cam_image_url": "",
  "disclaimer": "Screening support only. A clinician must confirm with an appropriate clinical assessment."
}
```

This module must never return a diagnosis, prescription, treatment recommendation, or emergency decision. The API returns HTTP 503 until both a model and an explicit `model_validation.json` approval record exist. The triage module owned by Pratik uses the visual output only as one input alongside symptom assessment.
