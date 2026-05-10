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
 * Busca as empresas usadas nos últimos 7 dias.
 * Retorna array de strings, ex: ["Ring", "Bombas", "Scrub Daddy"]
 */
async function getRecentCompanies() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const isoDate = sevenDaysAgo.toISOString();

  const url = `${SUPABASE_URL}/rest/v1/post_logs?select=company_used&posted_at=gte.${isoDate}&company_used=not.is.null&company_used=neq.`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const err = await response.text();
    console.warn(`[SHARK-BOT] Supabase getRecentCompanies error ${response.status}: ${err}`);
    return []; // Falha silenciosa — melhor gerar sem histórico do que travar tudo
  }

  const rows = await response.json();

  // Filtra nulos/vazios e deduplica
  const companies = [...new Set(
    rows
      .map((r) => r.company_used)
      .filter((c) => c && c.trim() !== '')
  )];

  return companies;
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
    // Log do erro mas não joga exceção — o post já foi enviado, não pode reverter
    console.error(`[SHARK-BOT] Supabase savePostLog error ${response.status}: ${err}`);
    return false;
  }

  return true;
}

module.exports = { getRecentCompanies, savePostLog };
