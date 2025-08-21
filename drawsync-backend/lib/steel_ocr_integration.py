# drawsync-backend/lib/steel_ocr_integration.py - PARANNETTU VERSIO

import re
import logging
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)

def create_steel_prompt_with_ocr(base_prompt: str, ocr_results: Dict) -> str:
    """
    Luo parannettu steel-prompt käyttäen valmista Google Vision OCR:ää.
    """
    
    if ocr_results.get("status") != "success" or not ocr_results.get("text"):
        logger.warning("No OCR text available, using basic prompt")
        return base_prompt
    
    ocr_text = ocr_results.get("text", "")
    confidence = ocr_results.get("confidence", 0)
    quality = ocr_results.get("quality", "unknown")
    
    # Analysoi OCR-teksti
    steel_analysis = analyze_steel_text_advanced(ocr_text)
    
    # Yritä yhdistää mittoja materiaaleihin
    linked_items = link_measurements_to_profiles(steel_analysis)
    
    # Luo OCR-tiivistelmä
    ocr_summary = f"""
GOOGLE VISION OCR TULOKSET:
- Laatu: {quality} (luottamus: {confidence:.3f})
- Sanat löydetty: {ocr_results.get('words_found', 0)}
- Tekstin pituus: {ocr_results.get('text_length', 0)} merkkiä

AUTOMAATTISESTI TUNNISTETUT TERÄSPROFIILIT:
"""
    
    if steel_analysis["profiles"]:
        for profile in steel_analysis["profiles"]:
            ocr_summary += f"- {profile['name']} (löytyi: '{profile['match']}' riviltä {profile.get('line_number', '?')})\n"
    else:
        ocr_summary += "- Ei selkeitä teräsprofiilimerkintöjä löytynyt\n"
    
    ocr_summary += f"""
AUTOMAATTISESTI TUNNISTETUT MITAT:
"""
    
    if steel_analysis["measurements"]:
        for measurement in steel_analysis["measurements"]:
            ocr_summary += f"- {measurement['value']} mm (tyyppi: {measurement['type']}, rivi {measurement.get('line_number', '?')})\n"
    else:
        ocr_summary += "- Ei selkeitä mittamerkintöjä löytynyt\n"
    
    ocr_summary += f"""
AUTOMAATTISESTI TUNNISTETUT MÄÄRÄT:
"""
    
    if steel_analysis["quantities"]:
        for qty in steel_analysis["quantities"]:
            ocr_summary += f"- {qty['count']} kpl (rivi {qty.get('line_number', '?')})\n"
    else:
        ocr_summary += "- Ei selkeitä KPL-merkintöjä löytynyt\n"
    
    # UUSI: Linkitetyt materiaalit ja mitat
    ocr_summary += f"""
AUTOMAATTINEN MATERIAALIT + MITAT YHDISTELY:
"""
    
    if linked_items:
        for item in linked_items:
            profile_name = item['profile']['name']
            if item['linked_measurements']:
                measurements_str = ", ".join([f"{m['value']}mm" for m in item['linked_measurements']])
                confidence_str = item['confidence_level']
                ocr_summary += f"- {profile_name} → {measurements_str} (varmuus: {confidence_str})\n"
            else:
                ocr_summary += f"- {profile_name} → ei mittoja löytynyt samalta riviltä\n"
    else:
        ocr_summary += "- Ei voitu yhdistää materiaaleja ja mittoja automaattisesti\n"
    
    # Piirustustyypin analyysi
    drawing_type = analyze_drawing_type(ocr_text)
    ocr_summary += f"""
PIIRUSTUSTYYPPI: {drawing_type}

TEKSTIN RIVIT ANALYYSILLE:
"""
    
    # Näytä tekstiä riveittäin analyysia varten
    lines = ocr_text.split('\n')
    for i, line in enumerate(lines[:15]):  # Max 15 riviä
        if line.strip():
            ocr_summary += f"Rivi {i+1}: {line.strip()}\n"
    
    if len(lines) > 15:
        ocr_summary += f"... ja {len(lines)-15} riviä lisää\n"
    
    # GPT-5 ohjeet
    ocr_summary += f"""
OHJEET GPT-5:LLE MATERIAALIEN JA MITTOJEN YHDISTÄMISELLE:

PÄÄLÄHESTYMISTAPA:
1. Analysoi OCR-rivit järjestyksessä - samalla rivillä olevat tiedot kuuluvat usein yhteen
2. Etsi rivejä jossa on sekä materiaali että numero: "IPE200 L=3500"
3. Katso vierekkäisiä rivejä - pituus voi olla seuraavalla rivillä
4. Materiaalilista vs piirustus: listassa yhteydet helpompia, piirustuksessa vaikeampia

TUNNISTUSSÄÄNNÖT:
- Jos samalla rivillä materiaali + numero 1000-15000 → yhdistä (varmuus: korkea)
- Jos vierekkäisillä riveillä materiaali ja L=xxxx → yhdistä (varmuus: keskitaso)  
- Jos materiaali ja numero 2-3 rivin päässä → harkitse (varmuus: matala)
- Jos piirustustyyppi on "material_list" → luota riviyhteyksiin enemmän

ESIMERKKEJÄ YHDISTÄMISESTÄ:
✓ "IPE240 L=4500" → IPE240 pituus 4500mm (korkea varmuus)
✓ "HEA200\nL=3000" → HEA200 pituus 3000mm (keskitaso varmuus)  
✓ "SHS100x8\n2 KPL\n6000" → SHS100x8 pituus 6000mm, 2kpl (keskitaso)
✗ "IPE200" ... 5 riviä ... "4500" → älä yhdistä (liian kaukana)

VARMUUSTASOT:
- "korkea": sama rivi tai välitön yhteys (L=xxxx)
- "keskitaso": vierekkäiset rivit tai looginen yhteys
- "matala": epävarma yhteys, mainitse mutta merkitse epävarmaksi

TÄRKEÄ: Jos et ole varma yhteydestä, älä yhdistä. Puuttuva tieto on parempi kuin väärä tieto.
"""
    
    # Yhdistä alkuperäiseen promptiin
    enhanced_prompt = ocr_summary + "\n\n" + base_prompt
    
    logger.info(f"OCR analysis: {len(steel_analysis['profiles'])} profiles, {len(steel_analysis['measurements'])} measurements, {len(linked_items)} linked items")
    
    return enhanced_prompt

def analyze_steel_text_advanced(text: str) -> Dict:
    """Analysoi OCR-tekstiä parannettuna versiona joka tallentaa rivitiedot."""
    
    result = {
        "profiles": [],
        "measurements": [],
        "quantities": []
    }
    
    if not text:
        return result
    
    lines = text.split('\n')
    text_upper = text.upper()
    
    # Analysoi rivi kerrallaan
    for line_number, line in enumerate(lines, 1):
        line_upper = line.upper().strip()
        if not line_upper:
            continue
            
        # Teräsprofiilien tunnistus
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
            matches = re.finditer(pattern, line_upper)
            for match in matches:
                groups = match.groups()
                
                if profile_type in ["SHS", "RHS"] and len(groups) >= 2:
                    if profile_type == "SHS":
                        name = f"SHS{groups[0]}×{groups[1]}"
                    else:
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
                    "line_number": line_number,
                    "line_text": line.strip()
                })
        
        # Mittojen tunnistus (samalla rivillä kuin profiilit)
        # L= merkinnät
        l_measurements = re.finditer(r'\bL\s*=\s*(\d{3,5})\b', line_upper)
        for match in l_measurements:
            result["measurements"].append({
                "value": int(match.group(1)),
                "type": "L_equals",
                "match": match.group(0),
                "line_number": line_number,
                "line_text": line.strip()
            })
        
        # Mahdolliset pituudet (4-5 numeroa)
        potential_lengths = re.finditer(r'\b(\d{4,5})\b', line)
        for match in potential_lengths:
            value = int(match.group(1))
            if 1000 <= value <= 15000:
                result["measurements"].append({
                    "value": value,
                    "type": "potential_length",
                    "match": match.group(0),
                    "line_number": line_number,
                    "line_text": line.strip()
                })
        
        # Määrien tunnistus
        kpl_matches = re.finditer(r'(\d{1,2})\s*KPL\b', line_upper)
        for match in kpl_matches:
            result["quantities"].append({
                "count": int(match.group(1)),
                "type": "KPL",
                "match": match.group(0),
                "line_number": line_number,
                "line_text": line.strip()
            })
    
    return result

def link_measurements_to_profiles(steel_analysis: Dict) -> List[Dict]:
    """Yhdistä mittoja profiileihin rivisijainnin perusteella."""
    
    linked_items = []
    profiles = steel_analysis["profiles"]
    measurements = steel_analysis["measurements"]
    
    for profile in profiles:
        profile_line = profile["line_number"]
        linked_measurements = []
        confidence_level = "matala"
        
        # Etsi mittoja samalta riviltä
        same_line_measurements = [m for m in measurements if m["line_number"] == profile_line]
        if same_line_measurements:
            linked_measurements.extend(same_line_measurements)
            confidence_level = "korkea"
        
        # Jos ei samalta riviltä, etsi vierekkäisiltä riveiltä
        if not linked_measurements:
            nearby_measurements = [
                m for m in measurements 
                if abs(m["line_number"] - profile_line) <= 2  # Max 2 riviä ero
            ]
            if nearby_measurements:
                # Ota lähin mittaus
                closest = min(nearby_measurements, key=lambda m: abs(m["line_number"] - profile_line))
                linked_measurements.append(closest)
                
                if abs(closest["line_number"] - profile_line) == 1:
                    confidence_level = "keskitaso"
                else:
                    confidence_level = "matala"
        
        linked_items.append({
            "profile": profile,
            "linked_measurements": linked_measurements,
            "confidence_level": confidence_level
        })
    
    return linked_items

def analyze_drawing_type(ocr_text: str) -> str:
    """Tunnista piirustustyyppi OCR-tekstistä."""
    text_upper = ocr_text.upper()
    
    if "MATERIAALILISTA" in text_upper or "MATERIAL LIST" in text_upper:
        return "material_list"
    elif "LEIKKAUS" in text_upper or "SECTION" in text_upper:
        return "section_view"
    elif "ASENNUSKUVA" in text_upper or "ASSEMBLY" in text_upper:
        return "assembly_drawing"
    elif "DETAIL" in text_upper or "YKSITYISKOHTA" in text_upper:
        return "detail_drawing"
    else:
        return "technical_drawing"