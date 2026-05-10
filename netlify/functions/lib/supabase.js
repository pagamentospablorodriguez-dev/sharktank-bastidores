// netlify/functions/lib/supabase.js

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getHeaders() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
  }
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Prefer': 'return=minimal',
  };
}

/**
 * Busca empresas usadas e temas usados nos últimos 7 dias.
 * Retorna { companies: string[], themes: string[] }
 */
async function getRecentContext() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const isoDate = sevenDaysAgo.toISOString();

  const url = `${SUPABASE_URL}/rest/v1/post_logs?select=company_used,theme&posted_at=gte.${encodeURIComponent(isoDate)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const err = await response.text();
    console.warn(`[SHARK-BOT] Supabase getRecentContext error ${response.status}: ${err}`);
    return { companies: [], themes: [] };
  }

  const rows = await response.json();

  const companies = [...new Set(
    rows.map((r) => r.company_used).filter((c) => c && c.trim() !== '')
  )];

  const themes = [...new Set(
    rows.map((r) => r.theme).filter((t) => t && t.trim() !== '')
  )];

  return { companies, themes };
}

/**
 * Salva o log do post enviado no Supabase.
 */
async function savePostLog({
  day,
  period,
  postType,
  contentPreview,
  weekNumber,
  isPoll,
  companyUsed,
  theme,
  telegramResponse,
}) {
  const url = `${SUPABASE_URL}/rest/v1/post_logs`;

  const body = {
    day,
    period,
    post_type: postType,
    content_preview: (contentPreview || '').slice(0, 100),
    week_number: weekNumber,
    is_poll: isPoll,
    company_used: companyUsed || null,
    theme: theme || null,
    telegram_response: telegramResponse || null,
    posted_at: new Date().toISOString(),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`[SHARK-BOT] Supabase savePostLog error ${response.status}: ${err}`);
    return false;
  }

  return true;
}

module.exports = { getRecentContext, savePostLog };
