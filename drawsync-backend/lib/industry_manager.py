# drawsync-backend/lib/industry_manager.py

import json
import os
import logging
from typing import Dict, Optional, List
from pathlib import Path

logger = logging.getLogger(__name__)

class IndustryManager:
    """
    Keskitetty hallinta teollisuusalojen konfiguraatioille.
    Single Source of Truth kaikille industry-spesifisille asetuksille.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Args:
            config_path: Polku config-tiedostoon. Jos None, käyttää oletuspolkua.
        """
        if config_path:
            self.config_path = Path(config_path)
        else:
            # Automaattinen polku: ../config/industry_configs.json
            self.config_path = Path(__file__).parent.parent / "config" / "industry_configs.json"
        
        self._configs = None
        self._load_configs()
    
    def _load_configs(self):
        """Lataa industry configs JSON-tiedostosta"""
        try:
            if not self.config_path.exists():
                raise FileNotFoundError(f"Industry configs not found: {self.config_path}")
            
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self._configs = json.load(f)
            
            logger.info(f"✅ Loaded {len(self._configs)} industry configurations")
            
            # Validoi että konfiguraatiot ovat oikeanlaisia
            self._validate_configs()
            
        except Exception as e:
            logger.error(f"❌ Failed to load industry configs: {e}")
            # Fallback: käytä minimaalista coating-konfiguraatiota
            self._configs = self._get_fallback_config()
    
    def _validate_configs(self):
        """Validoi että konfiguraatiot sisältävät tarvittavat kentät"""
        required_keys = ["id", "name", "prompt", "ui_config"]
        
        for industry_id, config in self._configs.items():
            for key in required_keys:
                if key not in config:
                    raise ValueError(f"Missing required key '{key}' in {industry_id} config")
            
            # Validoi että prompt ei ole tyhjä
            if not config["prompt"] or len(config["prompt"]) < 100:
                raise ValueError(f"Prompt too short for {industry_id}")
            
            # Validoi UI config
            ui_config = config["ui_config"]
            if "tabs" not in ui_config or "features" not in ui_config:
                raise ValueError(f"Invalid ui_config for {industry_id}")
        
        logger.info("✅ All industry configurations validated successfully")
    
    def _get_fallback_config(self) -> Dict:
        """Palauttaa minimaalisen coating-konfiguraation hätätapauksessa"""
        return {
            "coating": {
                "id": "coating",
                "name": "Pinnoitusanalyysi (Fallback)",
                "description": "Perus pinnoitusanalyysi",
                "icon": "🎨",
                "color": "green",
                "prompt": "Analysoi pinnoituspiirustus ja palauta JSON-muodossa perustiedot, mitat ja pinta-ala.",
                "ui_config": {
                    "tabs": [
                        {"id": "perustiedot", "name": "Perustiedot", "required": True}
                    ],
                    "features": {"pricing": True}
                },
                "validation": {"required_fields": []}
            }
        }
    
    def reload_configs(self):
        """Lataa konfiguraatiot uudelleen (hyödyllinen development-aikana)"""
        logger.info("🔄 Reloading industry configurations...")
        self._load_configs()
    
    def get_prompt(self, industry_type: str) -> str:
        """
        Hae GPT-prompt tietylle teollisuudelle
        
        Args:
            industry_type: 'coating', 'steel', 'machining', jne.
            
        Returns:
            Prompt string GPT:lle
        """
        if not self.validate_industry(industry_type):
            logger.warning(f"⚠️  Invalid industry type: {industry_type}, using coating as fallback")
            industry_type = "coating"
        
        prompt = self._configs[industry_type]["prompt"]
        logger.info(f"📝 Retrieved prompt for {industry_type}: {len(prompt)} characters")
        return prompt
    
    def get_ui_config(self, industry_type: str) -> Dict:
        """
        Hae UI-konfiguraatio tietylle teollisuudelle
        
        Args:
            industry_type: Teollisuuden tyyppi
            
        Returns:
            UI config dictionary (tabs, features, jne.)
        """
        if not self.validate_industry(industry_type):
            industry_type = "coating"
        
        return self._configs[industry_type]["ui_config"]
    
    def get_validation_config(self, industry_type: str) -> Dict:
        """Hae validointikonfiguraatio"""
        if not self.validate_industry(industry_type):
            industry_type = "coating"
        
        return self._configs[industry_type].get("validation", {})
    
    def get_industry_info(self, industry_type: str) -> Dict:
        """
        Hae industry:n perustiedot (nimi, kuvaus, ikoni, jne.)
        EI sisällä promptia (turvallisuussyistä frontend:ille)
        """
        if not self.validate_industry(industry_type):
            industry_type = "coating"
        
        config = self._configs[industry_type]
        return {
            "id": config["id"],
            "name": config["name"],
            "description": config.get("description", ""),
            "icon": config.get("icon", "🔧"),
            "color": config.get("color", "gray"),
            "ui_config": config["ui_config"]
            # Huom: prompt EI mukana turvallisuussyistä
        }
    
    def get_all_industries(self) -> Dict:
        """
        Hae kaikki teollisuudenalat frontend API:lle
        
        Returns:
            Dictionary jossa key=industry_id, value=industry_info (ilman promptia)
        """
        result = {}
        for industry_id in self._configs.keys():
            result[industry_id] = self.get_industry_info(industry_id)
        
        logger.info(f"📋 Retrieved {len(result)} industries for frontend")
        return result
    
    def validate_industry(self, industry_type: str) -> bool:
        """
        Tarkista onko industry_type validi
        
        Args:
            industry_type: Tarkistettava teollisuuden tyyppi
            
        Returns:
            True jos validi, False jos ei
        """
        is_valid = industry_type in self._configs
        if not is_valid:
            logger.warning(f"⚠️  Unknown industry type: {industry_type}")
        return is_valid
    
    def get_supported_industries(self) -> List[str]:
        """
        Lista kaikista tuetuista teollisuusaloista
        
        Returns:
            Lista industry_type stringejä
        """
        return list(self._configs.keys())
    
    def get_default_industry(self) -> str:
        """Palauta oletusarvoinen teollisuudenala"""
        return "coating"
    
    def validate_response_structure(self, industry_type: str, response_data: Dict) -> List[str]:
        """
        Validoi että GPT:n vastaus sisältää tarvittavat kentät
        
        Args:
            industry_type: Teollisuuden tyyppi
            response_data: GPT:n palauttama data
            
        Returns:
            Lista puuttuvista pakollisista kentistä
        """
        validation_config = self.get_validation_config(industry_type)
        required_fields = validation_config.get("required_fields", [])
        
        missing_fields = []
        
        for field_path in required_fields:
            # Tarkista nested fieldit (esim. "perustiedot.tuotekoodi")
            current = response_data
            keys = field_path.split('.')
            
            try:
                for key in keys:
                    if not isinstance(current, dict) or key not in current:
                        missing_fields.append(field_path)
                        break
                    current = current[key]
                    
                # Tarkista että arvo ei ole None tai tyhjä
                if current is None or (isinstance(current, str) and current.strip() == ""):
                    missing_fields.append(field_path)
                    
            except (KeyError, TypeError):
                missing_fields.append(field_path)
        
        if missing_fields:
            logger.warning(f"⚠️  Missing required fields for {industry_type}: {missing_fields}")
        
        return missing_fields
    
    def get_config_stats(self) -> Dict:
        """Hae tilastoja konfiguraatioista (debug-käyttöön)"""
        stats = {}
        
        for industry_id, config in self._configs.items():
            stats[industry_id] = {
                "prompt_length": len(config["prompt"]),
                "tabs_count": len(config["ui_config"].get("tabs", [])),
                "features_count": len(config["ui_config"].get("features", {})),
                "required_fields": len(config.get("validation", {}).get("required_fields", []))
            }
        
        return {
            "total_industries": len(self._configs),
            "config_file_path": str(self.config_path),
            "config_file_exists": self.config_path.exists(),
            "industries": stats
        }

# Global singleton instance
industry_manager = IndustryManager()

# Convenience functions (backward compatibility)
def get_prompt_for_industry(industry_type: str) -> str:
    """Backward compatibility function"""
    return industry_manager.get_prompt(industry_type)

def validate_industry_type(industry_type: str) -> bool:
    """Backward compatibility function"""
    return industry_manager.validate_industry(industry_type)

def get_supported_industries() -> List[str]:
    """Backward compatibility function"""
    return industry_manager.get_supported_industries()

# Export main instance
__all__ = ['industry_manager', 'IndustryManager', 'get_prompt_for_industry', 'validate_industry_type', 'get_supported_industries']