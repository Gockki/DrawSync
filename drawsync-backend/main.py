# ===================================
# drawsync-backend/main.py - JWT Authentication lisätty
# ===================================

from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials
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
from lib.auth_middleware import (
    authenticate_with_subdomain_from_request,
    require_authenticated_user,
    AuthenticatedUser,
    extract_subdomain_from_request
)
from routers.quotes import router as quotes_router

app = FastAPI(
    title="DrawSync API",
    description="AI-powered drawing analysis for different industries",
    version="2.0.0"
)

# Include routers
app.include_router(quotes_router)

# ✅ KORJATTU CORS - ei enää *
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173", 
    "http://pic2data.local:5173",
    "http://*.pic2data.local:5173",  # Wildcards eivät toimi, lisää eksplisiittisesti
    "http://mantox.pic2data.local:5173",
    "http://finecom.pic2data.local:5173",
    "http://admin.pic2data.local:5173",
    # Production domains (lisää kun tiedossa)
    # "https://pic2data.fi",
    # "https://*.pic2data.fi"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # ✅ Rajoitettu
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# ===================================
# PUBLIC ENDPOINTS (ei auth:ia)
# ===================================

@app.get("/")
def root():
    """Health check endpoint - PUBLIC"""
    return {
        "message": "DrawSync backend alive",
        "version": "2.0.0",
        "supported_industries": industry_manager.get_supported_industries(),
        "features": ["high_dpi_pdf", "multi_industry", "gpt5_analysis", "jwt_auth"]
    }

@app.get("/health")
def health_check():
    """Detailed health check - PUBLIC"""
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
                "jwt_authentication"  # ✅ Uusi feature
            ],
            "industry_manager": {
                "total_industries": len(industry_manager.get_supported_industries()),
                "config_file_exists": config_stats["config_file_exists"],
                "supported_types": industry_manager.get_supported_industries()
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": time.time()
        }

@app.get("/api/industries")
async def get_industries():
    """Frontend hakee industry configurations - PUBLIC"""
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

# ===================================
# PROTECTED ENDPOINTS (vaatii JWT auth)
# ===================================

# ✅ PDF→PNG konversio (säilyy samana)
def pdf_first_page_to_png_bytes(pdf_bytes: bytes, dpi: int = 400) -> bytes:
    """Muuntaa PDF:n ensimmäisen sivun PNG:ksi korkealla DPI:llä."""
    try:
        import fitz  # PyMuPDF
        
        pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if len(pdf_doc) == 0:
            raise ValueError("PDF contains no pages")
        
        page = pdf_doc[0]
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        
        logger.info(f"📊 PDF conversion: DPI={dpi}, zoom={zoom:.2f}")
        
        pix = page.get_pixmap(matrix=mat, alpha=False)
        png_bytes = pix.tobytes("png")
        
        logger.info(f"✅ PDF→PNG conversion: {len(png_bytes)} bytes, {pix.width}×{pix.height}px")
        
        pdf_doc.close()
        return png_bytes
        
    except ImportError:
        raise ImportError("PyMuPDF (fitz) not installed. Run: pip install PyMuPDF")
    except Exception as e:
        logger.error(f"❌ PDF conversion failed: {e}")
        raise ValueError(f"PDF conversion failed: {e}")

@app.post("/process")
async def process_image(
    request: Request,  # ✅ Tarvitaan subdomain extractioniin
    file: UploadFile = File(...),
    industry_type: Optional[str] = Form(default="coating"),
    dpi: Optional[int] = Form(default=500),
    user: AuthenticatedUser = Depends(authenticate_with_subdomain_from_request)  # ✅ JWT AUTH!
):
    """
    🔒 SUOJATTU ENDPOINT: Prosessoi kuva/PDF GPT-5:llä
    
    Vaatii:
    - JWT tokenin Authorization headerissa
    - Pääsyn organisaatioon (jos subdomain)
    
    Args:
        file: Kuva/PDF-tiedosto
        industry_type: coating/steel/machining
        dpi: PDF konversion DPI
        user: Autentikoitu käyttäjä (injektoidaan middleware:llä)
    """
    
    start_time = time.time()
    
    # ✅ Log authenticated request
    logger.info(f"🔒 Authenticated request: {user} → Processing {file.filename}")
    
    # Validoi industry type
    if not industry_manager.validate_industry(industry_type):
        raise HTTPException(400, f"Unsupported industry type: {industry_type}")
    
    # Validoi tiedosto
    if not file.filename:
        raise HTTPException(400, "No file provided")
    
    try:
        # Lue tiedosto
        original_file_bytes = await file.read()
        logger.info(f"📁 File uploaded: {file.filename} ({len(original_file_bytes)} bytes)")
        
        # Prosessoi tiedosto
        ext = Path(file.filename).suffix.lower()
        supported_formats = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
        
        if ext == ".pdf":
            logger.info(f"📄 Converting PDF to PNG at {dpi} DPI...")
            image_bytes = pdf_first_page_to_png_bytes(original_file_bytes, dpi=dpi)
            processing_note = f"pdf_to_png_{dpi}dpi"
        elif ext in supported_formats:
            image_bytes = original_file_bytes
            processing_note = f"native_{ext[1:]}"
        else:
            raise HTTPException(
                415, 
                f"Unsupported file format: {ext}. Supported: {supported_formats + ['.pdf']}"
            )
        
        # Hae industry-spesifinen prompt
        prompt = industry_manager.get_prompt(industry_type)
        
        # 🚀 GPT-5 analyysi
        structured = extract_structured_data_with_vision(
            image_bytes=image_bytes,
            prompt=prompt,
            industry_type=industry_type
        )
        
        # ✅ Lisää meta-tiedot
        processing_time = round(time.time() - start_time, 2)
        structured.update({
            "success": True,
            "filename": file.filename,
            "industry_type": industry_type,
            "processing_time": processing_time,
            "processing_method": processing_note,
            "dpi_used": dpi if processing_note.startswith("pdf_to_png") else None,
            "organization_id": user.organization_id,  # ✅ Organisaatio ID mukaan
            "processed_by": user.user_id  # ✅ Käyttäjä ID mukaan
        })
        
        # Validoi vastauksen rakenne
        missing_fields = industry_manager.validate_response_structure(industry_type, structured)
        if missing_fields:
            structured["validation_warnings"] = missing_fields
            logger.warning(f"⚠️  Response missing fields: {missing_fields}")

        logger.info(f"✅ Processing complete: {user.email} → {file.filename} ({processing_time}s)")
        return structured

    except HTTPException:
        raise
    except Exception as e:
        processing_time = round(time.time() - start_time, 2)
        logger.error(f"❌ Processing failed for {user.email}: {str(e)}")
        
        # Industry-spesifinen virhevastaus
        error_response = {
            "error": f"Processing failed: {str(e)}",
            "success": False,
            "filename": file.filename,
            "industry_type": industry_type,
            "processing_time": processing_time,
            "organization_id": user.organization_id,
            "processed_by": user.user_id
        }
        
        # Lisää industry-spesifinen rakenne
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

# ===================================
# ADMIN ENDPOINTS (vaatii auth)
# ===================================

@app.post("/admin/reload-configs")
async def reload_industry_configs(
    user: AuthenticatedUser = Depends(require_authenticated_user)
):
    """🔒 ADMIN: Lataa industry configs uudelleen"""
    logger.info(f"🔧 Config reload requested by: {user.email}")
    
    try:
        industry_manager.reload_configs()
        return {
            "success": True,
            "message": "Industry configurations reloaded successfully",
            "industries": industry_manager.get_supported_industries(),
            "reloaded_by": user.email
        }
    except Exception as e:
        logger.error(f"❌ Failed to reload configs: {e}")
        raise HTTPException(status_code=500, detail=f"Reload failed: {str(e)}")

@app.get("/debug/industries")
async def debug_industries(
    user: AuthenticatedUser = Depends(require_authenticated_user)
):
    """🔒 DEBUG: Industry configurations tilastoja"""
    logger.info(f"🔍 Debug request by: {user.email}")
    
    try:
        stats = industry_manager.get_config_stats()
        return {
            "config_stats": stats,
            "manager_status": "healthy" if industry_manager._configs else "unhealthy",
            "requested_by": user.email
        }
    except Exception as e:
        logger.error(f"❌ Debug endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")