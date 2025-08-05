import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Luo OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Pelkkä OCR-tekstin analyysi (ei kuvaa)
def extract_structured_data(ocr_text: str) -> dict:
    """Analysoi pelkkä OCR-teksti ilman kuvaa"""
    
    prompt = f"""
    Toimi kokenut pinnoitusalan insinööri. Analysoi teknisen piirustuksen OCR-teksti.
    
    OCR-TEKSTI:
    {ocr_text}
    
    Poimi KAIKKI löytämäsi tiedot ja YRITÄ AINA laskea/päätellä mitä voit.
    
    Palauta JSON täsmälleen tässä muodossa:
    {{
        "found_data": {{
            "comment": "Suoraan tekstistä löydetyt arvot",
            "tuotekoodi": "<piirustuksen numero/koodi>",
            "tuotenimi_fi": "<suomenkielinen nimi jos löytyy>",
            "tuotenimi_en": "<englanninkielinen nimi jos löytyy>",
            "revisio": "<revisio>",
            "päiväys": "<päiväys>",
            "piirtäjä": "<piirtäjä>",
            "loppuasiakas": "<asiakkaan nimi jos löytyy>",
            "materiaali": "<materiaali>",
            "paino": "<paino yksikköineen>",
            "pintakarkeus": "<Ra-arvo>",
            "toleranssit": "<yleiset toleranssit>",
            "pinnoite": "<pinnoite jos mainittu>",
            "eräkoko": "<jos käsin kirjoitettu>",
            "vuosivolyymi": "<jos mainittu>"
        }},
        "detected_standards": {{
            "comment": "Tunnistetut standardit ja niiden merkitys",
            "standards": ["<lista standardeista>"],
            "coating_standard": "<pinnoitestandardi jos löytyy>",
            "interpreted": "<mitä standardi tarkoittaa>"
        }},
        "dimensions": {{
            "comment": "Löydetyt mitat",
            "ulkomitat": "<L x W x H>",
            "reiät": ["<reikien tiedot>"],
            "kierteet": ["<kierteet>"],
            "muut_mitat": ["<muut mitat>"]
        }},
        "estimated_data": {{
            "comment": "Arviot - EI laskentaa pelkästä tekstistä",
            "geometrialuokka": "Ei voida määrittää ilman kuvaa",
            "pinta_ala": "Ei voida laskea pelkästä tekstistä"
        }},
        "missing_data": {{
            "comment": "Puuttuvat tiedot",
            "lista": ["<mitä ei löytynyt>"]
        }},
        "processing_info": {{
            "method": "ocr_only",
            "model": "gpt-4o",
            "ocr_text_length": {len(ocr_text)}
        }}
    }}
    
    TÄRKEÄÄ:
    - Jos tieto puuttuu, merkitse "Ei määritelty"
    - ÄLÄ keksi arvoja
    - Tunnista pinnoitestandardit: ISO 2081 (sinkitys), ISO 7599 (anodisointi), EN 12329 (fosfatointi)
    - Jos löydät painon LB-yksikössä, muunna myös kilogrammoiksi
    - Etsi käsin kirjoitettuja arvoja (eräkoko, vuosivolyymi)
    
    Palauta VAIN JSON.
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=1500
        )
        
        raw = response.choices[0].message.content
        cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        result = json.loads(cleaned)
        
        return validate_and_enhance_result(result, has_image=False)
        
    except Exception as e:
        return {
            "error": f"OCR-analyysi epäonnistui: {str(e)}",
            "processing_info": {"method": "ocr_only_failed"}
        }

# OCR + Kuva yhdistelmä
def extract_structured_data_with_vision(ocr_text: str, image_bytes: bytes) -> dict:
    """Analysoi SEKÄ OCR-teksti ETTÄ kuva - paras tulos"""
    
    import base64
    base64_image = base64.b64encode(image_bytes).decode('utf-8')
    
    prompt = f"""
    Analysoi tekninen piirustus pinnoitusta varten. Käytä OCR-tekstiä numeroille ja teksteille, kuvaa muodoille ja geometrialle.
    
    OCR-TEKSTI:
    {ocr_text}
    
    POIMI NÄMÄ TIEDOT:
    1. Tuotekoodi/piirrustusnumero
    2. Tuotenimi (suomeksi jos löytyy, muuten englanniksi)
    3. Loppuasiakas (yrityksen nimi jos näkyy piirustuksessa)
    4. Materiaali (esim. 6061-T6 Aluminum, S355, RST37)
    5. Paino (muunna kilogrammoiksi jos muussa yksikössä)
    6. Pinnoite (tunnista standardit: ISO 2081=sinkitys, ISO 7599=anodisointi, EN 12329=fosfatointi)
    7. Pintakarheus (Ra-arvo mikrometreinä)
    8. Geometrialuokka: yksinkertainen/keskivaikea/monimutkainen
    9. Pinta-ala: YRITÄ AINA laskea cm². Jos et voi, kerro tarkasti MIKSI
    10. Eräkoko ja vuosivolyymi (jos käsin kirjoitettu tai merkitty)
    11. Ulkomitat (pituus × leveys × korkeus millimetreinä)
    12. Reiät (määrä ja halkaisijat)
    
    PALAUTA JSON:
    {{
        "perustiedot": {{
            "tuotekoodi": "<arvo tai 'Ei määritelty'>",
            "tuotenimi": "<arvo tai 'Ei määritelty'>",
            "loppuasiakas": "<arvo tai 'Ei tunnistettu'>",
            "materiaali": "<arvo tai 'Ei määritelty'>",
            "paino": "<arvo alkuperäisessä muodossa>",
            "paino_kg": <numero tai null>,
            "pinnoite": "<arvo tai 'Ei määritelty'>",
            "pinnoite_paksuus_um": <numero tai null>,
            "pintakarheus_ra": "<arvo tai 'Ei määritelty'>",
            "eräkoko": "<arvo tai 'Ei määritelty'>",
            "vuosivolyymi": "<arvo tai 'Ei määritelty'>"
        }},
        "mitat": {{
            "ulkomitat_mm": {{
                "pituus": <numero tai null>,
                "leveys": <numero tai null>,
                "korkeus": <numero tai null>
            }},
            "reiät": [
                {{"halkaisija_mm": <numero>, "määrä": <numero>}}
            ],
            "muut_mitat": ["<lista muista mitoista>"]
        }},
        "pinta_ala_analyysi": {{
            "pinta_ala_cm2": <numero TAI null>,
            "laskelma": "<miten laskettiin TAI miksi ei voitu laskea>",
            "varmuus": "<korkea/keskitaso/matala>",
            "puuttuvat_tiedot": ["<mitä tietoja tarvittaisiin tarkempaan laskentaan>"]
        }},
        "geometria_arvio": {{
            "luokka": "<yksinkertainen/keskivaikea/monimutkainen>",
            "perustelu": "<max 1 lause miksi>",
            "kappaleen_tyyppi": "<levy/putki/ontto/umpinainen/kokoonpano>"
        }},
        "standardit": ["<lista kaikista tunnistetuista standardeista>"],
        "huomiot": ["<max 3 tärkeintä huomiota käyttäjälle>"],
        "processing_info": {{
            "method": "ocr_plus_vision",
            "model": "gpt-4o"
        }}
    }}
    
    TÄRKEÄÄ:
    - Pinta-ala: YRITÄ AINA laskea cm². Jos löydät 3 ulkomittaa (pituusxleveysxkorkeus), laske laatikkomallilla: 2x(PxL+PxK+LxK). Jos et voi laskea, kerro MIKSI (esim. 'puuttuu korkeus')
    - Käytä OCR:n numeroarvoja sellaisenaan (0.75 LB = 0.75 LB, ei 0.075)
    - Jos pinnoite on standardi (esim. ISO 2081 Fe/Zn12), tulkitse se (Sinkitys 12µm)
    - Älä keksi arvoja - käytä "Ei määritelty" tai null
    
    Palauta VAIN JSON.
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",  # Korjattu malli - gpt-4o sisältää vision-kyvyt
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url", 
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                        }
                    ]
                }
            ],
            max_tokens=2000,
            temperature=0.1
        )
        
        raw = response.choices[0].message.content
        cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        result = json.loads(cleaned)
        
        return validate_and_enhance_result(result, has_image=True)
        
    except Exception as e:
        # Fallback pelkkään OCR:ään jos vision epäonnistuu
        print(f"Vision-analyysi epäonnistui, käytetään pelkkää OCR:ää: {e}")
        fallback_result = extract_structured_data(ocr_text)
        fallback_result["processing_info"]["vision_error"] = str(e)
        fallback_result["processing_info"]["fallback_used"] = True
        return fallback_result

def validate_and_enhance_result(result: dict, has_image: bool = False) -> dict:
    """Varmista että kaikki kentät ovat olemassa ja lisää oletusarvot"""
    
    # Varmista päärakenne
    if has_image:
        # Vision-version rakenne
        required_sections = [
            "perustiedot", "mitat", "pinta_ala_analyysi", 
            "geometria_arvio", "standardit", "huomiot", "processing_info"
        ]
    else:
        # Pelkän OCR:n rakenne
        required_sections = [
            "found_data", "detected_standards", "dimensions",
            "estimated_data", "missing_data", "processing_info"
        ]
    
    for section in required_sections:
        if section not in result:
            result[section] = {} if section != "standardit" and section != "huomiot" else []
    
    # Täydennä perustiedot oletusarvoilla (vision-versio)
    if "perustiedot" in result:
        perus_defaults = {
            "tuotekoodi": "Ei määritelty",
            "tuotenimi": "Ei määritelty",
            "loppuasiakas": "Ei tunnistettu",
            "materiaali": "Ei määritelty",
            "paino": "Ei määritelty",
            "paino_kg": None,
            "pinnoite": "Ei määritelty",
            "pinnoite_paksuus_um": None,
            "pintakarheus_ra": "Ei määritelty",
            "eräkoko": "Ei määritelty",
            "vuosivolyymi": "Ei määritelty"
        }
        
        for key, default in perus_defaults.items():
            if key not in result["perustiedot"] or result["perustiedot"][key] in [None, "", "null"]:
                result["perustiedot"][key] = default
        
        # Muunna paino kilogrammoiksi jos mahdollista
        if result["perustiedot"]["paino"] != "Ei määritelty" and result["perustiedot"]["paino_kg"] is None:
            result["perustiedot"]["paino_kg"] = convert_weight_to_kg(result["perustiedot"]["paino"])
    
    # Täydennä found_data oletusarvoilla (OCR-only versio)
    if "found_data" in result:
        found_defaults = {
            "tuotekoodi": "Ei määritelty",
            "tuotenimi_fi": "Ei määritelty",
            "tuotenimi_en": "Ei määritelty",
            "revisio": "Ei määritelty",
            "päiväys": "Ei määritelty",
            "piirtäjä": "Ei määritelty",
            "loppuasiakas": "Ei tunnistettu",
            "materiaali": "Ei määritelty",
            "paino": "Ei määritelty",
            "pintakarkeus": "Ei määritelty",
            "toleranssit": "Ei määritelty",
            "pinnoite": "Ei määritelty",
            "eräkoko": "Ei määritelty",
            "vuosivolyymi": "Ei määritelty"
        }
        
        for key, default in found_defaults.items():
            if key not in result["found_data"] or result["found_data"][key] in [None, "", "null"]:
                result["found_data"][key] = default
        
        # Muunna paino kilogrammoiksi jos mahdollista
        if "paino" in result["found_data"] and result["found_data"]["paino"] != "Ei määritelty":
            result["found_data"]["paino_kg"] = convert_weight_to_kg(result["found_data"]["paino"])
    
    # Varmista pinta-ala_analyysi rakenne (vision)
    if "pinta_ala_analyysi" in result:
        if "pinta_ala_cm2" not in result["pinta_ala_analyysi"]:
            result["pinta_ala_analyysi"]["pinta_ala_cm2"] = None
        if "laskelma" not in result["pinta_ala_analyysi"]:
            result["pinta_ala_analyysi"]["laskelma"] = "Ei voitu laskea"
        if "varmuus" not in result["pinta_ala_analyysi"]:
            result["pinta_ala_analyysi"]["varmuus"] = "matala"
        if "puuttuvat_tiedot" not in result["pinta_ala_analyysi"]:
            result["pinta_ala_analyysi"]["puuttuvat_tiedot"] = []
    
    # Lisää yhteenveto käyttäjälle
    result["summary"] = create_summary(result, has_image)
    
    return result

def convert_weight_to_kg(weight_str: str) -> float:
    """Muunna painoarvo kilogrammoiksi"""
    try:
        weight_str = weight_str.upper()
        if "LB" in weight_str:
            value = float(weight_str.replace("LB", "").strip())
            return round(value * 0.453592, 3)
        elif "KG" in weight_str:
            value = float(weight_str.replace("KG", "").strip())
            return value
        elif "G" in weight_str and "KG" not in weight_str:
            value = float(weight_str.replace("G", "").strip())
            return value / 1000
        else:
            return float(weight_str)
    except:
        return None

def create_summary(result: dict, has_image: bool) -> dict:
    """Luo selkeä yhteenveto käyttäjälle"""
    summary = {
        "status": "success",
        "key_findings": [],
        "warnings": [],
        "next_steps": []
    }
    
    if has_image:
        # Vision-version yhteenveto
        perustiedot = result.get("perustiedot", {})
        
        # Kerää keskeiset löydökset
        if perustiedot.get("tuotekoodi") != "Ei määritelty":
            summary["key_findings"].append(f"Tuotekoodi: {perustiedot['tuotekoodi']}")
        
        if perustiedot.get("materiaali") != "Ei määritelty":
            summary["key_findings"].append(f"Materiaali: {perustiedot['materiaali']}")
        
        if perustiedot.get("paino_kg"):
            summary["key_findings"].append(f"Paino: {perustiedot['paino_kg']} kg")
        
        # Pinta-ala
        pinta_ala = result.get("pinta_ala_analyysi", {})
        if pinta_ala.get("pinta_ala_cm2"):
            summary["key_findings"].append(f"Pinta-ala: {pinta_ala['pinta_ala_cm2']} cm²")
        else:
            summary["warnings"].append(f"Pinta-alaa ei voitu laskea: {pinta_ala.get('laskelma', 'Syy tuntematon')}")
        
        # Pinnoite
        if perustiedot.get("pinnoite") == "Ei määritelty":
            summary["warnings"].append("Pinnoitetta ei määritelty piirustuksessa")
            summary["next_steps"].append("Tarkista pinnoitevaatimus asiakkaalta")
        
        # Puuttuvat tiedot pinta-alalle
        for puuttuva in pinta_ala.get("puuttuvat_tiedot", []):
            summary["next_steps"].append(f"Lisää: {puuttuva}")
            
    else:
        # OCR-only version yhteenveto
        found_data = result.get("found_data", {})
        
        if found_data.get("tuotekoodi") != "Ei määritelty":
            summary["key_findings"].append(f"Tuotekoodi: {found_data['tuotekoodi']}")
        
        if found_data.get("materiaali") != "Ei määritelty":
            summary["key_findings"].append(f"Materiaali: {found_data['materiaali']}")
        
        summary["warnings"].append("Vain OCR-analyysi tehty - kuva-analyysi antaisi tarkempia tuloksia")
    
    # Lisää huomiot
    for huomio in result.get("huomiot", [])[:3]:  # Max 3 huomiota
        if huomio not in summary["warnings"]:
            summary["warnings"].append(huomio)
    
    return summary