# Visual anaemia screening: dataset preparation and training

Module 1 (Sairaj Harpale). These scripts produce the model that `ml-service/app` serves.
Run every command from the `ml-service/` folder in an environment with `requirements-train.txt` installed.

## 1. Dataset preparation

The CP-AnemiC archive contains duplicate images. A random image-level split would put the same eye in both training and testing and inflate accuracy, so `preprocess_dataset.py` removes identical files, excludes identical images with conflicting labels, and makes class-balanced, seeded splits (70 / 15 / 15).

The raw archive and a prepared copy are already in `datasets/cp_anemic/` (`source/` and `prepared/`). To regenerate:

```powershell
python training/preprocess_dataset.py --source datasets/cp_anemic/source --output data/processed
```

The output holds `train/`, `validation/` and `test/` image folders, `manifest.csv` and `summary.json`. `data/` is git-ignored scratch space.

The Eyes-defy-anemia dataset (218 images) named in the synopsis is not yet included in this script.

## 2. Training

```powershell
python training/train_cnn.py --data datasets/cp_anemic/prepared --output models --epochs 20 --imagenet
```

`train_cnn.py` fine-tunes the head of a frozen MobileNetV3Small and writes:

- `models/visual_screening.keras`: the model
- `models/metrics.json`: held-out test metrics and the class order (`labels`, `positive_class`)

Keras sorts class folders alphabetically (`anemic`, `non_anemic`), so the sigmoid output is the probability of `labels[1]`. The service reads `metrics.json` to interpret it correctly.

## 3. Approval

Review `metrics.json`, ideally across the dataset's demographic groups, before use. Then create `models/model_validation.json`:

```json
{ "approved": true, "reviewed_by": "<name>", "reviewed_on": "<date>", "notes": "<what was checked>" }
```

Until this file exists with `"approved": true`, the service answers HTTP 503 and the app shows "screening unavailable". It never falls back to a guessed result.

## 4. Deployment

Zip the three files (`visual_screening.keras`, `metrics.json`, `model_validation.json`), host the zip somewhere the service can download it (for example a GitHub release asset), and set `MODEL_BUNDLE_URL` (and optionally `MODEL_BUNDLE_SHA256`) on the ML service. Locally, put the files in `ml-service/models/`.

The screening output is screening support only, never a diagnosis, prescription or emergency decision.
