from __future__ import annotations
import os
import json
import pkgutil
import importlib
from typing import Any

from dotenv import load_dotenv
load_dotenv()  # <-- lataa .env paikallisesti

# ---------------------------
# Google Cloud Credentials Setup for Railway
# ---------------------------
def setup_google_cloud_credentials():
    """Setup Google Cloud credentials for Railway deployment"""
    gcp_creds_json = os.getenv("GOOGLE_CLOUD_CREDENTIALS")
    
    if gcp_creds_json:
        try:
            # Validate JSON format
            json.loads(gcp_creds_json)
            
            # Write to /tmp/gcp_key.json
            with open("/tmp/gcp_key.json", "w") as f:
                f.write(gcp_creds_json)
            
            # Set environment variable to point to the file
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/tmp/gcp_key.json"
            print("[STARTUP] Google Cloud credentials configured from environment")
            
        except json.JSONDecodeError as e:
            print(f"[STARTUP] Invalid GOOGLE_CLOUD_CREDENTIALS JSON: {e}")
        except Exception as e:
            print(f"[STARTUP] Failed to setup Google Cloud credentials: {e}")
    else:
        print("[STARTUP] GOOGLE_CLOUD_CREDENTIALS not found in environment")
        # Fallback to local file for development
        if os.path.exists("creds/gcp_key.json"):
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "creds/gcp_key.json"
            print("[STARTUP] Using local credentials file: creds/gcp_key.json")

# Setup credentials before importing any Google Cloud libraries
setup_google_cloud_credentials()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter

app = FastAPI(
    title="DrawSync API",
    version="1.0.0",
)

# ---------------------------
# CORS
# ---------------------------
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]

ALLOWED_ORIGIN_REGEX = os.getenv(
    "ALLOWED_ORIGIN_REGEX",
    r"^https?://([a-z0-9-]+\.)*pic2data\.local(?::\d+)?$"
)

print(f"[CORS] ALLOWED_ORIGINS = {ALLOWED_ORIGINS}")
print(f"[CORS] ALLOWED_ORIGIN_REGEX = {ALLOWED_ORIGIN_REGEX}")

# Salli Vercel-previewt (tai aseta tämä Railwayn ENViin). Jos asetat ENViin, tämä arvo yliajetaan.
ALLOWED_ORIGIN_REGEX = os.getenv(
    "ALLOWED_ORIGIN_REGEX",
    r"^https://.*\.vercel\.app$|^https?://([a-z0-9-]+\.)*pic2data\.local(?::\d+)?$"
)

# Debug-startuplogi (näkyy Railwayn lokeissa)
print("[CORS] ALLOWED_ORIGINS =", ALLOWED_ORIGINS)
print("[CORS] ALLOWED_ORIGIN_REGEX =", ALLOWED_ORIGIN_REGEX)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX or None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    # Preflightissa selain saattaa pyytää mm. authorization, content-type, x-client-info, baggage, x-sentry-trace, jne.
    # Pilotissa turvallisin on sallia kaikki custom-headerit:
    allow_headers=["*"],
    # (valinnainen) näytä nämä selaimelle vastauksissa:
    expose_headers=["X-Request-ID"],
)

# ---------------------------
# Routerien automaattinen sisäänajo
# ---------------------------
def _include_all_routers(app: FastAPI) -> None:
    routers_pkg_name = "routers"
    try:
        pkg = importlib.import_module(routers_pkg_name)
        pkg_path = os.path.dirname(pkg.__file__ or "")
    except Exception:
        return

    for modinfo in pkgutil.iter_modules([pkg_path]):
        mod_name = f"{routers_pkg_name}.{modinfo.name}"
        try:
            module = importlib.import_module(mod_name)
        except Exception:
            continue

        router_obj: Any = getattr(module, "router", None)
        if isinstance(router_obj, APIRouter):
            app.include_router(router_obj)

_include_all_routers(app)

# ---------------------------
# Health
# ---------------------------
@app.get("/health")
def health() -> dict:
    return {"ok": True}

# ---------------------------
# Startup Event
# ---------------------------
@app.on_event("startup")
async def startup_event():
    """Log startup information"""
    gcp_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if gcp_path and os.path.exists(gcp_path):
        print(f"[STARTUP] Google Cloud credentials ready: {gcp_path}")
    else:
        print(f"[STARTUP] Google Cloud credentials issue: {gcp_path}")

# ---------------------------
# Paikalliskäynnistys
# ---------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)