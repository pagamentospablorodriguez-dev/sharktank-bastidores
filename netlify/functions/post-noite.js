// netlify/functions/post-noite.js
// Cron: 23:00 UTC = 20:00 horário de Brasília (UTC-3)

const { schedule } = require('@netlify/functions');
const { runPostEngine } = require('./lib/postEngine');

const handler = async (event) => {
  console.log('[SHARK-BOT] Cron NOITE disparado | UTC:', new Date().toISOString());

  try {
    const result = await runPostEngine();
    console.log('[SHARK-BOT] Post da noite enviado com sucesso:', JSON.stringify(result));
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    console.error('[SHARK-BOT] Erro no post da noite:', error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

// Cron: toda noite às 23:00 UTC (20:00 Brasília)
exports.handler = schedule('0 23 * * *', handler);