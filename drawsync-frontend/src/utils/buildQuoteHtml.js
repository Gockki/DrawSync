// src/utils/buildQuoteHtml.js
export function buildQuoteHtml({ pricing, data }) {
  const pd = data?.perustiedot || {};
  const name = pd.tuotenimi || pd.tuotekoodi || "Tuote";
  const material = pd.materiaali ? ` (${pd.materiaali})` : "";
  const surface = `${pricing.surfaceAreaCm2} cm² (${pricing.surfaceAreaM2} m²)`;
  const delivery = pricing?.deliveryTime
    ? `${pricing.deliveryTime.min}-${pricing.deliveryTime.max} päivää`
    : "7–14 päivää";

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;color:#111;">
    <h2 style="margin:0 0 8px">Tarjous — ${name}${material}</h2>
    <p style="margin:0 0 16px">Hei! Tässä AI-analyysiin perustuva hinta-arvio.</p>

    <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;max-width:560px">
      <tr>
        <td style="padding:8px 0;color:#555">Palvelu</td>
        <td style="padding:8px 0"><b>${pricing.coating} — ${pricing.variant}</b></td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#555">Pinta-ala</td>
        <td style="padding:8px 0">${surface}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#555">Asetuskustannus</td>
        <td style="padding:8px 0">${pricing.setupCost.toFixed(2)} €</td>
      </tr>
      ${pricing.pretreatmentCost > 0 ? `
      <tr>
        <td style="padding:8px 0;color:#555">Esikäsittelyt</td>
        <td style="padding:8px 0">${pricing.pretreatmentCost.toFixed(2)} €</td>
      </tr>` : ""}
      <tr>
        <td style="padding:8px 0;color:#555">${pricing.coating}</td>
        <td style="padding:8px 0">${pricing.coatingCost.toFixed(2)} € (${pricing.coatingPricePerM2} €/m²)</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-top:1px solid #eee;color:#111"><b>Välisumma</b></td>
        <td style="padding:8px 0;border-top:1px solid #eee"><b>${pricing.subtotal.toFixed(2)} €</b></td>
      </tr>
      ${pricing.batchDiscount > 0 ? `
      <tr>
        <td style="padding:8px 0;color:#0a7">Sarjakoko-alennus</td>
        <td style="padding:8px 0">-${pricing.batchDiscount.toFixed(2)} €</td>
      </tr>` : ""}
      <tr>
        <td style="padding:8px 0;color:#555">ALV 24%</td>
        <td style="padding:8px 0">${pricing.vat.toFixed(2)} €</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-top:2px solid #111;color:#111"><b>Kokonaishinta</b></td>
        <td style="padding:10px 0;border-top:2px solid #111"><b>${pricing.total.toFixed(2)} €</b></td>
      </tr>
    </table>

    <p style="margin:16px 0 6px">Arvioitu toimitusaika: ${delivery}</p>
    <p style="margin:0 0 16px">Maksuehto: 14 pv netto • Tarjous voimassa 30 päivää</p>

    ${Array.isArray(data?.huomiot) && data.huomiot.length ? `
      <p style="margin:0 0 6px"><b>Huomiot:</b></p>
      <ul style="margin:0 0 16px;padding-left:18px;color:#444">
        ${data.huomiot.map(h => `<li>${String(h)}</li>`).join("")}
      </ul>
    ` : ""}

    <p style="margin:16px 0 0">Ystävällisin terveisin,<br/>Mantox Solutions</p>
  </div>
  `;
}
