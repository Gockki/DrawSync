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
# INDUSTRY-SPECIFIC PROMPTS
# -----------------------------

COATING_PROMPT = """
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
  "huomiot": ["Tärkeät huomiot taulukossa tai piirustuksessa.Muista ilmoittaa täälläkin mitat euroopassa käytettyjä mittoja"],
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

STEEL_PROMPT = """
Analysoi tämä teräsrakennepiirustus ja tee kaksi-vaiheinen analyysi:

VAIHE 1 - OCR TEKSTIN LUKEMINEN:
Lue ja tunnista kaikki teksti piirustuksesta:
- Teräsprofiilit (IPE, HEA, SHS, UPE, lattateräkset)
- Profiilikoot (esim. IPE300, SHS120x5)
- Pituudet (L=8740, k600)
- Kappalemäärät
- Materiaalimerkinnät (S355J2, S355J2H)
- Liitostiedot ja kiinnitykset

VAIHE 2 - VISUAALINEN ANALYYSI:
Analysoi rakenne ja yhdistä OCR-tietoihin:
- Tunnista jokainen teräsprofiili ja sen sijainti
- Laske profiilin todellinen pituus piirustuksesta
- Laske kokonaiskappalemäärät per profiili
- Arvioi kokonaispaino
- Tunnista kokoonpanorakenne

Palauta VAIN validi JSON seuraavassa muodossa:

{
  "perustiedot": {
    "projektin_nimi": "projektin nimi tai null",
    "kohde": "rakennuskohde tai null",
    "piirustus_numero": "piirustuksen numero tai null",
    "suunnittelija": "suunnittelija tai null"
  },
  "materiaalilista": [
    {
      "profiili": "IPE300",
      "kuvaus": "I-palkki 300mm",
      "pituus_mm": 8740,
      "kappalemaara": 4,
      "kokonaispituus_m": 34.96,
      "paino_per_metri_kg": 42.2,
      "kokonaispaino_kg": 1475,
      "materiaali": "S355J2"
    }
  ],
  "yhteenveto": {
    "kokonaispaino_kg": 0,
    "profiilityypit_lkm": 0,
    "kokonaiskappaleet": 0,
    "kokonaispituus_m": 0
  },
  "ostolista": {
    "hukka_prosentti": 5,
    "ostettava_pituus_m": 0,
    "arvioitu_kustannus_eur": 0
  },
  "huomiot": [],
  "processing_info": {
    "model_used": "gpt-5",
    "confidence": 0.9,
    "processing_time": 0
  }
}

TÄRKEÄÄ:
- Tunnista KAIKKI teräsprofiilit piirustuksesta
- Laske tarkat pituudet ja kappalemäärät
- Käytä standardeja teräspainoja (kg/m)
- Jos jokin tieto ei ole selvästi näkyvissä, käytä null-arvoa
"""

MACHINING_PROMPT = """
Analysoi tämä koneistuspiirustus ja tee kaksi-vaiheinen analyysi:

VAIHE 1 - OCR TEKSTIN LUKEMINEN:
Lue ja tunnista kaikki teksti piirustuksesta:
- Materiaalimerkinnät (6061-T6, 304SS, St37)
- Toleranssit (±0.01, ±0.1, h7, H7)
- GD&T merkinnät (⌖, ⊥, //, ○)
- Pinnanlaatu (Ra 0.8, Ra 3.2)
- Mitat ja reikien koot
- Kappalemäärät ja sarjakoot

VAIHE 2 - VISUAALINEN ANALYYSI:
Analysoi geometria ja yhdistä OCR-tietoihin:
- Tunnista koneistusoperaatiot (sorvi, jyrsin, poraus)
- Arvioi valmistuksen kompleksisuus
- Laske kappaleen tilavuus ja massa
- Tunnista kriittiset toleranssit
- Arvioi valmistusaika

Palauta VAIN validi JSON seuraavassa muodossa:

{
  "perustiedot": {
    "osa_numero": "osan numero tai null",
    "osa_nimi": "osan nimi tai null",
    "materiaali": "materiaali tai null",
    "sarjakoko": 0,
    "massa_kg": 0.0,
    "tilavuus_cm3": 0.0
  },
  "toleranssit": [
    {
      "mitta": "Ø50",
      "toleranssi": "h7",
      "yläraja": 50.0,
      "alaraja": 49.975,
      "kriittisyys": "korkea"
    }
  ],
  "koneistusoperaatiot": [
    {
      "operaatio": "sorvi",
      "kuvaus": "Ulkopinnan koneistus",
      "aika_min": 15,
      "kompleksisuus": "keskinkertainen",
      "työkalu": "karbiditerä"
    }
  ],
  "yhteenveto": {
    "valmistusaika_h": 0.0,
    "kompleksisuus": "matala",
    "kriittisten_toleranssien_lkm": 0,
    "operaatioiden_lkm": 0
  },
  "huomiot": [],
  "processing_info": {
    "model_used": "gpt-5",
    "confidence": 0.9,
    "processing_time": 0
  }
}

TÄRKEÄÄ:
- Tunnista KAIKKI toleranssit ja GD&T merkinnät
- Arvioi realistisia koneistusaikoja
- Jos jokin tieto ei ole selvästi näkyvissä, käytä null-arvoa
"""

def get_prompt_for_industry(industry_type: str) -> str:
    """Get industry-specific prompt"""
    prompts = {
        "coating": COATING_PROMPT,
        "steel": STEEL_PROMPT,
        "machining": MACHINING_PROMPT
    }
    return prompts.get(industry_type, COATING_PROMPT)

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
# MAIN GPT FUNCTION - Now with industry support
# -----------------------------

def extract_structured_data_with_vision(image_bytes: bytes, industry_type: str = "coating") -> dict:
    """
    Lähettää kuvan GPT-5:lle ja palauttaa industry-specific rakenteen.
    
    Args:
        image_bytes: Image data as bytes
        industry_type: 'coating', 'steel', or 'machining'
        
    Returns:
        Industry-specific structured data
    """
    try:
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        # ✅ Select industry-specific prompt
        system_prompt = get_prompt_for_industry(industry_type)
        
        logger.info(f"Processing {industry_type} drawing with GPT-5")

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
        logger.info(f"GPT-5 response length: {len(raw_content)}")
        
        try:
            data = json.loads(raw_content)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            logger.error(f"Raw content: {raw_content}")
            raise ValueError(f"Virheellinen JSON-vastaus GPT:ltä: {e}")

        # ✅ Add industry type to response
        data["industry_type"] = industry_type

        # ✅ Validate and enhance based on industry
        if industry_type == "coating":
            enhanced_data = validate_and_enhance_coating_result(data)
        elif industry_type == "steel":
            enhanced_data = validate_and_enhance_steel_result(data)
        elif industry_type == "machining":
            enhanced_data = validate_and_enhance_machining_result(data)
        else:
            enhanced_data = validate_and_enhance_coating_result(data)  # fallback
        
        logger.info(f"Successfully processed {industry_type} drawing with GPT-5")
        return enhanced_data

    except Exception as e:
        logger.error(f"Vision processing failed: {str(e)}")
        # Return industry-appropriate error structure
        return create_error_response(industry_type, str(e))

# -----------------------------
# Industry-specific validation functions
# -----------------------------

def validate_and_enhance_coating_result(data: dict) -> dict:
    """Original coating validation logic"""
    # Existing coating validation code...
    # (keeping the original function logic)
    
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
        logger.info(f"Using GPT-5 calculated surface area: {gpt_surface_area} cm²")
        data["pinta_ala_analyysi"]["method"] = "gpt5_vision_analysis"
        
        python_area = calculate_python_surface_area(data)
        if python_area:
            diff = abs(gpt_surface_area - python_area)
            if diff > python_area * 0.1:  # > 10% ero
                data["huomiot"].append(
                    f"Pinta-ala-ero: GPT-5={gpt_surface_area} cm², Python={python_area} cm² (käytetään GPT-5)"
                )
    else:
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
    
    # Lisää prosessointitiedot
    data["processing_info"].update({
        "model_used": "gpt-5",
        "confidence": 0.9,
        "processing_time": 2.0,
        "surface_area_method": data["pinta_ala_analyysi"].get("method", "unknown")
    })
    
    data["success"] = True
    return data

def validate_and_enhance_steel_result(data: dict) -> dict:
    """Steel-specific validation and enhancement"""
    
    # Ensure required steel structure
    if "perustiedot" not in data:
        data["perustiedot"] = {}
    if "materiaalilista" not in data:
        data["materiaalilista"] = []
    if "yhteenveto" not in data:
        data["yhteenveto"] = {}
    if "ostolista" not in data:
        data["ostolista"] = {}
    if "huomiot" not in data:
        data["huomiot"] = []
    if "processing_info" not in data:
        data["processing_info"] = {}

    # Calculate totals from material list
    total_weight = 0
    total_length = 0
    total_pieces = 0
    
    for item in data["materiaalilista"]:
        if item.get("kokonaispaino_kg"):
            total_weight += item["kokonaispaino_kg"]
        if item.get("kokonaispituus_m"):
            total_length += item["kokonaispituus_m"]
        if item.get("kappalemaara"):
            total_pieces += item["kappalemaara"]

    # Update summary
    data["yhteenveto"].update({
        "kokonaispaino_kg": round(total_weight, 2),
        "profiilityypit_lkm": len(data["materiaalilista"]),
        "kokonaiskappaleet": total_pieces,
        "kokonaispituus_m": round(total_length, 2)
    })

    # Calculate purchase list with waste percentage
    waste_percent = data["ostolista"].get("hukka_prosentti", 5)
    purchase_length = total_length * (1 + waste_percent / 100)
    
    data["ostolista"].update({
        "hukka_prosentti": waste_percent,
        "ostettava_pituus_m": round(purchase_length, 2),
        "arvioitu_kustannus_eur": 0  # To be calculated separately
    })

    # Add processing info
    data["processing_info"].update({
        "model_used": "gpt-5",
        "confidence": 0.9,
        "processing_time": 2.0
    })
    
    data["success"] = True
    return data

def validate_and_enhance_machining_result(data: dict) -> dict:
    """Machining-specific validation and enhancement"""
    
    # Ensure required machining structure
    if "perustiedot" not in data:
        data["perustiedot"] = {}
    if "toleranssit" not in data:
        data["toleranssit"] = []
    if "koneistusoperaatiot" not in data:
        data["koneistusoperaatiot"] = []
    if "yhteenveto" not in data:
        data["yhteenveto"] = {}
    if "huomiot" not in data:
        data["huomiot"] = []
    if "processing_info" not in data:
        data["processing_info"] = {}

    # Calculate totals
    total_time = sum(op.get("aika_min", 0) for op in data["koneistusoperaatiot"])
    critical_tolerances = sum(1 for tol in data["toleranssit"] if tol.get("kriittisyys") == "korkea")
    
    # Determine overall complexity
    complexity_scores = [op.get("kompleksisuus", "matala") for op in data["koneistusoperaatiot"]]
    if "korkea" in complexity_scores:
        overall_complexity = "korkea"
    elif "keskinkertainen" in complexity_scores:
        overall_complexity = "keskinkertainen"
    else:
        overall_complexity = "matala"

    # Update summary
    data["yhteenveto"].update({
        "valmistusaika_h": round(total_time / 60, 2),
        "kompleksisuus": overall_complexity,
        "kriittisten_toleranssien_lkm": critical_tolerances,
        "operaatioiden_lkm": len(data["koneistusoperaatiot"])
    })

    # Add processing info
    data["processing_info"].update({
        "model_used": "gpt-5",
        "confidence": 0.9,
        "processing_time": 2.0
    })
    
    data["success"] = True
    return data

def create_error_response(industry_type: str, error_msg: str) -> dict:
    """Create industry-appropriate error response"""
    base_error = {
        "success": False,
        "error": error_msg,
        "industry_type": industry_type,
        "huomiot": [f"Analyysi epäonnistui: {error_msg}"],
        "processing_info": {
            "model_used": OPENAI_MODEL,
            "error": error_msg,
            "confidence": 0
        }
    }
    
    if industry_type == "steel":
        base_error.update({
            "perustiedot": {},
            "materiaalilista": [],
            "yhteenveto": {},
            "ostolista": {}
        })
    elif industry_type == "machining":
        base_error.update({
            "perustiedot": {},
            "toleranssit": [],
            "koneistusoperaatiot": [],
            "yhteenveto": {}
        })
    else:  # coating
        base_error.update({
            "perustiedot": {},
            "mitat": {"ulkomitat_mm": {}, "reiät": []},
            "pinta_ala_analyysi": {
                "pinta_ala_cm2": None,
                "laskelma": f"Virhe analysoinnissa: {error_msg}",
                "varmuus": "ei saatavilla"
            }
        })
    
    return base_error

# -----------------------------
# Helper functions (keep existing)
# -----------------------------

def calculate_python_surface_area(data: dict) -> float:
    """Erillinen Python-laskelma backupiksi."""
    mitat = data["mitat"].get("ulkomitat_mm", {})
    pituus = mitat.get("pituus")
    leveys = mitat.get("leveys")
    
    if not (pituus and leveys and pituus > 0 and leveys > 0):
        return None
    
    gross_cm2 = (pituus * leveys) / 100.0  # mm² → cm²
    
    holes_cm2 = 0
    for reika in data["mitat"].get("reiät", []):
        if reika.get("halkaisija_mm") and reika.get("määrä"):
            r_cm = (reika["halkaisija_mm"] / 10) / 2
            hole_area = math.pi * (r_cm ** 2)
            holes_cm2 += hole_area * reika["määrä"]
    
    net_cm2 = max(gross_cm2 - holes_cm2, 0)
    return net_cm2

def create_summary(data: dict) -> str:
    """Luo lyhyt yhteenveto analyysistä."""
    perustiedot = data.get("perustiedot", {})
    
    if data.get("industry_type") == "steel":
        pituus = data.get("yhteenveto", {}).get("kokonaispituus_m", 0)
        paino = data.get("yhteenveto", {}).get("kokonaispaino_kg", 0)
        return f"Teräsrakenne | {pituus}m | {paino}kg"
    elif data.get("industry_type") == "machining":
        aika = data.get("yhteenveto", {}).get("valmistusaika_h", 0)
        kompleksisuus = data.get("yhteenveto", {}).get("kompleksisuus", "tuntematon")
        return f"Koneistus | {aika}h | {kompleksisuus}"
    else:  # coating
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