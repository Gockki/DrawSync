# lib/ocr_image_prep.py
import io
from PIL import Image

def normalize_for_vision(
    image_bytes: bytes,
    max_long_side: int = 10_000,
    max_bytes: int = 18 * 1024 * 1024,
    prefer_png: bool = True
) -> bytes:
    """
    Varmista Google Vision -yhteensopiva kuva:
    - Muunna RGB/L (poista alfa/CMYK/erikoistilat)
    - Skaalaa jos pitkä sivu > max_long_side
    - Re-enkoodaa PNG:ksi (tai tarvittaessa JPEG:ksi)
    - Pidä koko alle max_bytes

    Palauttaa uudet kuva-bytet.
    """
    img = Image.open(io.BytesIO(image_bytes))
    img.load()  # varmista, ettei jää laiskaan tilaan

    # Muunto RGB/L
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    # Skaalaus pitkän sivun mukaan
    w, h = img.size
    long_side = max(w, h)
    if long_side > max_long_side:
        scale = max_long_side / float(long_side)
        new_size = (max(int(w * scale), 1), max(int(h * scale), 1))
        img = img.resize(new_size, Image.LANCZOS)

    # Ensin PNG
    buf = io.BytesIO()
    if prefer_png:
        img.save(buf, format="PNG", optimize=True)
        data = buf.getvalue()
        # Jos liian iso, tiputa JPEG:ksi
        if len(data) > max_bytes:
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=92, optimize=True)
            data = buf.getvalue()
    else:
        img.save(buf, format="JPEG", quality=92, optimize=True)
        data = buf.getvalue()

    # Viimeinen varmistus: jos vielä iso, pienennä laatua portaittain
    quality = 85
    while len(data) > max_bytes and quality >= 60:
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality, optimize=True)
        data = buf.getvalue()
        quality -= 5

    return data
