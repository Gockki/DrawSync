from __future__ import annotations

import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from lib.auth_middleware import require_user, AuthenticatedUser

try:
    import resend  # type: ignore
except Exception:
    resend = None

router = APIRouter(prefix="/invitations", tags=["invitations"])

class InvitationEmailRequest(BaseModel):
    invitation_token: str
    recipient_email: EmailStr
    organization_name: str
    inviter_name: Optional[str] = None
    role: str = "user"

class InvitationEmailResponse(BaseModel):
    ok: bool
    id: Optional[str] = None
    message: Optional[str] = None

def _ensure_resend_ready() -> None:
    if resend is None:
        raise HTTPException(status_code=500, detail="Email provider not available")
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="RESEND_API_KEY not configured")
    resend.api_key = api_key

def _from_header() -> str:
    from_email = os.getenv("FROM_EMAIL", "").strip()
    from_name = os.getenv("FROM_NAME", "").strip()
    if from_email:
        return f"{from_name} <{from_email}>" if from_name else from_email
    return "Wisuron Analytics <noreply@wisuron.fi>"

def _build_invitation_html(req: InvitationEmailRequest, invite_url: str) -> str:
    """Build HTML email for invitation"""
    
    role_text = "admin" if req.role == "admin" else "team member"
    
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation to {req.organization_name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">
                You're invited to join
            </h1>
            <h2 style="color: white; margin: 10px 0 0 0; font-size: 32px; font-weight: 600;">
                {req.organization_name}
            </h2>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
            <p style="font-size: 18px; margin-bottom: 24px; color: #4a5568;">
                {req.inviter_name or "Someone"} has invited you to join their team on Wisuron Analytics as a {role_text}.
            </p>
            
            <div style="background: #f7fafc; border-left: 4px solid #4299e1; padding: 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                <h3 style="margin: 0 0 12px 0; color: #2d3748; font-size: 16px;">
                    What you'll get access to:
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #4a5568;">
                    <li>AI-powered drawing analysis</li>
                    <li>Project management and collaboration</li>
                    <li>Quote generation and customer management</li>
                    <li>Organization-specific industry tools</li>
                </ul>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
                <a href="{invite_url}" 
                   style="display: inline-block; background: #4299e1; color: white; text-decoration: none; 
                          padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;
                          box-shadow: 0 4px 14px 0 rgba(66, 153, 225, 0.39);">
                    Accept Invitation & Join Team
                </a>
            </div>
            
            <p style="color: #718096; font-size: 14px; margin-top: 30px;">
                This invitation will expire in 7 days. If you're having trouble with the button above, 
                copy and paste this URL into your browser:
            </p>
            <p style="background: #edf2f7; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 14px; word-break: break-all; color: #4a5568;">
                {invite_url}
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #edf2f7; padding: 20px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="margin: 0; color: #718096; font-size: 12px;">
                This invitation was sent by {req.organization_name} via Wisuron Analytics
            </p>
            <p style="margin: 8px 0 0 0; color: #a0aec0; font-size: 11px;">
                If you weren't expecting this invitation, you can safely ignore this email.
            </p>
        </div>
    </div>
</body>
</html>
"""

def _get_invite_url(token: str, organization_slug: Optional[str] = None) -> str:
    """Generate invitation URL with proper subdomain"""
    if organization_slug:
        return f"https://{organization_slug}.wisuron.fi/join?token={token}"
    else:
        return f"https://wisuron.fi/join?token={token}"

@router.post("/send", response_model=InvitationEmailResponse)
async def send_invitation_email(
    req: InvitationEmailRequest,
    user: AuthenticatedUser = Depends(require_user),
) -> InvitationEmailResponse:
    
    if not req.recipient_email:
        raise HTTPException(status_code=422, detail="Recipient email is required")
    if not req.invitation_token:
        raise HTTPException(status_code=422, detail="Invitation token is required")
    if not req.organization_name:
        raise HTTPException(status_code=422, detail="Organization name is required")

    _ensure_resend_ready()

    # Generate invitation URL with organization subdomain
    invite_url = _get_invite_url(req.invitation_token, user.org_slug)
    
    # Build HTML email
    html_content = _build_invitation_html(req, invite_url)
    
    # Email subject
    subject = f"Join {req.organization_name} on Wisuron Analytics"
    
    from_header = _from_header()
    
    try:
        result = resend.Emails.send({
            "from": from_header,
            "to": [req.recipient_email],
            "subject": subject,
            "html": html_content,
        })
        
        msg_id = result.get("id") if isinstance(result, dict) else None
        return InvitationEmailResponse(ok=True, id=msg_id)
        
    except Exception as e:
        print(f"Failed to send invitation email: {e}")
        raise HTTPException(status_code=502, detail="Email provider error")