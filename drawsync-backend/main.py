# drawsync-backend/main.py - Täydellinen versio

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
from pathlib import Path
from typing import Optional
import logging
import time
import io

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Imports
from lib.gpt_utils import extract_structured_data_with_vision
from lib.industry_manager import industry_manager
from routers.quotes import router as quotes_router

app = FastAPI(
    title="DrawSync API",
    description="AI-powered drawing analysis for different industries",
    version="2.0.0"
)

# Include routers
app.include_router(quotes_router)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production: vaihda tarkempiin domaineihin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Parannettu PDF→PNG konversio
def pdf_first_page_to_png_bytes(pdf_bytes: bytes, dpi: int = 400) -> bytes:
    """
    Muuntaa PDF:n ensimmäisen sivun PNG:ksi korkealla DPI:llä.
    
    Args:
        pdf_bytes: PDF data
        dpi: Resoluutio (oletus 400, suositus 300-600 teknisille piirustuksille)
    
    Returns:
        PNG image bytes
    """
    try:
        import fitz  # PyMuPDF
        
        # Avaa PDF
        pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        if len(pdf_doc) == 0:
            raise ValueError("PDF contains no pages")
        
        # Hae ensimmäinen sivu
        page = pdf_doc[0]
        
        # Laske zoom-kerroin DPI:n perusteella
        # PyMuPDF default: 72 DPI, joten zoom = target_dpi / 72
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        
        logger.info(f"📊 PDF conversion: DPI={dpi}, zoom={zoom:.2f}")
        
        # Renderöi sivu korkearesoluutioiseksi kuvaksi
        pix = page.get_pixmap(matrix=mat, alpha=False)
        
        # Muunna PNG-bytesiksi
        png_bytes = pix.tobytes("png")
        
        logger.info(f"✅ PDF→PNG conversion successful: {len(png_bytes)} bytes, {pix.width}×{pix.height}px")
        
        pdf_doc.close()
        return png_bytes
        
    except ImportError:
        raise ImportError("PyMuPDF (fitz) not installed. Run: pip install PyMuPDF")
    except Exception as e:
        logger.error(f"❌ PDF conversion failed: {e}")
        raise ValueError(f"PDF conversion failed: {e}")

@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "message": "DrawSync backend alive",
        "version": "2.0.0",
        "supported_industries": industry_manager.get_supported_industries(),
        "features": ["high_dpi_pdf", "multi_industry", "gpt5_analysis"]
    }

@app.get("/api/industries")
async def get_industries():
    """
    Frontend hakee industry configurations tästä endpoint:istä.
    Palauttaa UI-configs mutta EI prompteja (turvallisuussyistä).
    """
    try:
        return {
            "success": True,
            "industries": industry_manager.get_all_industries(),
            "default": industry_manager.get_default_industry(),
            "supported": industry_manager.get_supported_industries(),
            "total_count": len(industry_manager.get_supported_industries())
        }
    except Exception as e:
        logger.error(f"❌ Failed to get industries: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load industries: {str(e)}")

@app.get("/debug/industries")
async def debug_industries():
    """
    Debug endpoint - näytä industry configurations tilastoja.
    HUOM: Tämä endpoint EI paljasta prompteja, vain tilastoja.
    """
    try:
        stats = industry_manager.get_config_stats()
        return {
            "config_stats": stats,
            "manager_status": "healthy" if industry_manager._configs else "unhealthy"
        }
    except Exception as e:
        logger.error(f"❌ Debug endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/debug/image-info")
async def debug_image_info(file: UploadFile = File(...)):
    """Debug: Analysoi kuvan laatua ja resoluutiota"""
    try:
        from PIL import Image
        
        file_bytes = await file.read()
        
        info = {
            "filename": file.filename,
            "file_size_bytes": len(file_bytes),
            "file_size_mb": round(len(file_bytes) / 1024 / 1024, 2)
        }
        
        # PDF analyysi
        ext = Path(file.filename).suffix.lower()
        if ext == ".pdf":
            # Testaa eri DPI-arvoja
            for dpi in [200, 300, 400, 500]:
                try:
                    png_bytes = pdf_first_page_to_png_bytes(file_bytes, dpi=dpi)
                    pil_image = Image.open(io.BytesIO(png_bytes))
                    width, height = pil_image.size
                    
                    info[f"dpi_{dpi}"] = {
                        "dimensions": f"{width}×{height}",
                        "png_size_mb": round(len(png_bytes) / 1024 / 1024, 2),
                        "recommended": dpi >= 300 and min(width, height) >= 1500
                    }
                except Exception as e:
                    info[f"dpi_{dpi}"] = {"error": str(e)}
        else:
            # Suora kuva-analyysi
            try:
                pil_image = Image.open(io.BytesIO(file_bytes))
                width, height = pil_image.size
                info["original_image"] = {
                    "dimensions": f"{width}×{height}",
                    "format": pil_image.format,
                    "mode": pil_image.mode,
                    "suitable_for_ocr": min(width, height) >= 1000
                }
            except Exception as e:
                info["original_image"] = {"error": str(e)}
        
        return info
        
    except Exception as e:
        raise HTTPException(500, f"Image analysis failed: {e}")

@app.post("/process")
async def process_image(
    file: UploadFile = File(...),
    industry_type: Optional[str] = Form(default="coating"),
    organization_id: Optional[str] = Form(default=None),
    dpi: Optional[int] = Form(default=500)  # ✅ Korkeampi DPI oletuksena parempaan laatuun
):
    """
    Prosessoi kuva/PDF GPT-5:llä industry-spesifisellä promptilla.
    
    Args:
        file: Kuva/PDF-tiedosto (PDF/PNG/JPG/etc.)
        industry_type: 'coating', 'steel', tai 'machining' 
        organization_id: Organisaation ID (valinnainen analytics-datalle)
        dpi: PDF→PNG konversion DPI (oletus 500 parempaan laatuun)
    
    Returns:
        Industry-spesifinen JSON-analyysi
    """
    start_time = time.time()
    
    try:
        # ✅ Validoi industry_type
        if not industry_manager.validate_industry(industry_type):
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported industry type: {industry_type}. Supported: {industry_manager.get_supported_industries()}"
            )
        
        # ✅ Validoi ja optimoi DPI
        dpi = max(300, min(600, dpi))  # Vähintään 300 DPI teknisille piirustuksille
        
        logger.info(f"🏭 Processing {file.filename} for industry: {industry_type}")
        if organization_id:
            logger.info(f"📊 Organization ID: {organization_id}")

        # Validoi tiedosto
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Empty file received")

        # ✅ OPTIMOITU tiedostokäsittely - eri strategia Google OCR:lle vs GPT:lle
        ext = Path(file.filename).suffix.lower()
        
        # ✅ Säilytä alkuperäinen PDF Google OCR:ää varten
        original_file_bytes = file_bytes
        
        if ext == ".pdf":
            logger.info(f"📄 Converting PDF to high-quality PNG at {dpi} DPI for GPT-5...")
            
            # Muunna PNG:ksi GPT-5:lle
            image_bytes = pdf_first_page_to_png_bytes(file_bytes, dpi=dpi)
            processing_note = f"pdf_to_png_{dpi}dpi"
            
            # Tarkista tuotetun kuvan laatu
            try:
                from PIL import Image
                pil_image = Image.open(io.BytesIO(image_bytes))
                width, height = pil_image.size
                logger.info(f"📐 Generated PNG for GPT-5: {width}×{height} pixels at {dpi} DPI")
                
                if min(width, height) < 2000:
                    logger.warning(f"⚠️  Consider higher DPI: {width}×{height}")
                else:
                    logger.info(f"✅ High-quality conversion successful: {width}×{height}")
                    
            except Exception as e:
                logger.warning(f"Could not analyze generated image size: {e}")
                
        else:
            # Suorat kuvatiedostot - käytä samaa molemmille
            supported_formats = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"]
            if ext not in supported_formats:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Unsupported file format: {ext}. Supported: {supported_formats + ['.pdf']}"
                )
            image_bytes = file_bytes
            processing_note = f"native_{ext[1:]}"
            
            # Tarkista kuvan koko
            try:
                from PIL import Image
                pil_image = Image.open(io.BytesIO(image_bytes))
                width, height = pil_image.size
                logger.info(f"📷 Native image: {width}×{height} pixels")
                
                min_dimension = min(width, height)
                if min_dimension < 1000:
                    logger.warning(f"⚠️  Low resolution image: {width}×{height}")
                    
            except Exception as e:
                logger.warning(f"Could not analyze image size: {e}")

        # ✅ KRIITTINEN: Hae industry-spesifinen prompt
        prompt = industry_manager.get_prompt(industry_type)
        
        # ✅ STEEL-ALAN ERIKOISUUS: Käytä Google OCR korkealla DPI:llä
        if industry_type == "steel":
            try:
                logger.info(f"🔍 Using Google Vision OCR with high-DPI conversion for steel analysis...")
                from lib.ocr_utils import extract_text_from_image_bytes
                from lib.steel_ocr_integration import create_steel_prompt_with_ocr
                
                # ✅ Google Vision tarvitsee kuvan, ei PDF:ää
                if ext == ".pdf":
                    # Luo erittäin korkealaatuinen PNG Google OCR:ää varten
                    logger.info(f"📄 Creating ultra-high quality PNG for Google OCR (600 DPI)...")
                    ocr_image_bytes = pdf_first_page_to_png_bytes(original_file_bytes, dpi=600)
                    logger.info(f"✅ OCR image created: {len(ocr_image_bytes)} bytes")
                else:
                    # Käytä alkuperäistä kuvaa
                    ocr_image_bytes = original_file_bytes
                
                # 1. Aja Google Vision OCR korkealaatuiselle kuvalle
                ocr_results = extract_text_from_image_bytes(ocr_image_bytes, return_detailed=True)
                
                if ocr_results.get("status") == "success":
                    # 2. Luo parannettu prompt OCR-tulosten kanssa
                    enhanced_prompt = create_steel_prompt_with_ocr(prompt, ocr_results)
                    prompt = enhanced_prompt
                    
                    logger.info(f"✅ Google OCR completed successfully:")
                    logger.info(f"   - Source: {'600 DPI PNG from PDF' if ext == '.pdf' else 'original image'}")
                    logger.info(f"   - Quality: {ocr_results.get('quality', 'unknown')}")
                    logger.info(f"   - Confidence: {ocr_results.get('confidence', 0):.3f}")
                    logger.info(f"   - Words found: {ocr_results.get('words_found', 0)}")
                    logger.info(f"   - Text length: {ocr_results.get('text_length', 0)} chars")
                    logger.info(f"📝 Enhanced prompt length: {len(prompt)} characters")
                else:
                    logger.warning(f"⚠️  Google OCR failed: {ocr_results.get('error', 'Unknown error')}")
                    
            except Exception as ocr_error:
                logger.warning(f"⚠️  Google Vision OCR failed, using basic prompt: {ocr_error}")
                # Jatka tavallisella promptilla jos OCR epäonnistuu
        else:
            logger.info(f"📝 Using standard prompt for {industry_type}: {len(prompt)} characters")

        # ✅ KRIITTINEN: Käytä PNG:tä GPT-5:lle (GPT ei osaa PDF:iä)
        structured = extract_structured_data_with_vision(
            image_bytes=image_bytes,  # ← PNG GPT:lle
            prompt=prompt,  # ← Enhanced prompt jos steel + OCR onnistui
            industry_type=industry_type
        )
        
        # ✅ Lisää meta-tiedot vastaukseen
        processing_time = round(time.time() - start_time, 2)
        structured.update({
            "success": True,
            "filename": file.filename,
            "industry_type": industry_type,
            "processing_time": processing_time,
            "processing_method": processing_note,  # ✅ Kertoo käytettiinkö suoraa PDF:ää vai PNG-konversiota
            "dpi_used": dpi if processing_note.startswith("pdf_to_png") else None
        })
        
        if organization_id:
            structured["organization_id"] = organization_id

        # ✅ Validoi vastauksen rakenne
        missing_fields = industry_manager.validate_response_structure(industry_type, structured)
        if missing_fields:
            structured["validation_warnings"] = missing_fields
            logger.warning(f"⚠️  Response missing fields: {missing_fields}")

        logger.info(f"✅ Successfully processed {industry_type} drawing: {file.filename} in {processing_time}s")
        return structured

    except HTTPException:
        raise
    except Exception as e:
        processing_time = round(time.time() - start_time, 2)
        logger.error(f"❌ Processing failed after {processing_time}s: {str(e)}")
        
        # Palauta industry-spesifinen virhevastaus
        error_response = {
            "error": f"Processing failed: {str(e)}",
            "success": False,
            "filename": file.filename,
            "industry_type": industry_type,
            "processing_time": processing_time
        }
        
        # Lisää industry-spesifinen rakenne virhevastaukseen
        if industry_type == "steel":
            error_response.update({
                "perustiedot": {},
                "materiaalilista": [],
                "yhteenveto": {},
                "huomiot": ["Analyysi epäonnistui: " + str(e)]
            })
        elif industry_type == "machining":
            error_response.update({
                "perustiedot": {},
                "toleranssit": [],
                "koneistusoperaatiot": [],
                "yhteenveto": {},
                "huomiot": ["Analyysi epäonnistui: " + str(e)]
            })
        else:  # coating
            error_response.update({
                "perustiedot": {},
                "mitat": {},
                "pinta_ala_analyysi": {},
                "huomiot": ["Analyysi epäonnistui: " + str(e)]
            })
        
        return error_response

@app.post("/admin/reload-configs")
async def reload_industry_configs():
    """
    Admin endpoint: Lataa industry configs uudelleen.
    Hyödyllinen development-aikana kun muokataan prompteja.
    """
    try:
        industry_manager.reload_configs()
        return {
            "success": True,
            "message": "Industry configurations reloaded successfully",
            "industries": industry_manager.get_supported_industries()
        }
    except Exception as e:
        logger.error(f"❌ Failed to reload configs: {e}")
        raise HTTPException(status_code=500, detail=f"Reload failed: {str(e)}")

@app.get("/health")
def health_check():
    """Detailed health check"""
    try:
        config_stats = industry_manager.get_config_stats()
        return {
            "status": "healthy",
            "version": "2.0.0",
            "timestamp": time.time(),
            "features": [
                "multi_industry_support",
                "high_dpi_pdf_processing", 
                "image_processing",
                "gpt5_analysis",
                "dynamic_prompts",
                "resolution_analysis"
            ],
            "industry_manager": {
                "total_industries": len(industry_manager.get_supported_industries()),
                "config_file_exists": config_stats["config_file_exists"],
                "supported_types": industry_manager.get_supported_industries()
            },
            "pdf_processing": {
                "default_dpi": 400,
                "max_dpi": 600,
                "min_dpi": 200,
                "recommended_min_resolution": "1500×1500px"
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": time.time()
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")