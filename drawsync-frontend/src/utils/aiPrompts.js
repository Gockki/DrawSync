// src/utils/aiPrompts.js
export const AI_PROMPTS = {
  coating: `
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
}`,

  steel: `
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
  "perustiedot": {
    "projektin_nimi": "",
    "kohde": "",
    "piirustus_numero": ""
  },
  "materiaalilista": [
    {
      "profiili": "IPE300",
      "pituus_mm": 8740,
      "kappalemaara": 4,
      "kokonaispituus_m": 34.96,
      "paino_per_metri": 42.2,
      "kokonaispaino_kg": 1475
    }
  ],
  "yhteenveto": {
    "kokonaispaino_kg": 0,
    "profiilityypit_lkm": 0,
    "kokonaiskappaleet": 0
  },
  "huomiot": []
}`,

  machining: `
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
  "perustiedot": {
    "osa_numero": "",
    "materiaali": "",
    "sarjakoko": 0,
    "massa_kg": 0
  },
  "toleranssit": [
    {
      "mitta": "Ø50",
      "toleranssi": "h7",
      "kriittisyys": "korkea"
    }
  ],
  "koneistusoperaatiot": [
    {
      "operaatio": "sorvi",
      "aika_min": 15,
      "kompleksisuus": "keskinkertainen"
    }
  ],
  "yhteenveto": {
    "valmistusaika_h": 0,
    "kompleksisuus": "matala/keskinkertainen/korkea",
    "kriittisten_toleranssien_lkm": 0
  },
  "huomiot": []
}`
}

// Industry configuration for UI
export const INDUSTRY_CONFIGS = {
  coating: {
    name: 'Pinnoitusanalyysi',
    icon: '🎨',
    primaryColor: 'green',
    tabs: [
      { id: 'perustiedot', name: 'Perustiedot', enabled: true },
      { id: 'mitat', name: 'Mitat', enabled: true },
      { id: 'pinta-ala', name: 'Pinta-ala', enabled: true },
      { id: 'palvelu', name: 'Palvelu', enabled: true },
      { id: 'hinnoittelu', name: 'Hinnoittelu', enabled: true }
    ],
    features: ['pricing', 'surface_area', 'treatments', 'quote_generation']
  },
  
  steel: {
    name: 'Teräsrakenne-analyysi',
    icon: '🏗️',
    primaryColor: 'blue',
    tabs: [
      { id: 'perustiedot', name: 'Perustiedot', enabled: true },
      { id: 'materiaalilista', name: 'Materiaalilista', enabled: true },
      { id: 'ostolista', name: 'Ostolista', enabled: true }
    ],
    features: ['material_list', 'purchase_calculation', 'weight_calculation', 'export']
  },
  
  machining: {
    name: 'Koneistusanalyysi',
    icon: '⚙️',
    primaryColor: 'purple',
    tabs: [
      { id: 'perustiedot', name: 'Perustiedot', enabled: true },
      { id: 'toleranssit', name: 'Toleranssit', enabled: true },
      { id: 'operaatiot', name: 'Operaatiot', enabled: true }
    ],
    features: ['tolerances', 'operations', 'time_estimation', 'complexity_analysis']
  }
}

// Helper function to get prompt for industry
export const getPromptForIndustry = (industryType) => {
  return AI_PROMPTS[industryType] || AI_PROMPTS.coating
}

// Helper function to get industry config
export const getIndustryConfig = (industryType) => {
  return INDUSTRY_CONFIGS[industryType] || INDUSTRY_CONFIGS.coating
}