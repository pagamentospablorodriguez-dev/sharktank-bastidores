// netlify/functions/lib/topicRotation.js
//
// Rotação determinística de temas e empresas baseada em data.
// O código decide o tema — o GPT só executa.

// TEMAS para TIPO 2 (Lição de Negócio) — segunda manhã e sexta manhã
// 18 temas distintos, nunca se repetem na mesma semana
const TIPO2_TEMAS = [
  'CAC (Custo de Aquisição de Cliente)',
  'LTV (Lifetime Value)',
  'margem bruta',
  'ponto de equilíbrio',
  'precificação e mark-up',
  'ticket médio',
  'recorrência e receita previsível',
  'churn (taxa de cancelamento)',
  'custo fixo vs custo variável',
  'valuation (como precificar uma empresa)',
  'canal de vendas e distribuição',
  'modelo freemium',
  'alavancagem operacional',
  'contribuição marginal',
  'sazonalidade e fluxo de caixa',
  'escala e quando escalar',
  'produto mínimo viável (MVP)',
  'diferenciação e posicionamento de marca',
];

// TEMAS para TIPO 5 (Número Impressionante) — quarta noite e sábado manhã
const TIPO5_TEMAS = [
  'Scrub Daddy',
  'Ring',
  'Kodiak Cakes',
  'Tipsy Elves',
  'Simply Fit Board',
  'Cousins Maine Lobster',
  'Tower Paddle Boards',
  'Baked by Melissa',
  'Groovebook',
  'Bantam Bagels',
  'Pipcorn',
  'LuminAID',
  'Bottle Breacher',
  'Sand Cloud',
  'Brightwheel',
  'The Bouqs',
  'Barnana',
  'Hammitt',
  'ReadeREST',
  'Copa Di Vino',
  'Wicked Good Cupcakes',
  'Talbott Teas',
];

// TEMAS para enquetes TIPO 4 (terça noite e domingo noite)
const ENQUETE_TEMAS = [
  'Você tem uma ideia de negócio mas ainda não começou?',
  'Qual é o seu maior obstáculo para empreender hoje?',
  'Você prefere negócio físico ou digital?',
  'Qual modelo de negócio mais te interessa?',
  'Você já tentou empreender antes?',
  'O que te impede de começar um negócio agora?',
  'Qual tubarão você mais admira no Shark Tank?',
  'Quanto tempo por semana você dedica a aprender sobre negócios?',
  'Qual é o seu maior medo ao abrir um negócio?',
  'O que você faria com R$50 mil para investir em um negócio?',
  'Qual setor você escolheria para empreender?',
  'Você acredita que dá pra começar um negócio sem dinheiro?',
  'Qual desses negócios do Shark Tank você compraria hoje?',
  'O que mais te atrai no mundo do empreendedorismo?',
  'Você já teve uma ideia que viu alguém executar depois?',
  'Qual é a maior lição que o Shark Tank te ensinou?',
];

// TEMAS para TIPO 4 SEM enquete (segunda noite e quinta noite)
const ENGAJAMENTO_TEMAS = [
  'quem age aprende mais rápido do que quem estuda',
  'a diferença entre empreendedor e empregado não é risco — é modelo mental',
  'negócio ruim com distribuição boa bate negócio bom sem distribuição',
  'a maioria das pessoas tem medo de começar pequeno, mas começa grande e quebra',
  'o maior erro de precificação é cobrar pelo tempo, não pelo resultado',
  'ideia não vale nada — execução é tudo',
  'você não precisa de investimento para começar, precisa de cliente',
  'o tubarão não investe no produto, investe no empreendedor',
  'negócio sem margem não é negócio, é emprego caro',
  'quem não conhece seu CAC está trabalhando no escuro',
  'o mercado não recompensa o melhor produto, recompensa o mais distribuído',
  'receita recorrente é o que separa negócio de projeto',
];

// TÉCNICAS DE VENDA para TIPO 6 e TIPO 7 — alterna por semana
const VENDA_TECNICAS = [
  {
    id: 'A',
    nome: 'DOR + SOLUÇÃO',
    instrucao: 'Abre identificando dor concreta de ver dinheiro passar enquanto trabalha muito e ganha pouco. Agita por 2 parágrafos específicos e curtos. Apresenta o Shark Method como fim dessa dor — sem mencionar preço.',
  },
  {
    id: 'B',
    nome: 'CONTRASTE DE IDENTIDADE',
    instrucao: 'Abre com "Tem dois tipos de pessoa que assiste Shark Tank." Descreve quem só observa e quem age — de forma específica, não clichê. Shark Method é pra quem decide agir.',
  },
  {
    id: 'C',
    nome: 'REVELAÇÃO + PADRÃO',
    instrucao: 'Abre prometendo revelar o padrão exato que faz negócios simples gerarem dinheiro. Entrega uma mini revelação concreta no segundo parágrafo (ex: "o padrão é X"). Shark Method como onde está o método completo.',
  },
  {
    id: 'D',
    nome: 'NÚMERO CHOCANTE + CONEXÃO',
    instrucao: 'Abre com número real impressionante de empresa do Shark Tank (ex: "$250 milhões vendendo esponja"). Segundo parágrafo conecta o número ao padrão. Terceiro parágrafo: esse padrão está documentado no Shark Method.',
  },
  {
    id: 'E',
    nome: 'AUTORIDADE + TRANSFERÊNCIA',
    instrucao: 'Abre com números reais do Pablo: 11 anos, 320 milhões de visitas, múltiplos negócios gerando renda. Segundo parágrafo conecta essa autoridade ao método. "O que funcionou por 11 anos está aqui."',
  },
  {
    id: 'F',
    nome: 'CUSTO DA INAÇÃO',
    instrucao: 'Abre mostrando o custo concreto de não agir — não em dinheiro do produto, mas em tempo e oportunidade. "Cada semana sem método é uma semana trabalhando mais pra ganhar menos." Shark Method como solução.',
  },
];

/**
 * Calcula o número da semana desde 01/01/2025 (referência base)
 */
function getAbsoluteWeekNumber(date) {
  const reference = new Date('2025-01-01T00:00:00-03:00');
  const diffMs = date.getTime() - reference.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

/**
 * Calcula o número do dia dentro da semana (0=dom, 1=seg...6=sab)
 * e quantos posts de cada tipo já ocorreram nessa semana até agora.
 * Usado para rotação intra-semana.
 */
function getIntraWeekIndex(date) {
  const reference = new Date('2025-01-01T00:00:00-03:00');
  const diffMs = date.getTime() - reference.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays % 7;
}

/**
 * Retorna o tema obrigatório para o post atual.
 * Usa semana absoluta + posição no ciclo para ser determinístico.
 *
 * @param {Date} date - Data atual em Brasília
 * @param {string} contentType - Tipo do conteúdo (VALOR, ENGAJAMENTO, etc.)
 * @param {string} period - 'manhã' ou 'noite'
 * @param {number} dayOfWeek - 0=dom...6=sab
 * @returns {{ tema: string, instrucaoAdicional?: string }}
 */
function getMandatoryTopic(date, contentType, period, dayOfWeek) {
  const weekNum = getAbsoluteWeekNumber(date);
  const dayIndex = getIntraWeekIndex(date);

  // TIPO 2 — segunda manhã (dayOfWeek=1) e sexta manhã (dayOfWeek=5)
  if ((dayOfWeek === 1 || dayOfWeek === 5) && period === 'manhã') {
    // Segunda e sexta numa mesma semana usam índices diferentes
    const offset = dayOfWeek === 1 ? 0 : 1;
    const idx = (weekNum * 2 + offset) % TIPO2_TEMAS.length;
    return { tema: TIPO2_TEMAS[idx] };
  }

  // TIPO 5 — quarta noite (dayOfWeek=3) e sábado manhã (dayOfWeek=6)
  if ((dayOfWeek === 3 && period === 'noite') || (dayOfWeek === 6 && period === 'manhã')) {
    const offset = dayOfWeek === 3 ? 0 : 1;
    const idx = (weekNum * 2 + offset) % TIPO5_TEMAS.length;
    return { tema: TIPO5_TEMAS[idx] };
  }

  // TIPO 4 ENQUETE — terça noite (dayOfWeek=2) e domingo noite (dayOfWeek=0)
  if ((dayOfWeek === 2 || dayOfWeek === 0) && period === 'noite') {
    const offset = dayOfWeek === 2 ? 0 : 1;
    const idx = (weekNum * 2 + offset) % ENQUETE_TEMAS.length;
    return { tema: ENQUETE_TEMAS[idx] };
  }

  // TIPO 4 SEM ENQUETE — segunda noite (dayOfWeek=1) e quinta noite (dayOfWeek=4)
  if ((dayOfWeek === 1 || dayOfWeek === 4) && period === 'noite') {
    const offset = dayOfWeek === 1 ? 0 : 1;
    const idx = (weekNum * 2 + offset) % ENGAJAMENTO_TEMAS.length;
    return { tema: ENGAJAMENTO_TEMAS[idx] };
  }

  // TIPO 6 VENDA — sábado noite (dayOfWeek=6)
  if (dayOfWeek === 6 && period === 'noite') {
    const idx = weekNum % VENDA_TECNICAS.length;
    const tecnica = VENDA_TECNICAS[idx];
    return {
      tema: `Técnica ${tecnica.id} — ${tecnica.nome}`,
      instrucaoAdicional: tecnica.instrucao,
    };
  }

  // TIPO 7 LANÇAMENTO RELÂMPAGO
  if (contentType === 'LANÇAMENTO_RELÂMPAGO') {
    const idx = weekNum % VENDA_TECNICAS.length;
    const tecnica = VENDA_TECNICAS[idx];
    return {
      tema: `Técnica ${tecnica.id} — ${tecnica.nome} (LANÇAMENTO RELÂMPAGO)`,
      instrucaoAdicional: tecnica.instrucao,
    };
  }

  // Tipos 1 e 3 — sem tema forçado (usam rotação de empresa do banco)
  return { tema: null };
}

module.exports = { getMandatoryTopic, getAbsoluteWeekNumber };
