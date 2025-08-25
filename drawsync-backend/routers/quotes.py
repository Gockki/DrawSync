from __future__ import annotations

import os
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from lib.auth_middleware import require_user, AuthenticatedUser

try:
    import resend  # type: ignore
except Exception:
    resend = None

router = APIRouter(prefix="/quotes", tags=["quotes"])

class QuoteEmailRequest(BaseModel):
    to: List[EmailStr]
    cc: Optional[List[EmailStr]] = []
    subject: str
    html: str
    reply_to: Optional[EmailStr] = None

class QuoteEmailResponse(BaseModel):
    ok: bool
    id: Optional[str] = None
    message: Optional[str] = None

def _ensure_resend_ready() -> None:
    if resend is None:
        raise HTTPException(status_code=500, detail="Email provider not available (resend client missing)")
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="RESEND_API_KEY not configured")
    resend.api_key = api_key

def _from_header() -> str:
    """
    Rakenna 'From' header ympäristömuuttujista:
    1) FROM_EMAIL (+ FROM_NAME jos annettu), esim: 'Mantox Solutions <onboarding@resend.dev>'
    2) EMAIL_FROM (jos käytössä vanha muuttujanimi), esim: 'DrawSync <noreply@...>'
    """
    from_email = os.getenv("FROM_EMAIL", "").strip()
    from_name = os.getenv("FROM_NAME", "").strip()
    if from_email:
        return f"{from_name} <{from_email}>" if from_name else from_email
    email_from_legacy = os.getenv("EMAIL_FROM", "").strip()
    return email_from_legacy or "DrawSync <noreply@drawsync.local>"

def _reply_to_default() -> Optional[str]:
    # prioriteetti: EMAIL_REPLY_TO -> FROM_EMAIL -> None
    rt = os.getenv("EMAIL_REPLY_TO", "").strip()
    if rt:
        return rt
    fe = os.getenv("FROM_EMAIL", "").strip()
    return fe or None

@router.post("/send", response_model=QuoteEmailResponse)
async def send_quote_email(
    req: QuoteEmailRequest,
    user: AuthenticatedUser = Depends(require_user),
) -> QuoteEmailResponse:
    if not req.to:
        raise HTTPException(status_code=422, detail="'to' must contain at least one recipient")
    if not req.subject.strip():
        raise HTTPException(status_code=422, detail="'subject' is required")
    if not req.html.strip():
        raise HTTPException(status_code=422, detail="'html' is required")

    _ensure_resend_ready()

    from_header = _from_header()
    reply_to = req.reply_to or _reply_to_default()

    try:
        result = resend.Emails.send({
            "from": from_header,
            "to": req.to,
            "cc": req.cc or [],
            "subject": req.subject,
            "html": req.html,
            **({"reply_to": reply_to} if reply_to else {}),
        })
        msg_id = result.get("id") if isinstance(result, dict) else None
        return QuoteEmailResponse(ok=True, id=msg_id)
    except Exception:
        raise HTTPException(status_code=502, detail="Email provider error")
