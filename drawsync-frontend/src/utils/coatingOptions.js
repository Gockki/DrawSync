// src/utils/coatingOptions.js

export const COATING_OPTIONS = {
  anodizing: {
    name: "Anodisaatio",
    description: "Sähkökemiallinen pinnoite alumiinille. Syöpymisenoesti ja koristeellinen pinta.",
    maxSize: "2000×1200×300mm",
    basePrice: 12.50, // €/m²
    variants: [
      {
        id: "clear_10",
        name: "Kirkas anodisaatio",
        thickness: "10-15 μm",
        priceMultiplier: 1.0
      },
      {
        id: "clear_20", 
        name: "Paksu kirkas anodisaatio",
        thickness: "20-25 μm",
        priceMultiplier: 1.3
      },
      {
        id: "black_15",
        name: "Musta anodisaatio", 
        thickness: "15 μm",
        priceMultiplier: 1.2
      },
      {
        id: "colored_15",
        name: "Värilinen anodisaatio",
        thickness: "15 μm", 
        priceMultiplier: 1.4
      }
    ]
  },
  
  galvanizing: {
    name: "Sinkitys",
    description: "Kuumasinkitys tai sähkösinkitys. Erinomainen korroosiosuoja teräkselle.",
    maxSize: "6000×2000×1500mm",
    basePrice: 8.75, // €/m²
    variants: [
      {
        id: "hot_dip",
        name: "Kuumasinkitys",
        thickness: "55-85 μm",
        priceMultiplier: 1.0
      },
      {
        id: "electro_zinc",
        name: "Sähkösinkitys",
        thickness: "8-25 μm", 
        priceMultiplier: 0.7
      },
      {
        id: "zinc_nickel",
        name: "Sinkki-nikkeli",
        thickness: "8-15 μm",
        priceMultiplier: 1.8
      }
    ]
  },

  powder_coating: {
    name: "Pulverimaalaus",
    description: "Sähköstaattinen pulverimaalaus. Kestävä ja ympäristöystävällinen.",
    maxSize: "3000×1500×800mm", 
    basePrice: 15.00, // €/m²
    variants: [
      {
        id: "standard_ral",
        name: "Vakio RAL-väri",
        thickness: "60-80 μm",
        priceMultiplier: 1.0
      },
      {
        id: "metallic",
        name: "Metallimaali",
        thickness: "60-80 μm",
        priceMultiplier: 1.3
      },
      {
        id: "texture",
        name: "Rakennemaali",
        thickness: "80-120 μm", 
        priceMultiplier: 1.5
      },
      {
        id: "special_color",
        name: "Erikoisväri",
        thickness: "60-80 μm",
        priceMultiplier: 1.8
      }
    ]
  },

  nickel_plating: {
    name: "Nikkelöinti",
    description: "Korroosiosuoja ja kulutuskestävyys. Sähkönikkelöinti tai kemiallinen nikkelöinti.",
    maxSize: "1500×800×600mm",
    basePrice: 25.00, // €/m²
    variants: [
      {
        id: "electro_nickel",
        name: "Sähkönikkelöinti", 
        thickness: "10-25 μm",
        priceMultiplier: 1.0
      },
      {
        id: "electroless_nickel",
        name: "Kemiallinen nikkelöinti",
        thickness: "15-30 μm",
        priceMultiplier: 1.4
      },
      {
        id: "hard_nickel",
        name: "Kovateräsnikkelöinti",
        thickness: "20-50 μm", 
        priceMultiplier: 1.8
      }
    ]
  },

  chrome_plating: {
    name: "Kromaus",
    description: "Kova ja kiiltävä pinta. Erinomainen kulutuskestävyys.",
    maxSize: "2000×1000×500mm",
    basePrice: 35.00, // €/m²
    variants: [
      {
        id: "decorative_chrome",
        name: "Koristeellinen kromaus",
        thickness: "0.3-0.8 μm",
        priceMultiplier: 1.0
      },
      {
        id: "hard_chrome", 
        name: "Kovakromaus",
        thickness: "25-250 μm",
        priceMultiplier: 2.5
      },
      {
        id: "industrial_chrome",
        name: "Teollisuuskromaus", 
        thickness: "5-50 μm",
        priceMultiplier: 1.8
      }
    ]
  },

  phosphating: {
    name: "Fosfatointi",
    description: "Esikäsittely maalausta varten tai korroosiosuoja.",
    maxSize: "4000×2000×1000mm",
    basePrice: 6.50, // €/m²
    variants: [
      {
        id: "zinc_phosphate",
        name: "Sinkki-fosfatointi",
        thickness: "5-15 μm", 
        priceMultiplier: 1.0
      },
      {
        id: "manganese_phosphate",
        name: "Mangaani-fosfatointi",
        thickness: "15-25 μm",
        priceMultiplier: 1.2
      }
    ]
  }
};

// Sarjakoko-alennukset
export const getBatchDiscount = (batchSize) => {
  const discounts = {
    "1-10": 0,        // 0% alennus
    "11-50": 0.05,    // 5% alennus  
    "51-200": 0.10,   // 10% alennus
    "201-1000": 0.15, // 15% alennus
    "1000+": 0.20     // 20% alennus
  };
  return discounts[batchSize] || 0;
};

// Kiireellisyyskertoimet
export const getUrgencyMultiplier = (urgency) => {
  const multipliers = {
    "normaali": 1.0,      // Ei lisämaksua
    "kiireellinen": 1.2,  // +20%
    "express": 1.5        // +50%
  };
  return multipliers[urgency] || 1.0;
};

// Esikäsittelyn hinnat
export const calculatePretreatmentCost = (pretreatments, surfaceAreaM2) => {
  const costs = {
    rasvanpoisto: 3.00,    // €/m²
    peittaus: 5.00,        // €/m²  
    hiekkapuhallus: 8.00   // €/m²
  };
  
  let totalCost = 0;
  pretreatments.forEach(treatment => {
    if (costs[treatment]) {
      totalCost += costs[treatment] * surfaceAreaM2;
    }
  });
  
  return totalCost;
};

// Lisäkustannukset
export const ADDITIONAL_COSTS = {
  setupCost: 50.00,           // €, asetuskustannus per työ
  minimumOrderValue: 25.00,   // €, pienin tilausarvo
  packagingCost: 2.50,        // €/lähetys, pakkauskulut
  vatRate: 0.24              // 24% ALV
};

// Toimitusajat (päivinä)
export const getDeliveryTime = (coatingType, urgency, batchSize) => {
  const baseTimes = {
    anodizing: { min: 5, max: 10 },
    galvanizing: { min: 7, max: 14 },
    powder_coating: { min: 3, max: 7 },
    nickel_plating: { min: 5, max: 12 },
    chrome_plating: { min: 7, max: 15 },
    phosphating: { min: 2, max: 5 }
  };
  
  const urgencyFactors = {
    normaali: 1.0,
    kiireellinen: 0.6,  // 40% nopeampi
    express: 0.3        // 70% nopeampi  
  };
  
  const batchFactors = {
    "1-10": 1.0,
    "11-50": 1.2,
    "51-200": 1.5, 
    "201-1000": 2.0,
    "1000+": 3.0
  };
  
  const base = baseTimes[coatingType] || baseTimes.powder_coating;
  const urgencyFactor = urgencyFactors[urgency] || 1.0;
  const batchFactor = batchFactors[batchSize] || 1.0;
  
  const minDays = Math.max(1, Math.round(base.min * urgencyFactor * batchFactor));
  const maxDays = Math.max(minDays + 1, Math.round(base.max * urgencyFactor * batchFactor));
  
  return { min: minDays, max: maxDays };
};

// Laadun arviointi 
export const getQualityGrade = (coating, variant, surfacePreparation) => {
  const qualityFactors = {
    anodizing: { base: 9, variance: 1 },
    galvanizing: { base: 8, variance: 1 }, 
    powder_coating: { base: 9, variance: 2 },
    nickel_plating: { base: 9, variance: 1 },
    chrome_plating: { base: 10, variance: 0 },
    phosphating: { base: 7, variance: 1 }
  };
  
  const preparationBonus = {
    rasvanpoisto: 0.5,
    peittaus: 1.0, 
    hiekkapuhallus: 1.5
  };
  
  const factor = qualityFactors[coating] || qualityFactors.powder_coating;
  let quality = factor.base;
  
  // Lisää esikäsittelyn vaikutus
  surfacePreparation.forEach(prep => {
    quality += preparationBonus[prep] || 0;
  });
  
  return Math.min(10, Math.max(1, quality));
};

export default {
  COATING_OPTIONS,
  getBatchDiscount,
  getUrgencyMultiplier, 
  calculatePretreatmentCost,
  ADDITIONAL_COSTS,
  getDeliveryTime,
  getQualityGrade
};