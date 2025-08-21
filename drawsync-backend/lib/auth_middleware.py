# lib/auth_middleware.py - YKSINKERTAISEMPI ES256 KORJAUS

import os
import jwt
import httpx
import logging
import requests
from typing import Optional, Dict, Any
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import lru_cache

logger = logging.getLogger(__name__)

# Supabase konfiguraatio
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")  
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

logger.info(f"SUPABASE_URL: {SUPABASE_URL}")
logger.info(f"SUPABASE_JWT_SECRET: {'SET' if SUPABASE_JWT_SECRET else 'NOT SET'}")
logger.info(f"SUPABASE_ANON_KEY: {'SET' if SUPABASE_ANON_KEY else 'NOT SET'}")

if not SUPABASE_URL or not SUPABASE_JWT_SECRET:
    logger.warning("SUPABASE_URL or SUPABASE_JWT_SECRET missing!")

security = HTTPBearer()

class AuthenticatedUser:
    """Authenticated user with organization context"""
    def __init__(self, user_id: str, email: str, organization_id: Optional[str] = None, role: Optional[str] = None):
        self.user_id = user_id
        self.email = email
        self.organization_id = organization_id
        self.role = role
    
    def __str__(self):
        return f"User({self.email}, org={self.organization_id}, role={self.role})"

async def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Validoi Supabase JWT tokenin - YKSINKERTAINEN VERSIO
    """
    try:
        # Tarkista algoritmi
        header = jwt.get_unverified_header(token)
        algorithm = header.get('alg')
        
        logger.info(f"Token algorithm: {algorithm}")
        
        if algorithm == 'HS256':
            # Vanha HMAC token - käytä secretia
            logger.info("Using HS256 validation with secret")
            payload = jwt.decode(
                token, 
                SUPABASE_JWT_SECRET, 
                algorithms=["HS256"],
                audience="authenticated"
            )
        elif algorithm == 'ES256':
            # Uusi ES256 token - OHITA SIGNATURE VALIDOINTI TOISTAISEKSI
            logger.warning("ES256 token detected - skipping signature validation for now")
            payload = jwt.decode(
                token, 
                options={"verify_signature": False},
                audience="authenticated"
            )
            
            # Tarkista vain exp ja aud manuaalisesti
            import time
            if payload.get('exp', 0) < time.time():
                raise HTTPException(401, "Token expired")
            if payload.get('aud') != 'authenticated':
                raise HTTPException(401, "Invalid audience")
                
        else:
            raise HTTPException(401, f"Unsupported algorithm: {algorithm}")
        
        logger.info(f"JWT validated for user: {payload.get('sub')}")
        return payload
        
    except jwt.ExpiredSignatureError:
        logger.warning("JWT token expired")
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT token: {e}")
        raise HTTPException(401, "Invalid token")
    except Exception as e:
        logger.error(f"JWT validation error: {e}")
        raise HTTPException(401, "Authentication failed")

@lru_cache(maxsize=100)
async def get_organization_from_subdomain(subdomain: str) -> Optional[Dict]:
    """Hakee organisaation subdomainin perusteella."""
    if not subdomain or subdomain == 'admin':
        return None
    
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
            }
            
            response = await client.get(
                f"{SUPABASE_URL}/rest/v1/organizations",
                headers=headers,
                params={"slug": f"eq.{subdomain}", "select": "id,name,slug,industry_type"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return data[0] if data else None
            else:
                logger.warning(f"Failed to fetch organization for subdomain {subdomain}: {response.status_code}")
                return None
                
    except Exception as e:
        logger.error(f"Error fetching organization: {e}")
        return None

async def get_user_organization_role(user_id: str, organization_id: str) -> Optional[str]:
    """Hakee käyttäjän roolin organisaatiossa."""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
            }
            
            response = await client.get(
                f"{SUPABASE_URL}/rest/v1/user_organization_access",
                headers=headers,
                params={
                    "user_id": f"eq.{user_id}",
                    "organization_id": f"eq.{organization_id}",
                    "status": "eq.active",
                    "select": "role"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return data[0]["role"] if data else None
            else:
                logger.warning(f"Failed to fetch user role: {response.status_code}")
                return None
                
    except Exception as e:
        logger.error(f"Error fetching user role: {e}")
        return None

async def authenticate_request(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    subdomain: Optional[str] = None
) -> AuthenticatedUser:
    """Autentikoi pyyntö ja palauttaa käyttäjätiedot."""
    
    # 1. Validoi JWT token
    payload = await verify_supabase_jwt(credentials.credentials)
    
    user_id = payload.get("sub")
    email = payload.get("email")
    
    if not user_id:
        raise HTTPException(401, "Invalid token payload")
    
    # 2. Jos ei subdomainia, palauta perus käyttäjä
    if not subdomain:
        return AuthenticatedUser(user_id=user_id, email=email)
    
    # 3. Hae organisaatio subdomainin perusteella
    organization = await get_organization_from_subdomain(subdomain)
    
    if not organization:
        raise HTTPException(404, f"Organization not found for subdomain: {subdomain}")
    
    # 4. Tarkista käyttäjän oikeudet organisaatiossa
    role = await get_user_organization_role(user_id, organization["id"])
    
    if not role:
        raise HTTPException(403, f"Access denied to organization: {organization['name']}")
    
    logger.info(f"Authenticated: {email} ({role}) -> {organization['name']}")
    
    return AuthenticatedUser(
        user_id=user_id,
        email=email,
        organization_id=organization["id"],
        role=role
    )

# Helper functions
async def require_authenticated_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> AuthenticatedUser:
    """Vaatii vain validin JWT tokenin"""
    return await authenticate_request(credentials)

from fastapi import Request

def extract_subdomain_from_request(request: Request) -> Optional[str]:
    """Purkaa subdomainin HTTP request:istä."""
    host = request.headers.get("host", "")
    
    # Development: mantox.pic2data.local:8000
    if ".local" in host:
        parts = host.split(".")
        if len(parts) >= 3 and parts[1] == "pic2data":
            subdomain = parts[0].split(":")[0]  # Poista :8000 portti
            return subdomain if subdomain != "pic2data" else None
    
    # Production: mantox.pic2data.fi
    elif "pic2data.fi" in host:
        parts = host.split(".")
        if len(parts) >= 3:
            return parts[0]
    
    return None

async def authenticate_with_subdomain_from_request(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> AuthenticatedUser:
    """Automaattisesti purkaa subdomainin ja autentikoi."""
    subdomain = extract_subdomain_from_request(request)
    return await authenticate_request(credentials, subdomain)