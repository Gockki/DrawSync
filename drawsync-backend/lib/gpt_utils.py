# drawsync-backend/lib/gpt_utils.py

import os
from dotenv import load_dotenv
load_dotenv()

from openai import OpenAI
import base64
import math
import json
import logging

logger = logging.getLogger(__name__)

# OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5")  # GPT-5 juuri julkaistu!

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
# GPT-funktio
# -----------------------------

def extract_structured_data_with_vision(image_bytes: bytes) -> dict:
    """
    Lähettää kuvan GPT-5:lle ja palauttaa frontend-yhteensopivan rakenteen.
    Käyttää uusinta GPT-5 mallia paremman analyysin saamiseksi.
    """
    try:
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        system_prompt = """
Saat teknisen piirustuksen kuvan.Analysoi kuva tarkasti ja tunnista:

1. PERUSTIEDOT: Tuotekoodit, nimet, materiaalit, painot, asiakastiedot
2. MITAT: Pituus, leveys, korkeus millimetreinä (tarkkuus tärkeää)
3. REIÄT: Halkaisijat ja määrät (laske huolellisesti)  
4. PINTA-ALA: Laske tarkka pinta-ala mitoista (brutto - reiät = netto)

Käytä parannettuja OCR-kykyjäsi tunnistamaan pienetkin tekstit ja mitat.

Palauta VAIN validi JSON seuraavassa muodossa:

{
  "perustiedot": {
    "tuotekoodi": "tunnistettu koodi tai null",
    "tuotenimi": "tunnistettu nimi tai null", 
    "materiaali": "materiaali (Al, Steel, Stainless, Plastic, jne.) tai null",
    "paino_kg": 0.0,
    "loppuasiakas": "asiakasnimi jos näkyy tai null",
    "pinnoite": "pinnoitetyyppi jos mainittu tai null",
    "pintakarheus_ra": "karheus-arvo jos mainittu tai null",
    "eräkoko": "sarjakoko jos mainittu tai null"
  },
  "mitat": {
    "ulkomitat_mm": {
      "pituus": 0,
      "leveys": 0, 
      "korkeus": 0
    },
    "reiät": [
      {"halkaisija_mm": 0, "määrä": 0}
    ]
  },
  "pinta_ala_analyysi": {
    "pinta_ala_cm2": 0.0,
    "laskelma": "Laskettu mitoista: pituus x leveys",
    "varmuus": "korkea/keskitaso/matala"
  },
  "huomiot": ["Tärkeät huomiot taulukossa tai piirustuksessa.Muista ilmoittaa täälläkin mitat euroopassa käytettyjä mittoja],
  "processing_info": {
    "model_used": "gpt-5",
    "confidence": 0.9,
    "processing_time": 0
  }
}

TÄRKEÄÄ:
- Jos jokin tieto ei ole selvästi näkyvissä, käytä null-arvoa
- Laske pinta-ala mitoista jos mahdollista (mm² → cm²)
- Tunnista toleranssit ja lisää huomioihin
- Käytä GPT-5:n parannettuja multimodaali-kykyjä tekstin tunnistukseen
"""

        response = client.chat.completions.create(
            model=OPENAI_MODEL,  # GPT-5
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{image_base64}"}
                    }
                ]},
            ],
        
        )

        raw_content = response.choices[0].message.content
        logger.info(f"GPT response length: {len(raw_content)}")
        
        try:
            data = json.loads(raw_content)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            logger.error(f"Raw content: {raw_content}")
            raise ValueError(f"Virheellinen JSON-vastaus GPT:ltä: {e}")

        # Validoi ja paranna tulosta
        enhanced_data = validate_and_enhance_result(data)
        
        logger.info(f"Successfully processed with GPT-5, found: {enhanced_data.get('perustiedot', {}).get('tuotenimi', 'Unknown')}")
        return enhanced_data

    except Exception as e:
        logger.error(f"Vision processing failed: {str(e)}")
        # Palauta virhetilanne mutta frontend-yhteensopivassa muodossa
        return {
            "success": False,
            "error": str(e),
            "perustiedot": {},
            "mitat": {"ulkomitat_mm": {}, "reiät": []},
            "pinta_ala_analyysi": {
                "pinta_ala_cm2": None,
                "laskelma": f"Virhe analysoinnissa: {str(e)}",
                "varmuus": "ei saatavilla"
            },
            "huomiot": [f"Analyysi epäonnistui: {str(e)}"],
            "processing_info": {
                "model_used": OPENAI_MODEL,
                "error": str(e),
                "confidence": 0
            }
        }

# -----------------------------
# Validointi ja parannus
# -----------------------------

def validate_and_enhance_result(data: dict) -> dict:
    """
    Täyttää puuttuvat arvot. GPT-5:n laskemaa pinta-alaa käytetään ensisijaisesti,
    Python laskee vain backupina jos GPT-5 ei onnistunut.
    """
    
    # Varmista että kaikki tarvittavat kentät ovat olemassa
    if "perustiedot" not in data:
        data["perustiedot"] = {}
    if "mitat" not in data:
        data["mitat"] = {"ulkomitat_mm": {}, "reiät": []}
    if "pinta_ala_analyysi" not in data:
        data["pinta_ala_analyysi"] = {}
    if "huomiot" not in data:
        data["huomiot"] = []
    if "processing_info" not in data:
        data["processing_info"] = {}

    # Muunna paino kg:ksi jos annettu
    perustiedot = data["perustiedot"]
    if perustiedot.get("paino_kg"):
        weight_kg = convert_weight_to_kg(perustiedot["paino_kg"])
        if weight_kg:
            perustiedot["paino_kg"] = weight_kg

    # PINTA-ALA STRATEGIA: Luota GPT-5:een, Python vain backupina
    gpt_surface_area = data["pinta_ala_analyysi"].get("pinta_ala_cm2")
    
    if gpt_surface_area and gpt_surface_area > 0:
        # GPT-5 onnistui laskemaan - käytä sitä!
        logger.info(f"Using GPT-5 calculated surface area: {gpt_surface_area} cm²")
        data["pinta_ala_analyysi"]["method"] = "gpt5_vision_analysis"
        
        # Lisää Python-laskelma vertailuksi (ei korvaa)
        python_area = calculate_python_surface_area(data)
        if python_area:
            diff = abs(gpt_surface_area - python_area)
            if diff > python_area * 0.1:  # > 10% ero
                data["huomiot"].append(
                    f"Pinta-ala-ero: GPT-5={gpt_surface_area} cm², Python={python_area} cm² (käytetään GPT-5)"
                )
    else:
        # GPT-5 ei onnistunut - käytä Python backuppia
        logger.info("GPT-5 didn't calculate surface area, using Python backup")
        python_area = calculate_python_surface_area(data)
        if python_area:
            data["pinta_ala_analyysi"].update({
                "pinta_ala_cm2": round(python_area, 2),
                "laskelma": "Python backup-laskelma mitoista",
                "varmuus": "keskitaso",
                "method": "python_backup_calculation"
            })
        else:
            data["pinta_ala_analyysi"].update({
                "pinta_ala_cm2": None,
                "laskelma": "Pinta-alaa ei voitu laskea - mitat puuttuvat",
                "varmuus": "ei saatavilla",
                "method": "failed"
            })
    
    # Lisää prosessointitiedot GPT-5:lle
    data["processing_info"].update({
        "model_used": "gpt-5",
        "confidence": 0.9,  # GPT-5 on tarkempi
        "processing_time": 2.0,  # GPT-5 saattaa olla hieman hitaampi
        "surface_area_method": data["pinta_ala_analyysi"].get("method", "unknown")
    })
    
    # Lisää success-flag
    data["success"] = True
    
    return data

def calculate_python_surface_area(data: dict) -> float:
    """Erillinen Python-laskelma backupiksi."""
    mitat = data["mitat"].get("ulkomitat_mm", {})
    pituus = mitat.get("pituus")
    leveys = mitat.get("leveys")
    
    if not (pituus and leveys and pituus > 0 and leveys > 0):
        return None
    
    # Laske brutto pinta-ala
    gross_cm2 = (pituus * leveys) / 100.0  # mm² → cm²
    
    # Vähennä reiät
    holes_cm2 = 0
    for reika in data["mitat"].get("reiät", []):
        if reika.get("halkaisija_mm") and reika.get("määrä"):
            r_cm = (reika["halkaisija_mm"] / 10) / 2  # mm → cm → säde
            hole_area = math.pi * (r_cm ** 2)
            holes_cm2 += hole_area * reika["määrä"]
    
    net_cm2 = max(gross_cm2 - holes_cm2, 0)
    return net_cm2

def create_summary(data: dict) -> str:
    """Luo lyhyt yhteenveto analyysistä."""
    perustiedot = data.get("perustiedot", {})
    pinta_ala = data.get("pinta_ala_analyysi", {})
    
    summary_parts = []
    
    if perustiedot.get("tuotenimi"):
        summary_parts.append(perustiedot["tuotenimi"])
    elif perustiedot.get("tuotekoodi"):
        summary_parts.append(perustiedot["tuotekoodi"])
    else:
        summary_parts.append("Tuntematon tuote")
    
    if perustiedot.get("materiaali"):
        summary_parts.append(perustiedot["materiaali"])
    
    if pinta_ala.get("pinta_ala_cm2"):
        summary_parts.append(f"{pinta_ala['pinta_ala_cm2']} cm²")
    
    return " | ".join(summary_parts)