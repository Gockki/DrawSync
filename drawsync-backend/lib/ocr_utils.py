# lib/ocr_utils.py
import os
import io
from typing import Dict, Any, Union

from google.cloud import vision
from dotenv import load_dotenv
from PIL import Image

load_dotenv()

# Älä yliaja ympäristöä, jos käyttäjä on jo asettanut avaimen
os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", "creds/gcp_key.json")

def _pil_verify(image_bytes: bytes) -> None:
    """Tarkista, että kuva on ehjä ennen Vision-kutsua (lokittaa jos ongelma)."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()  # heittää jos korruptoitunut
        # verify sulkee tiedoston; avaa uudelleen jotta varmistetaan ok
        Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        # ei kaadeta vielä, Vision voi silti onnistua normalisoinnin jälkeen
        print(f"⚠️ Pre-Vision PIL verify failed: {e}")

def _summarize_confidence(full) -> Dict[str, Any]:
    """Laske karkea keskim. luottamus ja sanamäärä, jos data saatavilla."""
    try:
        pages = getattr(full, "pages", []) or []
        word_count = 0
        conf_sum = 0.0

        for page in pages:
            for block in getattr(page, "blocks", []) or []:
                for para in getattr(block, "paragraphs", []) or []:
                    for word in getattr(para, "words", []) or []:
                        word_count += 1
                        # Vision palauttaa confidence 0..1 tai 0..100
                        c = getattr(word, "confidence", 0.0) or 0.0
                        # normalisoi tarvittaessa
                        if c > 1.0:
                            c = c / 100.0
                        conf_sum += float(c)

        avg_conf = (conf_sum / word_count) if word_count > 0 else 0.0
        quality = "good" if avg_conf >= 0.80 else ("fair" if avg_conf >= 0.60 else "poor")
        return {"avg_conf": avg_conf, "words": word_count, "quality": quality}
    except Exception:
        return {"avg_conf": 0.0, "words": 0, "quality": "unknown"}

def extract_text_from_image_bytes(image_bytes: bytes, return_detailed: bool = False) -> Union[str, Dict[str, Any]]:
    """
    Pura teksti kuvasta Google Vision API:lla.

    Args:
        image_bytes: Kuva raakatavuina (PNG/JPEG, EI base64-str)
        return_detailed: True -> palauttaa dict jossa lisätietoja

    Returns:
        str tai dict
    """
    if not isinstance(image_bytes, (bytes, bytearray)):
        raise TypeError("image_bytes pitää olla bytes/bytearray")

    # Pieni debug: tavujen koko + header
    sig = bytes(image_bytes[:8])
    print(f"🔎 Vision payload: {len(image_bytes)} B, header={sig}")

    # Tarkistus PIL:llä (ei pakollinen, mutta hyödyllinen logeille)
    _pil_verify(image_bytes)

    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=image_bytes)

    # document_text_detection on parempi teknisille piirustuksille
    response = client.document_text_detection(image=image)

    if response.error.message:
        # Nosta selkeä virhe; kutsuva koodi voi ottaa kiinni ja palauttaa oman muodon
        raise RuntimeError(f"Vision API error: {response.error.message}")

    full = response.full_text_annotation
    text = full.text if full and getattr(full, "text", None) else ""

    if not return_detailed:
        return text

    summary = _summarize_confidence(full or {})
    return {
        "status": "success",
        "text": text,
        "text_length": len(text),
        "confidence": summary["avg_conf"],
        "quality": summary["quality"],
        "words_found": summary["words"],
    }

# Yhteensopivuus-wrapper vanhoille kutsuille
def extract_text_simple(image_bytes: bytes) -> str:
    """Palauttaa vain täystekstin."""
    return extract_text_from_image_bytes(image_bytes, return_detailed=False)
