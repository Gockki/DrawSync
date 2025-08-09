# drawsync-backend/lib/email_provider.py
import os
import logging
import resend

log = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")
FROM_NAME = os.getenv("FROM_NAME", "Mantox Solutions")
RESEND_FROM = os.getenv("RESEND_FROM") or f"{FROM_NAME} <{FROM_EMAIL}>"

if not RESEND_API_KEY:
    log.warning("RESEND_API_KEY puuttuu ympäristöstä")

resend.api_key = RESEND_API_KEY

def send_email(*, to, subject, html, cc=None, reply_to=None):
    """
    Yksinkertainen Resend-lähetys.
    Huom: jos FROM_EMAIL ei ole verifioidussa domainissa, Resend hylkää pyynnön.
    Testaa silloin: RESEND_FROM='Acme <onboarding@resend.dev>'
    """
    if not RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY missing")

    payload = {
        "from": RESEND_FROM,   # esim "Mantox Solutions <jere@mantox.fi>"
        "to": to,              # list[str]
        "subject": subject,
        "html": html,
    }
    if cc:
        payload["cc"] = cc
    if reply_to:
        payload["reply_to"] = reply_to

    log.info("Sending email via Resend: to=%s subject=%s", to, subject)
    try:
        result = resend.Emails.send(payload)  # returns dict with "id"
        log.info("Resend ok: %s", result)
        return result
    except Exception as e:
        log.exception("Resend failed")
        # Kuplautetaan ylös, router muuntaa 4xx/5xx vastaukseksi
        raise
