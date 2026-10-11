"""Technical quality gate run before any inference: resolution, exposure and contrast."""

from __future__ import annotations

from PIL import Image, ImageStat

MIN_SIDE_PX = 128
MIN_BRIGHTNESS = 35
MAX_BRIGHTNESS = 225
MIN_CONTRAST = 15


def check(image: Image.Image) -> tuple[bool, str]:
    width, height = image.size
    if min(width, height) < MIN_SIDE_PX:
        return False, "The photo resolution is too low. Move closer to the camera and retake the photo."
    stats = ImageStat.Stat(image.convert("L"))
    brightness, contrast = stats.mean[0], stats.stddev[0]
    if brightness < MIN_BRIGHTNESS:
        return False, "The photo is too dark. Retake it in bright, even light."
    if brightness > MAX_BRIGHTNESS:
        return False, "The photo is overexposed or has glare. Avoid direct flash and retake it."
    if contrast < MIN_CONTRAST:
        return False, "The photo is blurred or has too little contrast. Hold steady, focus and retake it."
    return True, ""
