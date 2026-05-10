// netlify/functions/lib/openai.js

const { SYSTEM_PROMPT } = require('./systemPrompt');

/**
 * Gera o conteúdo do post chamando a API do GPT-4o mini.
 *
 * @param {string} dayNamePT - Dia da semana em português
 * @param {string} period - "manhã" ou "noite"
 * @param {string[]} recentCompanies - Empresas usadas nos últimos 7 dias
 * @param {string[]} recentThemes - Temas usados nos últimos 7 dias
 * @param {string|null} mandatoryTopic - Tema obrigatório calculado pelo código (ou null)
 * @param {string|null} mandatoryInstruction - Instrução adicional (para venda/lançamento)
 */
async function generatePost(
  dayNamePT,
  period,
  recentCompanies = [],
  recentThemes = [],
  mandatoryTopic = null,
  mandatoryInstruction = null
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');

  const companiesList = recentCompanies.length > 0
    ? recentCompanies.join(', ')
    : 'nenhuma ainda';

  const themesList = recentThemes.length > 0
    ? recentThemes.join(', ')
    : 'nenhum ainda';

  // Monta o comando base
  let userMessage = `GERAR POST - ${dayNamePT} - ${period}`;
  userMessage += ` - EMPRESAS JÁ USADAS ESSA SEMANA: ${companiesList}`;
  userMessage += ` - TEMAS JÁ USADOS ESSA SEMANA: ${themesList}`;

  // Injeta tema obrigatório quando o código determina
  if (mandatoryTopic) {
    userMessage += ` - TEMA OBRIGATÓRIO PARA ESSE POST: ${mandatoryTopic}`;
  }

  // Injeta instrução adicional (técnica de venda, etc.)
  if (mandatoryInstruction) {
    userMessage += ` - INSTRUÇÃO OBRIGATÓRIA: ${mandatoryInstruction}`;
  }

  console.log(`[SHARK-BOT] Comando enviado ao GPT: "${userMessage}"`);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 800,
      temperature: 0.85,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) throw new Error('Resposta vazia da OpenAI');

  return content;
}

/**
 * Verifica se o conteúdo gerado é uma enquete e faz o parse do JSON.
 * O [ENQUETE] pode estar em qualquer posição no texto.
 */
function parseEnquete(content) {
  const marker = '[ENQUETE]';
  const markerIndex = content.indexOf(marker);
  if (markerIndex === -1) return null;

  try {
    const jsonStr = content.slice(markerIndex + marker.length).trim();
    const data = JSON.parse(jsonStr);

    if (!data.pergunta || !Array.isArray(data.opcoes)) {
      throw new Error('Estrutura de enquete inválida');
    }

    return {
      isEnquete: true,
      pergunta: data.pergunta,
      opcoes: data.opcoes,
    };
  } catch (e) {
    console.warn('[SHARK-BOT] Falha ao parsear enquete, enviando como texto:', e.message);
    return null;
  }
}

/**
 * Extrai metadata da resposta do GPT (DIA, HORÁRIO, TIPO, TEMA)
 * e detecta a empresa mencionada no post.
 */
function extractMetadata(content) {
  const meta = { dia: '', horario: '', tipo: '', tema: '', company: '' };

  const diaMatch = content.match(/^DIA:\s*(.+)$/m);
  const horarioMatch = content.match(/^HORÁRIO:\s*(.+)$/m);
  const tipoMatch = content.match(/^TIPO:\s*(.+)$/m);
  const temaMatch = content.match(/^TEMA:\s*(.+)$/m);

  if (diaMatch) meta.dia = diaMatch[1].trim();
  if (horarioMatch) meta.horario = horarioMatch[1].trim();
  if (tipoMatch) meta.tipo = tipoMatch[1].trim();
  if (temaMatch) meta.tema = temaMatch[1].trim();

  // Detecta empresa mencionada no conteúdo
  const knownCompanies = [
    'Ring', 'Squatty Potty', 'Kodiak Cakes', 'Tower Paddle Boards',
    'Tipsy Elves', 'Cousins Maine Lobster', 'Simply Fit Board',
    'Scrub Daddy', 'Bombas', 'Baked by Melissa', 'Groovebook',
    'Bantam Bagels', 'Pipcorn', 'LuminAID', 'Bottle Breacher',
    'Nerdwax', 'Sand Cloud', 'Brightwheel', 'The Bouqs', 'Barnana',
    'Hammitt', 'ReadeREST', 'Copa Di Vino', 'Buggy Beds', 'Nuts N More',
    'Ten Thirty One Productions', 'Wicked Good Cupcakes', 'Talbott Teas',
  ];

  const contentLower = content.toLowerCase();
  for (const company of knownCompanies) {
    if (contentLower.includes(company.toLowerCase())) {
      meta.company = company;
      break;
    }
  }

  // Extrai apenas o texto do post (após os metadados)
  const lines = content.split('\n');
  const metaLines = ['DIA:', 'HORÁRIO:', 'TIPO:', 'TEMA:'];
  const postLines = [];
  let pastMeta = false;

  for (const line of lines) {
    const isMeta = metaLines.some((m) => line.startsWith(m));
    if (!isMeta && (pastMeta || postLines.length > 0)) {
      postLines.push(line);
      pastMeta = true;
    } else if (isMeta) {
      pastMeta = true;
    }
  }

  meta.postText = postLines.join('\n').trim();
  return meta;
}

module.exports = { generatePost, parseEnquete, extractMetadata };
