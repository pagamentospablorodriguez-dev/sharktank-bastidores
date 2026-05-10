// netlify/functions/lib/postEngine.js

const { generatePost, parseEnquete, extractMetadata } = require('./openai');
const { sendMessage, sendPoll } = require('./telegram');
const { logPost, logError } = require('./logger');
const { getRecentContext, savePostLog } = require('./supabase');
const {
  getBrasiliaDate,
  getDayNamePT,
  getPeriod,
  getScheduledContentType,
  getWeekCycle,
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
  const weekNumber = getWeekCycle(now);

  console.log(`[SHARK-BOT] Iniciando post | dia=${dayNamePT} | periodo=${period} | tipo_esperado=${contentType}`);

  // 1. Busca contexto recente no Supabase (empresas + temas)
  let recentCompanies = [];
  let recentThemes = [];
  try {
    const ctx = await getRecentContext();
    recentCompanies = ctx.companies;
    recentThemes = ctx.themes;
    console.log(`[SHARK-BOT] Empresas recentes (${recentCompanies.length}): ${recentCompanies.join(', ') || 'nenhuma'}`);
    console.log(`[SHARK-BOT] Temas recentes (${recentThemes.length}): ${recentThemes.join(', ') || 'nenhum'}`);
  } catch (err) {
    console.warn('[SHARK-BOT] Não foi possível buscar contexto recente:', err.message);
  }

  // 2. Gera conteúdo via GPT-4o mini (com empresas E temas recentes)
  let rawContent;
  try {
    rawContent = await generatePost(dayNamePT, period, recentCompanies, recentThemes);
  } catch (err) {
    logError('generatePost', err);
    throw err;
  }

  // 3. Extrai metadados, texto limpo e empresa detectada
  const meta = extractMetadata(rawContent);

  // 4. Verifica se é enquete (apenas para posts de ENGAJAMENTO)
  const isEngagementType = contentType === 'ENGAJAMENTO' || contentType === 'VALOR_OU_ENGAJAMENTO';
  const enqueteData = isEngagementType ? parseEnquete(rawContent) : null;

  let sendResult;
  let sentAs;

  if (enqueteData) {
    // 5a. Envia enquete
    try {
      sendResult = await sendPoll(enqueteData.pergunta, enqueteData.opcoes);
      sentAs = 'ENQUETE';
    } catch (err) {
      logError('sendPoll', err);
      throw err;
    }
  } else {
    // 5b. Envia mensagem de texto
    const postText = meta.postText || rawContent;
    try {
      sendResult = await sendMessage(postText);
      sentAs = 'MENSAGEM';
    } catch (err) {
      logError('sendMessage', err);
      throw err;
    }
  }

  const conteudoFinal = enqueteData
    ? enqueteData.pergunta
    : (meta.postText || rawContent);

  // O tema salvo é: para enquete, a pergunta; para post normal, o TEMA do metadado
  const themeSaved = enqueteData
    ? enqueteData.pergunta
    : (meta.tema || '');

  // 6. Salva no Supabase
  try {
    const saved = await savePostLog({
      day: meta.dia || dayNamePT,
      period,
      postType: meta.tipo || contentType,
      contentPreview: conteudoFinal,
      weekNumber,
      isPoll: sentAs === 'ENQUETE',
      companyUsed: meta.company || null,
      theme: themeSaved,
      telegramResponse: sendResult || null,
    });
    console.log(`[SHARK-BOT] Supabase save: ${saved ? 'OK' : 'FALHOU'}`);
  } catch (err) {
    console.error('[SHARK-BOT] Erro ao salvar no Supabase:', err.message);
  }

  // 7. Log local
  logPost({
    dia: meta.dia || dayNamePT,
    horario: meta.horario || period,
    tipo: meta.tipo || contentType,
    tema: meta.tema || '',
    conteudo: conteudoFinal,
    status: `enviado_como_${sentAs}`,
  });

  return {
    success: true,
    sentAs,
    dia: meta.dia || dayNamePT,
    horario: meta.horario || period,
    tipo: meta.tipo || contentType,
    tema: meta.tema || '',
    company: meta.company || null,
    recentCompaniesUsed: recentCompanies,
    recentThemesUsed: recentThemes,
    preview: conteudoFinal.slice(0, 100),
  };
}

module.exports = { runPostEngine };
