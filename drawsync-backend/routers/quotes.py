from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from lib.email_provider import send_email


router = APIRouter(prefix="/quotes", tags=["quotes"])

class QuoteEmailRequest(BaseModel):
    to: List[EmailStr]
    subject: str
    html: str
    cc: Optional[List[EmailStr]] = None
    reply_to: Optional[EmailStr] = None
    pricing: Optional[Dict[str, Any]] = None
    product: Optional[Dict[str, Any]] = None

def build_html_from_data(pricing: Dict[str, Any], product: Dict[str, Any]) -> str:
    # Kevyt, mobiiliystävällinen HTML. Voidaan myöhemmin kaunistaa.
    tn = product.get("tuotenimi") or product.get("product_name") or "Tuote"
    tk = product.get("tuotekoodi") or product.get("product_code") or "-"
    total = pricing.get("total")
    coating = pricing.get("coating")
    variant = pricing.get("variant")
    m2 = pricing.get("surfaceAreaM2")
    delivery = pricing.get("deliveryTime")
    delivery_txt = f"{delivery['min']}-{delivery['max']} päivää" if isinstance(delivery, dict) else "7–14 päivää"

    return f"""
<!doctype html>
<html><body style="font:14px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial">
  <div style="max-width:640px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
    <h2 style="margin:0 0 16px">Tarjous</h2>
    <p style="margin:0 0 16px;color:#555">Hei! Tässä tarjous pyynnönne perusteella.</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:8px 0;color:#666">Tuotenimi</td><td style="padding:8px 0;text-align:right"><strong>{tn}</strong></td></tr>
      <tr><td style="padding:8px 0;color:#666">Tuotekoodi</td><td style="padding:8px 0;text-align:right">{tk}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Pinnoite</td><td style="padding:8px 0;text-align:right">{coating or "-"} / {variant or "-"}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Pinta-ala</td><td style="padding:8px 0;text-align:right">{(m2 or 0):.4f} m²</td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #eee;color:#333"><strong>Kokonaishinta (sis. ALV)</strong></td>
          <td style="padding:8px 0;border-top:1px solid #eee;text-align:right"><strong>{(total or 0):.2f} €</strong></td></tr>
    </table>

    <p style="margin:16px 0;color:#333"><strong>Arvioitu toimitusaika:</strong> {delivery_txt}</p>

    <p style="margin:16px 0;color:#666">Tarjous on voimassa 30 päivää. Kysythän rohkeasti, jos tarvitsette lisätietoja.</p>
    <p style="margin:24px 0 0">Ystävällisin terveisin,<br><strong>Mantox Solutions</strong></p>
  </div>
</body></html>
"""


@router.post("/send")
async def send_quote(req: QuoteEmailRequest):
    try:
        result = send_email(
            to=req.to,
            subject=req.subject,
            html=req.html,
            cc=req.cc,
            reply_to=req.reply_to,
        )
        return {"ok": True, "id": result.get("id")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))