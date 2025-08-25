from __future__ import annotations
import os
import pkgutil
import importlib
from typing import Any

from dotenv import load_dotenv
load_dotenv()  # <-- lataa .env paikallisesti

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
# Paikalliskäynnistys
# ---------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
