// netlify/functions/test-post.js
// Endpoint HTTP para testar manualmente sem esperar o cron
// URL: https://SEU-SITE.netlify.app/.netlify/functions/test-post
// Proteção: requer header X-Test-Secret = TEST_SECRET (variável de ambiente)

const { runPostEngine } = require('./lib/postEngine');
const {
  getBrasiliaDate,
  getDayNamePT,
  getPeriod,
  getScheduledContentType,
  isLancamentoRelampago,
  getWeekCycle,
} = require('./lib/dateHelpers');

exports.handler = async (event) => {
  // Proteção básica via secret
  const secret = event.headers['x-test-secret'] || event.queryStringParameters?.secret;
  if (secret !== process.env.TEST_SECRET) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Não autorizado. Envie X-Test-Secret correto.' }),
    };
  }

  // Permite forçar uma data específica via query param para testes
  // Ex: ?forceDate=2025-03-01T20:00:00 (horário de Brasília)
  let testDate = null;
  if (event.queryStringParameters?.forceDate) {
    testDate = new Date(event.queryStringParameters.forceDate + '-03:00');
    if (isNaN(testDate.getTime())) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'forceDate inválido. Use formato: 2025-03-01T20:00:00' }),
      };
    }
  }

  const now = testDate || getBrasiliaDate();
  const dayNamePT = getDayNamePT(now);
  const period = getPeriod(now);
  const contentType = getScheduledContentType(now);
  const weekCycle = getWeekCycle(now);
  const lancamento = isLancamentoRelampago(now);

  console.log(`[SHARK-BOT] Teste manual | dia=${dayNamePT} | periodo=${period} | tipo=${contentType} | ciclo=${weekCycle} | lancamento=${lancamento}`);

  // Permite modo "dry-run" (apenas mostra o que seria gerado, sem enviar)
  if (event.queryStringParameters?.dryRun === 'true') {
    return {
      statusCode: 200,
      body: JSON.stringify({
        mode: 'DRY_RUN',
        dia: dayNamePT,
        period,
        contentType,
        weekCycle,
        isLancamentoRelampago: lancamento,
        message: 'Nenhum post enviado. Remova dryRun=true para enviar de verdade.',
      }),
    };
  }

  try {
    const result = await runPostEngine(testDate);
    return {
      statusCode: 200,
      body: JSON.stringify({ mode: 'REAL', ...result }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};