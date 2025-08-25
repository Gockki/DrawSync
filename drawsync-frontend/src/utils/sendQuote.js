// src/utils/sendQuote.js

// Lähetä aina JWT:n kanssa apiClientin kautta
import { apiClient } from './apiClient'

export async function sendQuoteEmail({ to, cc = [], subject, html, replyTo }) {
  const body = {
    to: Array.isArray(to) ? to : [to],
    cc,
    subject,
    html,
    ...(replyTo ? { reply_to: replyTo } : {}),
  }
  return apiClient.postJson('/quotes/send', body)
}

