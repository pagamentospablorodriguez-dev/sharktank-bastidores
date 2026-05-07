// netlify/functions/post-manha.js
// Cron: 11:00 UTC = 08:00 horário de Brasília (UTC-3)

const { schedule } = require('@netlify/functions');
const { runPostEngine } = require('./lib/postEngine');

const handler = async (event) => {
  console.log('[SHARK-BOT] Cron MANHÃ disparado | UTC:', new Date().toISOString());

  try {
    const result = await runPostEngine();
    console.log('[SHARK-BOT] Post da manhã enviado com sucesso:', JSON.stringify(result));
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    console.error('[SHARK-BOT] Erro no post da manhã:', error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

// Cron: toda manhã às 11:00 UTC (08:00 Brasília)
exports.handler = schedule('0 11 * * *', handler);