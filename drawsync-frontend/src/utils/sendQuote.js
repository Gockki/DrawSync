// src/utils/sendQuote.js

import { apiClient } from './apiClient'

export async function sendQuoteEmail({ to, cc = [], subject, html, replyTo = "noreply@mantox.fi" }) {
  const body = {
    to: Array.isArray(to) ? to : [to],
    cc,
    subject,
    html,
    reply_to: replyTo
  };

  const res = await fetch("http://localhost:8000/quotes/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    let msg = await res.text().catch(() => "");
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json(); // => { ok: true, id: "..." }
}
