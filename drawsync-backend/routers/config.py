from __future__ import annotations
from fastapi import APIRouter, Depends
from lib.auth_middleware import require_user  # pidetään auth päällä
from lib.industry_config import get_industries_ui_config

router = APIRouter(prefix="/config", tags=["config"])

@router.get("/industries")
async def industries_config(user = Depends(require_user)):
    # Palauttaa vain UI:lle tarvittavan osan 
    return get_industries_ui_config()
