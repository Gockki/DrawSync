from __future__ import annotations
import os
from dataclasses import dataclass
from typing import Optional

from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import jwt
from jwt import PyJWKClient, InvalidTokenError

security = HTTPBearer(auto_error=True)

@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: str
    email: Optional[str]
    role: str
    org_slug: Optional[str]

# ---------------------------
# Helpers
# ---------------------------

_JWKS_CLIENT: Optional[PyJWKClient] = None

def _get_jwks_client() -> PyJWKClient:
    global _JWKS_CLIENT
    jwks_url = os.getenv("SUPABASE_JWKS_URL", "").strip()
    if not jwks_url:
        raise HTTPException(status_code=500, detail="Auth misconfigured: SUPABASE_JWKS_URL not set for asymmetric token")
    if _JWKS_CLIENT is None:
        _JWKS_CLIENT = PyJWKClient(jwks_url)
    return _JWKS_CLIENT

def _org_from_host(host: Optional[str]) -> Optional[str]:
    if not host:
        return None
    host = host.split(":", 1)[0].lower()
    for suf in (".app.drawsync.fi", ".staging.app.drawsync.fi"):
        if host.endswith(suf):
            return host[:-len(suf)] or None
    if host in {"localhost", "127.0.0.1"}:
        return None
    return None

def _role_from_payload(payload: dict) -> str:
    return str(payload.get("role") or (payload.get("app_metadata") or {}).get("role") or "authenticated")

def _ctx_from_payload(payload: dict, host: Optional[str]) -> AuthenticatedUser:
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid token (no sub)")
    return AuthenticatedUser(
        user_id=str(sub),
        email=payload.get("email"),
        role=_role_from_payload(payload),
        org_slug=_org_from_host(host),
    )

# ---------------------------
# Decoders
# ---------------------------

ASYM_ALGS = {"RS256","RS384","RS512","ES256","ES384","ES512","PS256","PS384","PS512","EdDSA"}
HS_ALGS   = {"HS256","HS384","HS512"}

def _decode_asymmetric_jwks(token: str, alg: str) -> dict:
    key = _get_jwks_client().get_signing_key_from_jwt(token).key
    iss = os.getenv("SUPABASE_ISS") or None
    aud = (os.getenv("SUPABASE_AUD") or "").strip() or None
    return jwt.decode(
        token,
        key,
        algorithms=[alg],
        issuer=iss if iss else None,               # verify only if provided
        audience=aud if aud else None,             # verify only if provided
        options={"require": ["exp", "iat", "sub"], "verify_aud": bool(aud)},
        leeway=60,
    )

def _decode_hs_secret(token: str, alg: str) -> dict:
    secret = os.getenv("SUPABASE_JWT_SECRET", "").strip()
    if not secret:
        raise HTTPException(status_code=500, detail="Auth misconfigured: SUPABASE_JWT_SECRET not set for HS token")
    # HS: älä pakota iss/aud devissä – Supabasen asetukset vaihtelevat
    return jwt.decode(
        token,
        secret,
        algorithms=[alg],
        options={"require": ["exp", "iat", "sub"], "verify_aud": False, "verify_iss": False},
        leeway=60,
    )

def _decode_by_alg(token: str) -> dict:
    try:
        header = jwt.get_unverified_header(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token header")

    alg = (header.get("alg") or "").upper()

    if alg in ASYM_ALGS:
        try:
            return _decode_asymmetric_jwks(token, alg)
        except Exception:
            # Pidetään virhe geneerisenä
            raise HTTPException(status_code=401, detail="Invalid or expired token")
    elif alg in HS_ALGS:
        try:
            return _decode_hs_secret(token, alg)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
    else:
        raise HTTPException(status_code=401, detail="Unsupported token algorithm")

# ---------------------------
# Public dependencies
# ---------------------------

async def require_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthenticatedUser:
    token = credentials.credentials  # HTTPBearer: pelkkä token
    try:
        payload = _decode_by_alg(token)
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = _ctx_from_payload(payload, request.headers.get("host"))
    request.state.auth = user
    return user

async def require_admin(user: AuthenticatedUser = Depends(require_user)) -> AuthenticatedUser:
    if user.role not in {"admin", "org_admin"}:
        raise HTTPException(status_code=403, detail="Admin only")
    return user
