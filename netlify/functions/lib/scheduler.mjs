// Computes week number since 2025-01-01 and determines post type per slot

const START_DATE = new Date('2025-01-01T00:00:00Z');

export function getWeekNumber() {
  const now = new Date();
  const diffMs = now.getTime() - START_DATE.getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
}

export function isLancamentoRelampago() {
  return getWeekNumber() % 3 === 0;
}

// Returns current day/period in BRT (UTC-3)
export function getBRTContext() {
  const now = new Date();
  // Offset UTC to BRT (UTC-3)
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  const dayIndex = brt.getUTCDay(); // 0=Sun, 1=Mon...6=Sat
  const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  return {
    dayIndex,
    dayName: days[dayIndex],
    weekNumber: getWeekNumber(),
    lancamentoRelampago: isLancamentoRelampago(),
  };
}

// Resolves which post category applies for a given slot
// Returns: 'valor' | 'engajamento' | 'venda' | 'lancamento'
export function resolvePostCategory(dayIndex, period, weekNumber) {
  // period: 'manhã' | 'noite'
  const isNoite = period === 'noite';

  // Monday (1)
  if (dayIndex === 1) {
    if (!isNoite) return 'valor';
    // Segunda noite alternates valor/engajamento per week parity
    return weekNumber % 2 === 0 ? 'valor' : 'engajamento';
  }
  // Tuesday (2)
  if (dayIndex === 2) return isNoite ? 'engajamento' : 'valor';
  // Wednesday (3)
  if (dayIndex === 3) return 'valor';
  // Thursday (4)
  if (dayIndex === 4) return isNoite ? 'engajamento' : 'valor';
  // Friday (5)
  if (dayIndex === 5) {
    if (!isNoite) return 'valor';
    return weekNumber % 3 === 0 ? 'lancamento' : 'valor';
  }
  // Saturday (6)
  if (dayIndex === 6) return isNoite ? 'venda' : 'valor';
  // Sunday (0)
  if (dayIndex === 0) return isNoite ? 'engajamento' : 'valor';

  return 'valor';
}

// Self-test when run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const ctx = getBRTContext();
  const morning = resolvePostCategory(ctx.dayIndex, 'manhã', ctx.weekNumber);
  const evening = resolvePostCategory(ctx.dayIndex, 'noite', ctx.weekNumber);
  console.log('BRT context:', ctx);
  console.log('Manhã:', morning);
  console.log('Noite:', evening);
}
