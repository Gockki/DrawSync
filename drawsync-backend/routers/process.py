# drawsync-backend/routers/process.py
from __future__ import annotations

import os
import io
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from lib.auth_middleware import require_user, AuthenticatedUser

# PDF -> PNG
try:
    import fitz  # PyMuPDF
except Exception as e:
    fitz = None

from PIL import Image

# Teidän valmiit apurit
from lib.ocr_image_prep import normalize_for_vision
from lib.ocr_utils import extract_text_from_image_bytes
from lib.gpt_utils import extract_structured_data_with_vision
from lib.steel_ocr_integration import create_steel_prompt_with_ocr
from lib.industry_config import get_prompt

router = APIRouter(prefix="", tags=["process"])
log = logging.getLogger("process")

# ---------------------------
# Apuja
# ---------------------------

def _project_root() -> str:
    # tämä tiedosto on .../routers/process.py -> juureen yksi taso ylös
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def _load_industry_configs() -> dict:
    """
    Lataa industry_configs.json seuraavassa järjestyksessä:
    1) INDUSTRY_CONFIG_PATH (absoluuttinen tai suhteellinen)
    2) <backend-juuri>/industry_configs.json
    3) <tämä kansio>/industry_configs.json
    4) <backend-juuri>/config/industry_configs.json
    5) <cwd>/industry_configs.json tai <cwd>/config/industry_configs.json
    """
    candidates = []

    # 1) env-override
    env_path = os.getenv("INDUSTRY_CONFIG_PATH", "").strip()
    if env_path:
        candidates.append(os.path.abspath(env_path))

    # 2) backend-juuri (routers/..)
    root = _project_root()
    candidates.append(os.path.join(root, "industry_configs.json"))

    # 3) sama kansio varalta
    here = os.path.dirname(__file__)
    candidates.append(os.path.join(here, "industry_configs.json"))

    # 4) /config/-alikansioita
    candidates.append(os.path.join(root, "config", "industry_configs.json"))

    # 5) työskentelyhakemisto
    cwd = os.getcwd()
    candidates.append(os.path.join(cwd, "industry_configs.json"))
    candidates.append(os.path.join(cwd, "config", "industry_configs.json"))

    for path in candidates:
        if path and os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            # loggaa kerran, jotta näet mistä luettiin
            log.info(f"Loaded industry configs from: {path}")
            return data

    raise HTTPException(status_code=500, detail="Prompt configuration file not found")


def _get_prompt(industry_type: str) -> str:
    cfg = _load_industry_configs()
    block = cfg.get(industry_type)
    if not block:
        # autetaan debuggia listaamalla mitkä on saatavilla
        available = ", ".join(sorted(cfg.keys()))
        raise HTTPException(
            status_code=400,
            detail=f"Unknown industry_type '{industry_type}'. Available: {available}"
        )
    prompt = (block.get("prompt") or "").strip()
    if not prompt:
        raise HTTPException(status_code=500, detail=f"No prompt configured for '{industry_type}'")
    return prompt


def _ensure_pdf_support():
    if fitz is None:
        raise HTTPException(status_code=500, detail="PDF support (PyMuPDF) not available")

def _pdf_to_png_bytes(pdf_bytes: bytes, dpi: int = 220) -> bytes:
    _ensure_pdf_support()
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid PDF")

    try:
        page = doc.load_page(0)
        # DPI-matriisi (72 -> dpi)
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        png_bytes = pix.tobytes("png")
        return normalize_for_vision(png_bytes)
    finally:
        doc.close()

def _image_to_bytes(file: UploadFile) -> bytes:
    """Lue kuva ja varmista peruskelpoisuus PIL:llä, sitten normalisoi Visionia varten."""
    data = file.file.read()
    if not isinstance(data, (bytes, bytearray)):
        data = data if data is not None else b""
    try:
        # Quick open & re-save in-memory jos tarve
        Image.open(io.BytesIO(data)).load()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image")
    return normalize_for_vision(data)

def _prepare_image_bytes(upload: UploadFile, raw_bytes: bytes) -> bytes:
    ct = (upload.content_type or "").lower()
    fname = (upload.filename or "").lower()
    is_pdf = "pdf" in ct or fname.endswith(".pdf")
    if is_pdf:
        return _pdf_to_png_bytes(raw_bytes)
    return normalize_for_vision(raw_bytes)

# ---------------------------
# Endpoint
# ---------------------------

@router.post("/process")
async def process_endpoint(
    file: UploadFile = File(...),
    industry_type: Optional[str] = Form(None),
    user: AuthenticatedUser = Depends(require_user),
):
    """
    Käsittelee PDF/kuvan:
      1) PDF->PNG (ensimmäinen sivu), muuten normalisoi kuva Visionia varten
      2) Lataa industry-kohtaisen promptin
      3) (steel) Rikastaa promptin Vision-OCR:llä
      4) Kutsuu GPT-visionia ja palauttaa aina rakenteisen JSONin
    """
    # --- Perusvalidoinnit ---
    if not file:
        raise HTTPException(status_code=422, detail="file is required")

    max_mb = int(os.getenv("MAX_FILE_SIZE_MB", "25"))
    raw = await file.read()
    if len(raw) > max_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File too large (>{max_mb}MB)")

    itype = (industry_type or "coating").strip().lower()

    # --- Kuvan valmistelu ---
    try:
        image_bytes = _prepare_image_bytes(file, raw)
    except HTTPException:
        raise
    except Exception:
        log.exception("Image normalization failed")
        raise HTTPException(status_code=400, detail="Image normalization failed")

    # --- Prompt ---
    try:
        base_prompt = _get_prompt(itype)
    except HTTPException:
        raise
    except Exception:
        log.exception("Loading industry prompt failed")
        raise HTTPException(status_code=500, detail="Prompt configuration error")

    final_prompt = base_prompt

    # --- Steel: OCR-rikastus -> parempi prompt ---
    if itype == "steel":
        try:
            ocr = extract_text_from_image_bytes(image_bytes, return_detailed=True)
            final_prompt = create_steel_prompt_with_ocr(base_prompt, ocr)
        except Exception as e:
            # Ei kaadeta jos OCR epäonnistuu – jatka ilman rikastusta
            log.warning(f"OCR enrich failed: {e}")

    # --- GPT Vision ---
    try:
        result = extract_structured_data_with_vision(
            image_bytes=image_bytes,
            prompt=final_prompt,
            industry_type=itype,
        )
    except Exception:
        log.exception("GPT vision call failed")
        # Vaikka gpt_utils jo palauttaa virherakenteen useimmissa tapauksissa,
        # varmistetaan siisti virheviesti jos jotain odottamatonta tapahtuu.
        raise HTTPException(status_code=500, detail="Vision analysis failed")

    # --- Palautemuoto: aina success-kenttä ja payload juureen ---
    if not isinstance(result, dict):
        return {"success": True, "result": result, "industry_type": itype}

    # Jos gpt_utils palautti virhemuodon, siinä on success=False -> säilytä
    if "success" not in result:
        result["success"] = True

    # Talleta myös endpointin meta, jos hyödyllistä
    result.setdefault("industry_type", itype)

    return result
