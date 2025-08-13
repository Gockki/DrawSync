# drawsync-backend/lib/steel_ocr_integration.py
# Integraatio olemassa olevan Google Vision OCR:n kanssa

import re
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

def create_steel_prompt_with_ocr(base_prompt: str, ocr_results: Dict) -> str:
    """
    Luo parannettu steel-prompt käyttäen valmista Google Vision OCR:ää.
    
    Args:
        base_prompt: Alkuperäinen steel-prompt
        ocr_results: Google Vision OCR tulokset extract_text_from_image_bytes:istä
        
    Returns:
        Enhanced prompt jossa OCR-tulokset
    """
    
    if ocr_results.get("status") != "success" or not ocr_results.get("text"):
        # Jos OCR epäonnistui, käytä alkuperäistä promptia
        logger.warning("⚠️  No OCR text available, using basic prompt")
        return base_prompt
    
    ocr_text = ocr_results.get("text", "")
    confidence = ocr_results.get("confidence", 0)
    quality = ocr_results.get("quality", "unknown")
    
    # ✅ Analysoi OCR-teksti teräsprofiileille
    steel_analysis = analyze_steel_text(ocr_text)
    
    # ✅ Luo OCR-tiivistelmä
    ocr_summary = f"""
GOOGLE VISION OCR TULOKSET:
- Laatu: {quality} (luottamus: {confidence:.3f})
- Sanat löydetty: {ocr_results.get('words_found', 0)}
- Tekstin pituus: {ocr_results.get('text_length', 0)} merkkiä

AUTOMAATTISESTI TUNNISTETUT TERÄSPROFIILIT OCR-TEKSTISTÄ:
"""
    
    if steel_analysis["profiles"]:
        for profile in steel_analysis["profiles"]:
            ocr_summary += f"- {profile['name']} (tyyppi: {profile['type']}, löytyi: '{profile['match']}')\n"
    else:
        ocr_summary += "- Ei selkeitä teräsprofiilimerkintöjä löytynyt automaattisesti\n"
    
    ocr_summary += f"""
AUTOMAATTISESTI TUNNISTETUT MITAT:
"""
    
    if steel_analysis["measurements"]:
        for measurement in steel_analysis["measurements"]:
            ocr_summary += f"- {measurement['value']} mm (tyyppi: {measurement['type']}, löytyi: '{measurement['match']}')\n"
    else:
        ocr_summary += "- Ei selkeitä L= tai mittamerkintöjä löytynyt automaattisesti\n"
    
    ocr_summary += f"""
AUTOMAATTISESTI TUNNISTETUT MÄÄRÄT:
"""
    
    if steel_analysis["quantities"]:
        for qty in steel_analysis["quantities"]:
            ocr_summary += f"- {qty['count']} kpl (löytyi: '{qty['match']}')\n"
    else:
        ocr_summary += "- Ei selkeitä KPL tai × merkintöjä löytynyt automaattisesti\n"
    
    # Näytä osa OCR-tekstistä
    text_preview = ocr_text[:800] + "..." if len(ocr_text) > 800 else ocr_text
    
    ocr_summary += f"""
OCR-TEKSTIN ESIKATSELU:
{text_preview}

OHJEET GPT-5:LLE:
- Käytä yllä olevia automaattisia tunnistuksia lähtökohtana
- Tarkista OCR-tulokset myös itse kuvasta vision-analyysillä
- Jos näet kuvasta profiileja joita OCR ei löytänyt, lisää ne mukaan
- Jos OCR löysi jotain mitä et näe kuvasta, ole kriittinen
- Yhdistä OCR:n tarkkuus pienille teksteille + oma geometrinen analyysisi
- Merkitse "tunnistustapa" kenttään: "Google OCR", "Vision", tai "OCR + Vision"
- Jos OCR-laatu on "poor", luota enemmän omaan vision-analyysiisi
"""
    
    # Yhdistä OCR-tiivistelmä alkuperäiseen promptiin
    enhanced_prompt = ocr_summary + "\n\n" + base_prompt
    
    logger.info(f"📊 OCR analysis: {len(steel_analysis['profiles'])} profiles, {len(steel_analysis['measurements'])} measurements, {len(steel_analysis['quantities'])} quantities")
    
    return enhanced_prompt

def analyze_steel_text(text: str) -> Dict:
    """
    Analysoi OCR-tekstiä teräsprofiilien, mittojen ja määrien suhteen.
    
    Args:
        text: OCR:n palauttama teksti
        
    Returns:
        Dictionary analyysituloksista
    """
    
    result = {
        "profiles": [],
        "measurements": [],
        "quantities": []
    }
    
    if not text:
        return result
    
    text_upper = text.upper()
    
    # ✅ Teräsprofiilien tunnistus regexeillä
    profile_patterns = {
        "IPE": r'\bIPE\s*(\d{2,3})\b',
        "HEA": r'\bHEA\s*(\d{2,3})\b',
        "HEB": r'\bHEB\s*(\d{2,3})\b', 
        "UPE": r'\bUP[EN]\s*(\d{2,3})\b',
        "SHS": r'\bSHS\s*(\d{2,3})\s*[×xX]\s*(\d{1,2})\b',
        "RHS": r'\bRHS\s*(\d{2,3})\s*[×xX]\s*(\d{2,3})\s*[×xX]\s*(\d{1,2})\b',
        "L": r'\bL\s*(\d{2,3})\s*[×xX]\s*(\d{2,3})\b',
        "LATTA": r'\bLATTA\s*(\d{2,3})\s*[×xX]\s*(\d{1,2})\b'
    }
    
    for profile_type, pattern in profile_patterns.items():
        matches = re.finditer(pattern, text_upper)
        for match in matches:
            groups = match.groups()
            
            if profile_type in ["SHS", "RHS"] and len(groups) >= 2:
                if profile_type == "SHS":
                    name = f"SHS{groups[0]}×{groups[1]}"
                else:  # RHS
                    name = f"RHS{groups[0]}×{groups[1]}×{groups[2] if len(groups) > 2 else '?'}"
            elif profile_type in ["L", "LATTA"] and len(groups) >= 2:
                name = f"{profile_type}{groups[0]}×{groups[1]}"
            else:
                name = f"{profile_type}{groups[0]}"
            
            result["profiles"].append({
                "name": name,
                "type": profile_type,
                "size": groups[0],
                "match": match.group(0),
                "position": match.span()
            })
    
    # ✅ Mittojen tunnistus
    # L= merkinnät
    l_measurements = re.finditer(r'\bL\s*=\s*(\d{3,5})\b', text_upper)
    for match in l_measurements:
        result["measurements"].append({
            "value": int(match.group(1)),
            "type": "L_equals",
            "match": match.group(0),
            "position": match.span()
        })
    
    # Mahdolliset pituudet (4-5 numeroista koostuvat)
    potential_lengths = re.finditer(r'\b(\d{4,5})\b', text)
    for match in potential_lengths:
        value = int(match.group(1))
        if 1000 <= value <= 15000:  # Järkevät pituudet mm
            result["measurements"].append({
                "value": value,
                "type": "potential_length",
                "match": match.group(0),
                "position": match.span()
            })
    
    # ✅ Määrien tunnistus
    # KPL merkinnät
    kpl_matches = re.finditer(r'(\d{1,2})\s*KPL\b', text_upper)
    for match in kpl_matches:
        result["quantities"].append({
            "count": int(match.group(1)),
            "type": "KPL",
            "match": match.group(0),
            "position": match.span()
        })
    
    # × merkinnät
    multiply_matches = re.finditer(r'(\d{1,2})\s*[×xX]\b', text)
    for match in multiply_matches:
        result["quantities"].append({
            "count": int(match.group(1)),
            "type": "multiply",
            "match": match.group(0),
            "position": match.span()
        })
    
    return result