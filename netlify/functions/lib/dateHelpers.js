// netlify/functions/lib/dateHelpers.js

/**
 * Retorna a data/hora atual no horário de Brasília (UTC-3)
 */
function getBrasiliaDate() {
  const now = new Date();
  // UTC-3
  const brasiliaOffset = -3 * 60;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + brasiliaOffset * 60000);
}

/**
 * Retorna o dia da semana em português
 */
function getDayNamePT(date) {
  const days = [
    'domingo',
    'segunda-feira',
    'terça-feira',
    'quarta-feira',
    'quinta-feira',
    'sexta-feira',
    'sábado',
  ];
  return days[date.getDay()];
}

/**
 * Retorna "manhã" ou "noite" baseado na hora
 * Manhã = 8h, Noite = 20h
 */
function getPeriod(date) {
  const hour = date.getHours();
  return hour < 12 ? 'manhã' : 'noite';
}

/**
 * Calcula em qual semana do ciclo estamos (0, 1 ou 2)
 * baseado na data de referência 01/01/2025.
 * A cada 3 semanas, a sexta noite vira Lançamento Relâmpago.
 * Semana 0 = semana do lançamento relâmpago
 */
function getWeekCycle(date) {
  const reference = new Date('2025-01-01T00:00:00-03:00');
  const diffMs = date.getTime() - reference.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7);
  return weekNumber % 3; // 0, 1, ou 2
}

/**
 * Decide se a sexta noite desta semana é Lançamento Relâmpago
 */
function isLancamentoRelampago(date) {
  const dayOfWeek = date.getDay(); // 5 = sexta
  const period = getPeriod(date);
  if (dayOfWeek !== 5 || period !== 'noite') return false;
  return getWeekCycle(date) === 0;
}

/**
 * Retorna o tipo de conteúdo esperado para este momento
 * baseado no calendário semanal fixo
 */
function getScheduledContentType(date) {
  const day = date.getDay(); // 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sab
  const period = getPeriod(date);

  // Verifica lançamento relâmpago primeiro
  if (day === 5 && period === 'noite' && isLancamentoRelampago(date)) {
    return 'LANÇAMENTO_RELÂMPAGO';
  }

  const calendar = {
    1: { manhã: 'VALOR', noite: 'VALOR_OU_ENGAJAMENTO' },
    2: { manhã: 'VALOR', noite: 'ENGAJAMENTO' },
    3: { manhã: 'VALOR', noite: 'VALOR' },
    4: { manhã: 'VALOR', noite: 'ENGAJAMENTO' },
    5: { manhã: 'VALOR', noite: 'VALOR' },
    6: { manhã: 'VALOR', noite: 'VENDA' },
    0: { manhã: 'VALOR', noite: 'ENGAJAMENTO' },
  };

  return calendar[day][period];
}

module.exports = {
  getBrasiliaDate,
  getDayNamePT,
  getPeriod,
  getWeekCycle,
  isLancamentoRelampago,
  getScheduledContentType,
};