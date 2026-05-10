// netlify/functions/lib/postEngine.js

const { generatePost, parseEnquete, extractMetadata } = require('./openai');
const { sendMessage, sendPoll } = require('./telegram');
const { logPost, logError } = require('./logger');
const { getRecentContext, savePostLog } = require('./supabase');
const { getMandatoryTopic } = require('./topicRotation');
const {
  getBrasiliaDate,
  getDayNamePT,
  getPeriod,
  getScheduledContentType,
  getWeekCycle,
} = require('./dateHelpers');

/**
 * Executa o fluxo completo de geração e envio de um post.
 */
async function runPostEngine(overrideDate = null) {
  const now = overrideDate || getBrasiliaDate();
  const dayNamePT = getDayNamePT(now);
  const period = getPeriod(now);
  const contentType = getScheduledContentType(now);
  const weekNumber = getWeekCycle(now);
  const dayOfWeek = now.getDay();

  console.log(`[SHARK-BOT] Iniciando post | dia=${dayNamePT} | periodo=${period} | tipo_esperado=${contentType}`);

  // 1. Calcula tema obrigatório por rotação determinística (código decide, não o GPT)
  const { tema: mandatoryTopic, instrucaoAdicional: mandatoryInstruction } =
    getMandatoryTopic(now, contentType, period, dayOfWeek);

  if (mandatoryTopic) {
    console.log(`[SHARK-BOT] Tema obrigatório injetado: "${mandatoryTopic}"`);
  }

  // 2. Busca contexto recente no Supabase (empresas + temas) — memória entre chamadas
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

  // 3. Gera conteúdo via GPT-4o mini
  let rawContent;
  try {
    rawContent = await generatePost(
      dayNamePT,
      period,
      recentCompanies,
      recentThemes,
      mandatoryTopic,
      mandatoryInstruction
    );
  } catch (err) {
    logError('generatePost', err);
    throw err;
  }

  // 4. Extrai metadados, texto limpo e empresa detectada
  const meta = extractMetadata(rawContent);

  // 5. Verifica se é enquete (apenas para ENGAJAMENTO)
  const isEngagementType = contentType === 'ENGAJAMENTO' || contentType === 'VALOR_OU_ENGAJAMENTO';
  const enqueteData = isEngagementType ? parseEnquete(rawContent) : null;

  let sendResult;
  let sentAs;

  if (enqueteData) {
    try {
      sendResult = await sendPoll(enqueteData.pergunta, enqueteData.opcoes);
      sentAs = 'ENQUETE';
    } catch (err) {
      logError('sendPoll', err);
      throw err;
    }
  } else {
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

  // Tema salvo: para enquete = pergunta literal; para post = TEMA do metadado ou tema obrigatório
  const themeSaved = enqueteData
    ? enqueteData.pergunta
    : (meta.tema || mandatoryTopic || '');

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
    tema: themeSaved,
    conteudo: conteudoFinal,
    status: `enviado_como_${sentAs}`,
  });

  return {
    success: true,
    sentAs,
    dia: meta.dia || dayNamePT,
    horario: meta.horario || period,
    tipo: meta.tipo || contentType,
    tema: themeSaved,
    company: meta.company || null,
    mandatoryTopic,
    recentCompaniesUsed: recentCompanies,
    recentThemesUsed: recentThemes,
    preview: conteudoFinal.slice(0, 100),
  };
}

module.exports = { runPostEngine };
