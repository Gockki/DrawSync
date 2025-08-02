# lib/ocr_utils.py

import os
from google.cloud import vision
from dotenv import load_dotenv

load_dotenv()

# Lataa avain .env-tiedostosta
API_KEY = os.getenv("GOOGLE_CLOUD_API_KEY")
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "creds/gcp_key.json"

# Luo client käyttämällä API-avainta authentication overridea
def extract_text_from_image_bytes(image_bytes: bytes) -> str:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google.auth import default

    # Luo asiakasavain Vision API:lle
    client = vision.ImageAnnotatorClient()

    image = vision.Image(content=image_bytes)
    response = client.document_text_detection(image=image)

    if response.error.message:
        raise Exception(f"Vision API error: {response.error.message}")

    return response.full_text_annotation.text
