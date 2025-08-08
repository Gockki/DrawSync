from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
from pathlib import Path

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from lib.gpt_utils import extract_structured_data_with_vision
from pdf_to_png import pdf_first_page_to_png_bytes  # uusi

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "DrawSync backend alive"}

@app.post("/process")
async def process_image(file: UploadFile = File(...)):
    """GPT-5 multimodaali — tukee PNG/JPG/PDF ilman Poppleria (PyMuPDF)."""
    try:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Tyhjä tiedosto")

        ext = Path(file.filename).suffix.lower()
        if ext == ".pdf":
            image_bytes = pdf_first_page_to_png_bytes(file_bytes, dpi=200)
        else:
            # hyväksy peruskuvat
            if ext not in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"]:
                raise HTTPException(status_code=400, detail=f"Tuettu vain PDF/kuva, saatu: {ext or 'tuntematon'}")
            image_bytes = file_bytes

        structured = extract_structured_data_with_vision(image_bytes)
        structured["success"] = True
        structured["filename"] = file.filename
        return structured

    except HTTPException:
        raise
    except Exception as e:
        return {
            "error": f"Processing failed: {str(e)}",
            "success": False,
            "filename": file.filename,
        }
