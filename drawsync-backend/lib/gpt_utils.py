import os
from dotenv import load_dotenv
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5")

from openai import OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

import base64
import math
import json
from openai import OpenAI

# Luo OpenAI-asiakas
client = OpenAI()

# -----------------------------
# Laskenta-apurit
# -----------------------------

def mm_to_cm(mm):
    return mm / 10 if mm is not None else None

def cm_to_m(cm):
    return cm / 100 if cm is not None else None

def calculate_surface_area(dimensions):
    """
    Laskee brutto-, netto- ja reikäpinta-alan cm² ja m² yksiköissä.
    dimensions = { "overall": { "L_mm": float, "W_mm": float },
                   "features": [{ "type": "hole", "diameter_mm": float, "count": int }] }
    """
    if not dimensions or "overall" not in dimensions:
        return None

    L_mm = dimensions["overall"].get("L_mm")
    W_mm = dimensions["overall"].get("W_mm")

    if not L_mm or not W_mm:
        return None

    gross_cm2 = (L_mm * W_mm) / 100.0  # mm² → cm²
    holes_cm2 = 0.0

    for feat in dimensions.get("features", []):
        if feat.get("type") == "hole" and feat.get("diameter_mm") and feat.get("count"):
            r_cm = (feat["diameter_mm"] / 10) / 2
            hole_area = math.pi * (r_cm ** 2)
            holes_cm2 += hole_area * feat["count"]

    net_cm2 = max(gross_cm2 - holes_cm2, 0)

    return {
        "gross_cm2": round(gross_cm2, 2),
        "net_cm2": round(net_cm2, 2),
        "holes_cm2": round(holes_cm2, 2),
        "gross_m2": round(gross_cm2 / 10000, 4),
        "net_m2": round(net_cm2 / 10000, 4),
        "holes_m2": round(holes_cm2 / 10000, 4),
        "method": "calculated_from_dimensions",
        "confidence": 0.9
    }

def convert_weight_to_kg(weight_str):
    """Muuntaa painon merkkijonosta (lb/kg/g) kilogrammoiksi."""
    if not weight_str:
        return None
    s = str(weight_str).lower().strip()
    try:
        if "lb" in s:
            return round(float(s.replace("lb", "").strip()) * 0.453592, 3)
        elif "kg" in s:
            return round(float(s.replace("kg", "").strip()), 3)
        elif "g" in s:
            return round(float(s.replace("g", "").strip()) / 1000.0, 3)
        else:
            return round(float(s), 3)
    except:
        return None

# -----------------------------
# GPT-5 Multimodaalifunktio
# -----------------------------

def extract_structured_data_with_vision(image_bytes: bytes) -> dict:
    """
    Lähettää kuvan GPT-5:lle (ei ulkoista OCR:ää).
    Palaa yhtenäinen JSON-skeema. Korjattu image_url → objekti.
    """
    import base64, json
    image_base64 = base64.b64encode(image_bytes).decode("utf-8")

    system_prompt = """
Saat teknisen piirustuksen kuvan. Tunnista näkyvät tiedot ja palauta vain validi JSON
seuraavan skeeman mukaan. Jos jokin tieto ei ole varmasti luettavissa, lisää lyhyt selite
'provenance.assumptions' -listaan. Älä tee pinta-alalaskuja itse.

{
  "metadata": {
    "title": null | string,
    "drawing_number": null | string,
    "material": null | string,
    "weight": null | string,
    "customer": null | string
  },
  "geometry": {
    "class": null | "plate" | "cylinder" | "freeform" | "other",
    "shape": null | "rectangle" | "circle" | "complex",
    "justification": null | string
  },
  "dimensions": {
    "overall": { "L_mm": null | number, "W_mm": null | number, "T_mm": null | number },
    "features": [
      { "type": "hole", "diameter_mm": number, "count": number }
    ]
  },
  "surface_area": {
    "gross_cm2": null,
    "net_cm2": null,
    "holes_cm2": null,
    "method": null,
    "confidence": null
  },
  "bom": [
    { "pos": number | null, "name": string | null, "qty": number | null, "material": string | null, "std": string | null }
  ],
  "provenance": {
    "used_views": string[],
    "assumptions": string[]
  }
}
"""

    resp = client.chat.completions.create(
        model=OPENAI_MODEL,           # esim. "gpt-5"
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{image_base64}"}  # <-- korjaus
                }
            ]},
        ],
    )

    raw = resp.choices[0].message.content
    data = json.loads(raw)

    # Tee samat validoinnit/laskut kuin aiemmin jos sulla on validate_and_enhance_result:
    return validate_and_enhance_result(data) if 'validate_and_enhance_result' in globals() else data


# -----------------------------
# Validointi ja yhteenveto
# -----------------------------

def validate_and_enhance_result(data: dict):
    """Täyttää puuttuvat arvot ja laskee pinta-alat, jos mitat saatavilla."""
    # Paino kg:na
    if data.get("metadata", {}).get("weight"):
        data["metadata"]["weight_kg"] = convert_weight_to_kg(data["metadata"]["weight"])

    # Pinta-ala laskenta
    sa = calculate_surface_area(data.get("dimensions", {}))
    if sa:
        data["surface_area"] = sa
    else:
        # Jos GPT antoi jo arvion, confidence <= 0.5
        if data.get("surface_area", {}).get("net_cm2"):
            data["surface_area"]["confidence"] = min(data["surface_area"].get("confidence", 0.5), 0.5)

    return data

def create_summary(data: dict):
    """Lyhyt yhteenveto frontille."""
    meta = data.get("metadata", {})
    sa = data.get("surface_area", {})
    return (
        f"{meta.get('title', 'Piirustus')} | "
        f"{meta.get('material', '?')} | "
        f"Nettopinta-ala: {sa.get('net_cm2', '?')} cm² "
        f"(confidence {sa.get('confidence', '?')})"
    )
