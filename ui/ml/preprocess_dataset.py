"""Prepare CP-AnemiC images for the SwasthyaConnect visual-screening prototype.

This is intentionally a research preprocessing pipeline. It creates data splits
without allowing duplicate images to appear in more than one split, and it never
uses the output as a clinical diagnosis.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
import shutil
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from openpyxl import load_workbook
from PIL import Image, ImageOps, ImageStat


IMAGE_SIZE = 224
SPLITS = (("train", 0.70), ("validation", 0.15), ("test", 0.15))
LABELS = {"Anemic": "anemic", "Non-anemic": "non_anemic"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_metadata(workbook_path: Path) -> dict[str, dict[str, Any]]:
    sheet = load_workbook(workbook_path, data_only=True).active
    headers = [cell.value for cell in sheet[1]]
    if not headers or "IMAGE_ID" not in headers:
        raise ValueError("The metadata workbook must contain an IMAGE_ID header.")
    records: dict[str, dict[str, Any]] = {}
    for row in sheet.iter_rows(min_row=2, values_only=True):
        if not row or not row[0]:
            continue
        image_id = str(row[0]).strip()
        if image_id:
            records[image_id] = dict(zip(headers, row))
    return records


def content_box(image: Image.Image) -> tuple[int, int, int, int] | None:
    """Keep the conjunctiva crop while dropping transparent or empty padding."""
    rgba = image.convert("RGBA")
    alpha_box = rgba.getchannel("A").getbbox()
    if alpha_box:
        return alpha_box
    rgb = rgba.convert("RGB")
    # CP-AnemiC crops commonly have dark background. Find non-near-black pixels.
    mask = rgb.convert("L").point(lambda value: 255 if value > 8 else 0)
    return mask.getbbox()


def preprocess_image(source: Path, destination: Path) -> dict[str, float | int]:
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened)
        box = content_box(image)
        if box:
            image = image.crop(box)
        image = image.convert("RGB")

        # Pad rather than stretch, preserving the eye region's geometry.
        fitted = ImageOps.contain(image, (IMAGE_SIZE, IMAGE_SIZE), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (IMAGE_SIZE, IMAGE_SIZE), (0, 0, 0))
        offset = ((IMAGE_SIZE - fitted.width) // 2, (IMAGE_SIZE - fitted.height) // 2)
        canvas.paste(fitted, offset)
        canvas.save(destination, format="PNG", optimize=True)

    stats = ImageStat.Stat(canvas)
    grayscale = canvas.convert("L")
    pixels = grayscale.get_flattened_data()
    return {
        "brightness_mean": round(sum(pixels) / len(pixels), 2),
        "contrast_stddev": round(stats.stddev[0], 2),
        "source_width": image.width,
        "source_height": image.height,
    }


def deterministic_splits(records: list[dict[str, Any]], seed: int) -> None:
    by_label: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        by_label[record["label"]].append(record)

    for label_records in by_label.values():
        random.Random(seed).shuffle(label_records)
        total = len(label_records)
        train_end = round(total * SPLITS[0][1])
        validation_end = train_end + round(total * SPLITS[1][1])
        for index, record in enumerate(label_records):
            record["split"] = "train" if index < train_end else "validation" if index < validation_end else "test"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path, help="Extracted CP-AnemiC archive directory")
    parser.add_argument("--output", required=True, type=Path, help="Directory for processed images and manifests")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    source = args.source.resolve()
    output = args.output.resolve()
    workbook = source / "Anemia_Data_Collection_Sheet.xlsx"
    if not source.is_dir() or not workbook.exists():
        print(json.dumps({"status": "failed", "error": f"Metadata workbook not found: {workbook}"}, indent=2))
        return 2
    try:
        metadata = load_metadata(workbook)
    except (OSError, ValueError, KeyError) as error:
        print(json.dumps({"status": "failed", "error": f"Unable to read metadata: {error}"}, indent=2))
        return 2
    if not metadata:
        print(json.dumps({"status": "failed", "error": "The metadata workbook contains no usable records."}, indent=2))
        return 2

    candidates: list[dict[str, Any]] = []
    missing_files: list[str] = []
    invalid_images: list[str] = []
    for source_label, output_label in LABELS.items():
        for image_path in sorted((source / source_label).glob("*.png")):
            if image_path.stem not in metadata:
                missing_files.append(image_path.name)
                continue
            try:
                with Image.open(image_path) as candidate_image:
                    candidate_image.verify()
            except (OSError, ValueError):
                invalid_images.append(image_path.name)
                continue
            try:
                candidates.append({
                    "image_id": image_path.stem,
                    "label": output_label,
                    "source_label": source_label,
                    "source_path": image_path,
                    "sha256": sha256(image_path),
                    **metadata[image_path.stem],
                })
            except OSError:
                invalid_images.append(image_path.name)

    by_hash: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for candidate in candidates:
        by_hash[candidate["sha256"]].append(candidate)

    retained: list[dict[str, Any]] = []
    duplicate_count = 0
    label_conflict_groups: list[list[str]] = []
    for hash_group in by_hash.values():
        labels = {item["label"] for item in hash_group}
        if len(labels) > 1:
            label_conflict_groups.append([item["image_id"] for item in hash_group])
            continue
        hash_group.sort(key=lambda item: item["image_id"])
        retained.append(hash_group[0])
        duplicate_count += len(hash_group) - 1

    if not retained:
        print(json.dumps({
            "status": "failed",
            "error": "No valid, uniquely labelled images remain after validation and deduplication.",
            "source_records": len(metadata),
            "source_images": len(candidates),
            "invalid_images": invalid_images,
            "unmatched_source_files": missing_files,
        }, indent=2))
        return 2

    deterministic_splits(retained, args.seed)
    staging = output.with_name(f"{output.name}.staging")
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)

    manifest: list[dict[str, Any]] = []
    for record in sorted(retained, key=lambda item: item["image_id"]):
        image_destination = staging / record["split"] / record["label"] / f"{record['image_id']}.png"
        image_destination.parent.mkdir(parents=True, exist_ok=True)
        try:
            quality = preprocess_image(record["source_path"], image_destination)
        except (OSError, ValueError):
            invalid_images.append(record["source_path"].name)
            image_destination.unlink(missing_ok=True)
            continue
        manifest.append({
            "image_id": record["image_id"],
            "label": record["label"],
            "split": record["split"],
            "hemoglobin_g_dl": record["HB_LEVEL"],
            "severity": record["Severity"],
            "age_months": record["Age(Months)"],
            "gender": record["GENDER"],
            "hospital": record["HOSPITAL"],
            "region": record["REGION"],
            "country": record["COUNTRY"],
            "source_sha256": record["sha256"],
            "processed_path": image_destination.relative_to(staging).as_posix(),
            **quality,
        })

    if not manifest:
        shutil.rmtree(staging)
        print(json.dumps({
            "status": "failed",
            "error": "No images could be processed successfully.",
            "source_records": len(metadata),
            "invalid_images": invalid_images,
        }, indent=2))
        return 2

    fields = list(manifest[0])
    with (staging / "manifest.csv").open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(manifest)

    summary = {
        "source_records": len(metadata),
        "source_images": len(candidates),
        "retained_unique_images": len(manifest),
        "same_label_duplicate_images_removed": duplicate_count,
        "cross_label_duplicate_groups_excluded": label_conflict_groups,
        "unmatched_source_files": missing_files,
        "invalid_images_excluded": invalid_images,
        "image_size": [IMAGE_SIZE, IMAGE_SIZE],
        "split_label_counts": {
            split: dict(Counter(item["label"] for item in manifest if item["split"] == split))
            for split, _ in SPLITS
        },
        "warning": "Research dataset only. Do not use this output for diagnosis or treatment decisions.",
    }
    (staging / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    if output.exists():
        shutil.rmtree(output)
    staging.replace(output)
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
