from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from lib.ocr_utils import extract_text_from_image_bytes
from lib.gpt_utils import extract_structured_data

app = FastAPI()

# CORS (salli frontend-yhteydet)
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

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # TODO: käsittele tiedosto (OCR + GPT)
    return {"filename": file.filename}

@app.post("/process")
async def process_image(file: UploadFile = File(...)):
    image_bytes = await file.read()
    ocr_text = extract_text_from_image_bytes(image_bytes)
    structured = extract_structured_data(ocr_text)
    return structured