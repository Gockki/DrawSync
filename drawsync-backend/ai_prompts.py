# backend/ai_prompts.py
"""
Industry-specific AI prompts for technical drawing analysis
"""

AI_PROMPTS = {
    "coating": """
Analysoi tämä pinnoituspiirustus ja tee kaksi-vaiheinen analyysi:

VAIHE 1 - OCR TEKSTIN LUKEMINEN:
Lue ja tunnista kaikki teksti piirustuksesta:
- Tuotenimi ja tuotekoodi
- Materiaali (teräs, alumiini, etc.)
- Mitat ja toleranssit
- Pinnanlaatu vaatimukset
- Kappalemäärät
- Huomautukset ja spesifikaatiot

VAIHE 2 - VISUAALINEN ANALYYSI:
Analysoi piirustuksen rakenne ja yhdistä OCR-tietoihin:
- Laske kokonaispinta-ala neliömetreinä (m²)
- Tunnista pinnoitettavat pinnat
- Arvioi kappaleiden määrä
- Tunnista mahdolliset esikäsittelytarpeet

LOPPUTULOS JSON-muodossa:
{
  "success": true,
  "industry_type": "coating",
  "perustiedot": {
    "tuotenimi": "",
    "tuotekoodi": "",
    "materiaali": "",
    "paino_kg": 0
  },
  "pinta_ala_analyysi": {
    "pinta_ala_cm2": 0,
    "laskelma": "",
    "varmuus": "korkea/keskinkertainen/matala"
  },
  "mitat": {
    "pituus": 0,
    "leveys": 0,
    "korkeus": 0
  },
  "huomiot": []
}
""",

    "steel": """
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

LOPPUTULOS JSON-muodossa:
{
  "success": true,
  "industry_type": "steel",
  "perustiedot": {
    "projektin_nimi": "",
    "kohde": "",
    "piirustus_numero": "",
    "suunnittelija": ""
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
  "huomiot": []
}
""",

    "machining": """
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

LOPPUTULOS JSON-muodossa:
{
  "success": true,
  "industry_type": "machining",
  "perustiedot": {
    "osa_numero": "",
    "osa_nimi": "",
    "materiaali": "",
    "sarjakoko": 0,
    "massa_kg": 0,
    "tilavuus_cm3": 0
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
    "valmistusaika_h": 0,
    "kompleksisuus": "matala/keskinkertainen/korkea",
    "kriittisten_toleranssien_lkm": 0,
    "operaatioiden_lkm": 0
  },
  "huomiot": []
}
"""
}

def get_prompt_for_industry(industry_type: str) -> str:
    """
    Get AI prompt for specific industry type
    
    Args:
        industry_type: 'coating', 'steel', or 'machining'
        
    Returns:
        Corresponding AI prompt string
    """
    return AI_PROMPTS.get(industry_type, AI_PROMPTS["coating"])

def get_supported_industries() -> list:
    """
    Get list of supported industry types
    
    Returns:
        List of supported industry type strings
    """
    return list(AI_PROMPTS.keys())

def validate_industry_type(industry_type: str) -> bool:
    """
    Validate if industry type is supported
    
    Args:
        industry_type: Industry type to validate
        
    Returns:
        True if supported, False otherwise
    """
    return industry_type in AI_PROMPTS