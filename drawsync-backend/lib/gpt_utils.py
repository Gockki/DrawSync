# drawsync-backend/lib/gpt_utils.py - Yksinkertaistettu versio

import os
from dotenv import load_dotenv
load_dotenv()

from openai import OpenAI
import base64
import math
import json
import logging
import time

logger = logging.getLogger(__name__)

# OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5")  

# -----------------------------
# MAIN GPT FUNCTION - Yksinkertaistettu versio
# -----------------------------

def extract_structured_data_with_vision(
    image_bytes: bytes, 
    prompt: str,  # ← Prompt tulee parametrina (ei kovakoodattuna)
    industry_type: str = "coating"
) -> dict:
    """
    Lähettää kuvan GPT:lle industry-spesifisellä promptilla.
    
    Args:
        image_bytes: PNG/JPG image data as bytes (PDF on muunnettu PNG:ksi)
        prompt: GPT system prompt (tulee IndustryManager:istä)
        industry_type: Industry type for validation and enhancement
        
    Returns:
        Industry-specific structured data
    """
    start_time = time.time()
    
    try:
        logger.info(f"🤖 Processing {industry_type} image with {OPENAI_MODEL}")
        logger.info(f"📝 Prompt length: {len(prompt)} characters")
        logger.info(f"📊 Image size: {len(image_bytes)} bytes")
        
        # Encode image to base64
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        # ✅ GPT-5 API kutsu - toimii kuville
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": prompt},  # ← Käytä parametrina saatua promptia
                {"role": "user", "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{image_base64}"}
                    }
                ]},
            ],

        )

        raw_content = response.choices[0].message.content
        logger.info(f"📊 GPT response length: {len(raw_content)} characters")
        
        # Parse JSON response
        try:
            data = json.loads(raw_content)
        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON parse error: {e}")
            logger.error(f"Raw response preview: {raw_content[:500]}...")
            raise ValueError(f"Invalid JSON response from GPT: {e}")

        # Add metadata
        processing_time = round(time.time() - start_time, 2)
        data["industry_type"] = industry_type
        data["processing_info"] = {
            "model_used": OPENAI_MODEL,
            "confidence": 0.9,  # Placeholder - voisi laskea oikeasti response:in perusteella
            "processing_time": processing_time,
            "prompt_version": "2.0",
            "response_length": len(raw_content)
        }

        # Industry-specific validation and enhancement
        enhanced_data = validate_and_enhance_result(data, industry_type)
        
        logger.info(f"✅ Successfully processed {industry_type} drawing in {processing_time}s")
        return enhanced_data

    except Exception as e:
        processing_time = round(time.time() - start_time, 2)
        logger.error(f"❌ Vision processing failed after {processing_time}s: {str(e)}")
        
        # Return industry-appropriate error structure
        return create_error_response(industry_type, str(e), processing_time)

# -----------------------------
# Industry-specific validation functions
# -----------------------------

def validate_and_enhance_result(data: dict, industry_type: str) -> dict:
    """
    Validoi ja paranna tulosta industry-spesifisesti
    
    Args:
        data: GPT:n palauttama raw data
        industry_type: Teollisuuden tyyppi
        
    Returns:
        Validoitu ja parannettu data
    """
    try:
        if industry_type == "coating":
            return validate_and_enhance_coating_result(data)
        elif industry_type == "steel":
            return validate_and_enhance_steel_result(data)
        elif industry_type == "machining":
            return validate_and_enhance_machining_result(data)
        else:
            logger.warning(f"⚠️  Unknown industry type: {industry_type}, using coating validation")
            return validate_and_enhance_coating_result(data)
            
    except Exception as e:
        logger.error(f"❌ Validation failed for {industry_type}: {e}")
        # Return original data with warning
        data["validation_error"] = str(e)
        return data

def validate_and_enhance_coating_result(data: dict) -> dict:
    """Validoi ja paranna coating-tulosta"""
    
    # Varmista että kaikki tarvittavat kentät ovat olemassa
    if "perustiedot" not in data:
        data["perustiedot"] = {}
    if "mitat" not in data:
        data["mitat"] = {"ulkomitat_mm": {}, "reiät": []}
    if "pinta_ala_analyysi" not in data:
        data["pinta_ala_analyysi"] = {}
    if "huomiot" not in data:
        data["huomiot"] = []

    # Muunna paino kg:ksi jos annettu
    perustiedot = data["perustiedot"]
    if perustiedot.get("paino_kg"):
        weight_kg = convert_weight_to_kg(perustiedot["paino_kg"])
        if weight_kg:
            perustiedot["paino_kg"] = weight_kg

    # Pinta-ala laskenta: luota GPT:hen, Python vain backupina
    gpt_surface_area = data["pinta_ala_analyysi"].get("pinta_ala_cm2")
    
    if gpt_surface_area and gpt_surface_area > 0:
        logger.info(f"📐 Using GPT calculated surface area: {gpt_surface_area} cm²")
        data["pinta_ala_analyysi"]["method"] = "gpt_vision_analysis"
        
        # Python backup calculation
        python_area = calculate_python_surface_area(data)
        if python_area and abs(gpt_surface_area - python_area) > python_area * 0.15:  # >15% ero
            data["huomiot"].append(
                f"Pinta-ala-ero: GPT={gpt_surface_area} cm², Python={python_area} cm² (käytetään GPT)"
            )
    else:
        # Jos GPT ei antanut pinta-alaa, yritä laskea Python:illa
        python_area = calculate_python_surface_area(data)
        if python_area:
            data["pinta_ala_analyysi"]["pinta_ala_cm2"] = python_area
            data["pinta_ala_analyysi"]["method"] = "python_calculation"
            data["huomiot"].append("Pinta-ala laskettu mitoista (GPT ei antanut arvoa)")

    return data

def validate_and_enhance_steel_result(data: dict) -> dict:
    """Validoi ja paranna steel-tulosta"""
    
    # Varmista rakenne
    if "perustiedot" not in data:
        data["perustiedot"] = {}
    if "materiaalilista" not in data:
        data["materiaalilista"] = []
    if "yhteenveto" not in data:
        data["yhteenveto"] = {}
    if "huomiot" not in data:
        data["huomiot"] = []

    # Laske yhteenvedot jos puuttuvat
    total_weight = 0
    total_length = 0
    
    for material in data["materiaalilista"]:
        if material.get("kokonaispaino_kg"):
            total_weight += material["kokonaispaino_kg"]
        if material.get("pituus_mm") and material.get("kappaleet"):
            total_length += (material["pituus_mm"] / 1000) * material["kappaleet"]
    
    # Päivitä yhteenveto
    if total_weight > 0:
        data["yhteenveto"]["kokonaispaino_kg"] = round(total_weight, 1)
    if total_length > 0:
        data["yhteenveto"]["kokonaispituus_m"] = round(total_length, 1)
    
    data["yhteenveto"]["profiilityyppien_lkm"] = len(set(
        item.get("profiili", "") for item in data["materiaalilista"] if item.get("profiili")
    ))
    
    return data

def validate_and_enhance_machining_result(data: dict) -> dict:
    """Validoi ja paranna machining-tulosta"""
    
    # Varmista rakenne
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

    # Laske yhteenveto
    total_time = 0
    critical_tolerances = 0
    
    for operation in data["koneistusoperaatiot"]:
        if operation.get("aika_min"):
            total_time += operation["aika_min"]
    
    for tolerance in data["toleranssit"]:
        if tolerance.get("kriittisyys") == "korkea":
            critical_tolerances += 1
    
    # Päivitä yhteenveto
    data["yhteenveto"]["valmistusaika_h"] = round(total_time / 60, 2)
    data["yhteenveto"]["kriittisten_toleranssien_lkm"] = critical_tolerances
    data["yhteenveto"]["operaatioiden_lkm"] = len(data["koneistusoperaatiot"])
    
    # Arvio kompleksisuudesta
    if critical_tolerances >= 3 or total_time > 120:  # >2h
        complexity = "korkea"
    elif critical_tolerances >= 1 or total_time > 60:   # >1h  
        complexity = "keskinkertainen"
    else:
        complexity = "matala"
    
    data["yhteenveto"]["kompleksisuus"] = complexity
    
    return data

def create_error_response(industry_type: str, error_message: str, processing_time: float) -> dict:
    """Luo industry-spesifinen virhevastaus"""
    
    base_error = {
        "error": error_message,
        "success": False,
        "industry_type": industry_type,
        "processing_info": {
            "model_used": OPENAI_MODEL,
            "confidence": 0.0,
            "processing_time": processing_time,
            "error_occurred": True
        }
    }
    
    # Lisää industry-spesifinen tyhjä rakenne
    if industry_type == "steel":
        base_error.update({
            "perustiedot": {},
            "materiaalilista": [],
            "yhteenveto": {},
            "huomiot": ["Analyysi epäonnistui: " + error_message]
        })
    elif industry_type == "machining":
        base_error.update({
            "perustiedot": {},
            "toleranssit": [],
            "koneistusoperaatiot": [],
            "yhteenveto": {},
            "huomiot": ["Analyysi epäonnistui: " + error_message]
        })
    else:  # coating
        base_error.update({
            "perustiedot": {},
            "mitat": {},
            "pinta_ala_analyysi": {},
            "huomiot": ["Analyysi epäonnistui: " + error_message]
        })
    
    return base_error

# -----------------------------
# Helper functions
# -----------------------------

def convert_weight_to_kg(weight_str):
    """Muuntaa painon merkkijonosta kilogrammoiksi"""
    if not weight_str:
        return None
    s = str(weight_str).lower().strip()
    try:
        if "lb" in s:
            return round(float(s.replace("lb", "").strip()) * 0.453592, 3)
        elif "kg" in s:
            return round(float(s.replace("kg", "").strip()), 3)
        elif "g" in s and "kg" not in s:
            return round(float(s.replace("g", "").strip()) / 1000.0, 3)
        else:
            return round(float(s), 3)
    except:
        return None

def calculate_python_surface_area(data):
    """Backup pinta-ala laskenta Python:illa"""
    try:
        mitat = data.get("mitat", {}).get("ulkomitat_mm", {})
        length = mitat.get("pituus", 0)
        width = mitat.get("leveys", 0)
        
        if length and width and length > 0 and width > 0:
            gross_cm2 = (length * width) / 100.0  # mm² → cm²
            
            # Vähennä reikien pinta-ala
            holes_cm2 = 0
            for hole in data.get("mitat", {}).get("reiät", []):
                if hole.get("halkaisija_mm") and hole.get("määrä"):
                    r_cm = (hole["halkaisija_mm"] / 10) / 2  # mm → cm, halkaisija → säde
                    hole_area = math.pi * (r_cm ** 2)
                    holes_cm2 += hole_area * hole["määrä"]
            
            net_cm2 = max(gross_cm2 - holes_cm2, 0)
            logger.info(f"🧮 Python calculated: gross={gross_cm2:.1f}cm², holes={holes_cm2:.1f}cm², net={net_cm2:.1f}cm²")
            return round(net_cm2, 1)
        
        return None
    except Exception as e:
        logger.warning(f"⚠️  Python surface area calculation failed: {e}")
        return None

# Backward compatibility exports
__all__ = [
    'extract_structured_data_with_vision',
    'validate_and_enhance_result', 
    'create_error_response',
    'convert_weight_to_kg'
]