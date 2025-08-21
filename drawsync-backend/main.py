# drawsync-backend/main.py - KORJATTU STEEL OCR:LLÄ

from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Request, Depends
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

# Auth middleware imports
from lib.auth_middleware import authenticate_with_subdomain_from_request, AuthenticatedUser, SUPABASE_URL, SUPABASE_JWT_SECRET

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

# PDF→PNG konversio
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
        
        logger.info(f"PDF conversion: DPI={dpi}, zoom={zoom:.2f}")
        
        pix = page.get_pixmap(matrix=mat, alpha=False)
        png_bytes = pix.tobytes("png")
        
        logger.info(f"PDF→PNG conversion successful: {len(png_bytes)} bytes, {pix.width}×{pix.height}px")
        
        pdf_doc.close()
        return png_bytes
        
    except ImportError:
        raise ImportError("PyMuPDF (fitz) not installed. Install: pip install PyMuPDF")
    except Exception as e:
        logger.error(f"PDF conversion failed: {e}")
        raise RuntimeError(f"PDF processing failed: {e}")

@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": "DrawSync API v2.0",
        "status": "healthy",
        "endpoints": {
            "process": "POST /process - Analyze images/PDFs",
            "debug": "GET /debug/config - Debug info",
            "debug_jwt": "POST /debug/jwt - JWT Debug",
            "quotes": "/quotes/* - Quote management"
        }
    }

@app.post("/debug/jwt")
async def debug_jwt(request: Request):
    """DEBUG: Analysoi JWT token ongelmia"""
    try:
        auth_header = request.headers.get("authorization")
        
        if not auth_header or not auth_header.startswith("Bearer "):
            return {"error": "No valid Authorization header"}
        
        token = auth_header[7:]
        
        debug_info = {
            "token_received": "YES",
            "token_length": len(token),
            "backend_config": {
                "supabase_url": SUPABASE_URL,
                "has_jwt_secret": bool(SUPABASE_JWT_SECRET)
            }
        }
        
        # ES256 testi
        try:
            import jwt
            header = jwt.get_unverified_header(token)
            debug_info["token_header"] = header
            algorithm = header.get('alg')
            
            logger.info(f"DIRECT TEST: Algorithm is {algorithm}")
            
            if algorithm == 'ES256':
                logger.info("DIRECT TEST: Trying ES256 bypass...")
                payload = jwt.decode(token, options={"verify_signature": False})
                debug_info["verification"] = "ES256_BYPASS_SUCCESS"
                debug_info["payload"] = {
                    "sub": payload.get("sub"),
                    "email": payload.get("email"),
                    "exp": payload.get("exp")
                }
                
                # Manuaalinen exp tarkistus
                import time
                if payload.get('exp', 0) < time.time():
                    debug_info["verification"] = "ES256_EXPIRED"
                else:
                    debug_info["verification"] = "ES256_VALID"
                    
            else:
                debug_info["verification"] = f"NON_ES256_ALGORITHM: {algorithm}"
                
        except Exception as e:
            debug_info["verification"] = f"DIRECT_ERROR: {str(e)}"
            debug_info["error_type"] = type(e).__name__
        
        return debug_info
        
    except Exception as e:
        return {"error": f"Debug failed: {str(e)}"}

@app.get("/debug/config")
async def debug_config(
    request: Request,
    user: AuthenticatedUser = Depends(authenticate_with_subdomain_from_request)
):
    """Debug endpoint: Näytä industry manager tilastoja"""
    try:
        stats = industry_manager.get_config_stats()
        
        return {
            "config_stats": stats,
            "manager_status": "healthy" if industry_manager._configs else "unhealthy",
            "authenticated_user": {
                "email": user.email,
                "user_id": user.user_id,
                "organization_id": user.organization_id,
                "role": user.role
            }
        }
    except Exception as e:
        logger.error(f"Debug endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/debug/image-info")
async def debug_image_info(
    request: Request,
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(authenticate_with_subdomain_from_request)
):
    """Debug: Analysoi kuvan laatua ja resoluutiota"""
    try:
        from PIL import Image
        
        file_bytes = await file.read()
        
        info = {
            "filename": file.filename,
            "file_size_bytes": len(file_bytes),
            "file_size_mb": round(len(file_bytes) / 1024 / 1024, 2),
            "analyzed_by": user.email
        }
        
        # PDF analyysi
        ext = Path(file.filename).suffix.lower()
        if ext == ".pdf":
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
    request: Request,
    file: UploadFile = File(...),
    industry_type: Optional[str] = Form(default="coating"),
    organization_id: Optional[str] = Form(default=None),
    dpi: Optional[int] = Form(default=500),
    user: AuthenticatedUser = Depends(authenticate_with_subdomain_from_request)
):
    """
    Prosessoi kuva/PDF GPT-5:llä industry-spesifisellä promptilla.
    VAATII AUTHENTICATION
    
    Args:
        file: Kuva/PDF-tiedosto (PDF/PNG/JPG/etc.)
        industry_type: Teollisuuden tyyppi (coating/steel/machining)
        organization_id: Organisaation ID (opsionaalinen)
        dpi: PDF→PNG konversion DPI (oletus 500)
    """
    start_time = time.time()
    
    logger.info(f"Process request from user: {user.email} (ID: {user.user_id})")
    logger.info(f"Organization: {user.organization_id} (Role: {user.role})")
    logger.info(f"File: {file.filename}, Industry: {industry_type}")
    
    try:
        # Validate input
        if not file.filename:
            raise HTTPException(400, "No file provided")
        
        # Read file
        original_file_bytes = await file.read()
        ext = Path(file.filename).suffix.lower()
        
        # Supported formats
        supported_formats = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp']
        
        # Process file
        if ext == ".pdf":
            logger.info(f"Converting PDF to PNG (DPI: {dpi})")
            image_bytes = pdf_first_page_to_png_bytes(original_file_bytes, dpi=dpi)
            processing_note = f"pdf_to_png_dpi_{dpi}"
        elif ext in supported_formats:
            image_bytes = original_file_bytes
            processing_note = f"native_{ext[1:]}"
            
            # Check image size
            try:
                from PIL import Image
                pil_image = Image.open(io.BytesIO(image_bytes))
                width, height = pil_image.size
                logger.info(f"Native image: {width}×{height} pixels")
                
                min_dimension = min(width, height)
                if min_dimension < 1000:
                    logger.warning(f"Low resolution image: {width}×{height}")
                    
            except Exception as e:
                logger.warning(f"Could not analyze image size: {e}")
        else:
            raise HTTPException(
                400, 
                f"Unsupported file format: {ext}. "
                f"Supported: {supported_formats + ['.pdf']}"
            )

        # Get industry-specific prompt
        prompt = industry_manager.get_prompt(industry_type)
        
        # STEEL OCR INTEGRATION
        logger.info(f"DEBUG: industry_type = '{industry_type}', is steel: {industry_type == 'steel'}")
        
        if industry_type == "steel":
            logger.info("Using Google Vision OCR for steel analysis...")
            try:
                from lib.ocr_utils import extract_text_from_image_bytes
                from lib.ocr_image_prep import normalize_for_vision
                from lib.steel_ocr_integration import create_steel_prompt_with_ocr
                
                # Use 400 DPI PNG for OCR
                if ext == ".pdf":
                    logger.info("Creating PNG for Google OCR (400 DPI)...")
                    ocr_image_bytes = pdf_first_page_to_png_bytes(original_file_bytes, dpi=400)
                    logger.info(f"OCR image created: {len(ocr_image_bytes)} bytes")
                else:
                    ocr_image_bytes = original_file_bytes

                # Normalize and run OCR
                try:
                    ocr_image_bytes = normalize_for_vision(ocr_image_bytes)
                    logger.info(f"OCR image normalized: {len(ocr_image_bytes)} bytes")
                except Exception as prep_err:
                    logger.warning(f"OCR image normalization failed, proceeding with original: {prep_err}")

                # Run Google Vision OCR
                ocr_results = extract_text_from_image_bytes(ocr_image_bytes, return_detailed=True)
                
                if ocr_results.get("status") == "success":
                    # Create enhanced prompt with OCR results
                    enhanced_prompt = create_steel_prompt_with_ocr(prompt, ocr_results)
                    prompt = enhanced_prompt
                    
                    logger.info(f"Google OCR completed successfully:")
                    logger.info(f"   - Quality: {ocr_results.get('quality', 'unknown')}")
                    logger.info(f"   - Confidence: {ocr_results.get('confidence', 0):.3f}")
                    logger.info(f"   - Words found: {ocr_results.get('words_found', 0)}")
                    logger.info(f"   - Text length: {ocr_results.get('text_length', 0)} chars")
                    logger.info(f"Enhanced prompt length: {len(prompt)} characters")
                else:
                    logger.warning(f"Google OCR failed: {ocr_results.get('error', 'Unknown error')}")
                    
            except Exception as ocr_error:
                logger.warning(f"Steel OCR failed: {ocr_error}")
                # Continue with basic prompt if OCR fails
        else:
            logger.info(f"Using standard prompt for {industry_type}: {len(prompt)} characters")
        
        # Process with GPT (either enhanced or original prompt)
        result = extract_structured_data_with_vision(
            image_bytes=image_bytes,
            prompt=prompt,
            industry_type=industry_type
        )
        
        # Add processing metadata
        processing_time = round(time.time() - start_time, 2)
        result["processing_info"] = result.get("processing_info", {})
        result["processing_info"].update({
            "total_processing_time": processing_time,
            "file_processing": processing_note,
            "original_filename": file.filename,
            "processed_by": user.email,
            "user_id": user.user_id,
            "organization_id": user.organization_id,
            "user_role": user.role
        })
        
        logger.info(f"Processing completed in {processing_time}s for {user.email}")
        
        return {
            "success": True,
            "industry_type": industry_type,
            **result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        raise HTTPException(500, f"Processing failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")