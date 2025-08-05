# lib/ocr_utils.py
import os
from google.cloud import vision
from dotenv import load_dotenv
from typing import Dict, Any, Union

load_dotenv()

# Aseta Google Cloud credentials
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "creds/gcp_key.json"

def extract_text_from_image_bytes(image_bytes: bytes, return_detailed: bool = False) -> Union[str, Dict[str, Any]]:
    """
    Pura teksti kuvasta Google Vision API:lla
    
    Args:
        image_bytes: Kuvan data byteinä
        return_detailed: Jos True, palauta myös luottamustiedot
    
    Returns:
        str: Pelkkä teksti (oletus)
        dict: Teksti + metatiedot jos return_detailed=True
    """
    try:
        # Luo Vision API client
        client = vision.ImageAnnotatorClient()
        
        # Luo kuva-objekti
        image = vision.Image(content=image_bytes)
        
        # Suorita OCR - document_text_detection on parempi teknisille piirustuksille
        response = client.document_text_detection(
            image=image,
            image_context={"language_hints": ["fi", "en"]}  # Suomi + englanti
        )
        
        # Tarkista virheet
        if response.error.message:
            raise Exception(f"Vision API error: {response.error.message}")
        
        # Jos ei tekstiä
        if not response.full_text_annotation:
            if return_detailed:
                return {
                    "text": "",
                    "confidence": 0,
                    "words_found": 0,
                    "quality": "no_text",
                    "status": "no_text_found"
                }
            return ""
        
        # Pelkkä teksti
        full_text = response.full_text_annotation.text
        
        # Jos halutaan vain teksti, palauta se
        if not return_detailed:
            return full_text
        
        # Yksityiskohtainen analyysi
        total_confidence = 0
        word_count = 0
        block_count = 0
        
        # Laske keskimääräinen luottamus
        for page in response.full_text_annotation.pages:
            for block in page.blocks:
                block_count += 1
                for paragraph in block.paragraphs:
                    for word in paragraph.words:
                        if hasattr(word, 'confidence'):
                            total_confidence += word.confidence
                            word_count += 1
        
        avg_confidence = (total_confidence / word_count) if word_count > 0 else 0
        
        # Määritä laatu
        if avg_confidence >= 0.9:
            quality = "excellent"
        elif avg_confidence >= 0.8:
            quality = "good"  
        elif avg_confidence >= 0.7:
            quality = "fair"
        else:
            quality = "poor"
        
        return {
            "text": full_text,
            "confidence": round(avg_confidence, 3),
            "quality": quality,
            "words_found": word_count,
            "blocks_found": block_count,
            "text_length": len(full_text),
            "status": "success",
            "language_hints": ["fi", "en"]
        }
        
    except Exception as e:
        if return_detailed:
            return {
                "text": "",
                "confidence": 0,
                "quality": "error",
                "error": str(e),
                "status": "error"
            }
        raise e

# Yhteensopivuus-wrapper vanhoille kutsuille
def extract_text_simple(image_bytes: bytes) -> str:
    """
    Yksinkertainen versio joka palauttaa vain tekstin
    Yhteensopiva vanhan koodin kanssa
    """
    return extract_text_from_image_bytes(image_bytes, return_detailed=False)