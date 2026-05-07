// netlify/functions/lib/postEngine.js

const { generatePost, parseEnquete, extractMetadata } = require('./openai');
const { sendMessage, sendPoll } = require('./telegram');
const { logPost, logError } = require('./logger');
const {
  getBrasiliaDate,
  getDayNamePT,
  getPeriod,
  getScheduledContentType,
} = require('./dateHelpers');

/**
 * Executa o fluxo completo de geração e envio de um post.
 * Pode receber uma data específica para testes (opcional).
 */
async function runPostEngine(overrideDate = null) {
  const now = overrideDate || getBrasiliaDate();
  const dayNamePT = getDayNamePT(now);
  const period = getPeriod(now);
  const contentType = getScheduledContentType(now);

  console.log(`[SHARK-BOT] Iniciando post | dia=${dayNamePT} | periodo=${period} | tipo_esperado=${contentType}`);

  // 1. Gera conteúdo via GPT-4o mini
  let rawContent;
  try {
    rawContent = await generatePost(dayNamePT, period);
  } catch (err) {
    logError('generatePost', err);
    throw err;
  }

  // 2. Extrai metadados e texto limpo
  const meta = extractMetadata(rawContent);

  // 3. Verifica se é enquete (apenas para posts de ENGAJAMENTO)
  const isEngagementType = contentType === 'ENGAJAMENTO' || contentType === 'VALOR_OU_ENGAJAMENTO';
  const enqueteData = isEngagementType ? parseEnquete(rawContent) : null;

  let sendResult;
  let sentAs;

  if (enqueteData) {
    // 4a. Envia enquete
    try {
      sendResult = await sendPoll(enqueteData.pergunta, enqueteData.opcoes);
      sentAs = 'ENQUETE';
    } catch (err) {
      logError('sendPoll', err);
      throw err;
    }
  } else {
    // 4b. Envia mensagem de texto
    const postText = meta.postText || rawContent;
    try {
      sendResult = await sendMessage(postText);
      sentAs = 'MENSAGEM';
    } catch (err) {
      logError('sendMessage', err);
      throw err;
    }
  }

  // 5. Log do post enviado
  logPost({
    dia: meta.dia || dayNamePT,
    horario: meta.horario || period,
    tipo: meta.tipo || contentType,
    tema: meta.tema || '',
    conteudo: enqueteData ? enqueteData.pergunta : (meta.postText || rawContent),
    status: `enviado_como_${sentAs}`,
  });

  return {
    success: true,
    sentAs,
    dia: meta.dia || dayNamePT,
    horario: meta.horario || period,
    tipo: meta.tipo || contentType,
    tema: meta.tema || '',
    preview: (meta.postText || rawContent).slice(0, 100),
  };
}

module.exports = { runPostEngine };