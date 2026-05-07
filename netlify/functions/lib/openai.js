// netlify/functions/lib/openai.js

const { SYSTEM_PROMPT } = require('./systemPrompt');

/**
 * Gera o conteúdo do post chamando a API do GPT-4o mini
 */
async function generatePost(dayNamePT, period) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');

  const userMessage = `GERAR POST - ${dayNamePT} - ${period}`;

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
 * Verifica se o conteúdo gerado é uma enquete
 * e faz o parse do JSON interno
 */
function parseEnquete(content) {
  if (!content.startsWith('[ENQUETE]')) return null;

  try {
    // Remove o marcador [ENQUETE] e extrai o JSON
    const jsonStr = content.replace('[ENQUETE]', '').trim();
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
    // Se falhar o parse, trata como texto normal
    console.warn('[SHARK-BOT] Falha ao parsear enquete, enviando como texto:', e.message);
    return null;
  }
}

/**
 * Extrai metadata da resposta do GPT
 * (DIA, HORÁRIO, TIPO, TEMA)
 */
function extractMetadata(content) {
  const meta = { dia: '', horario: '', tipo: '', tema: '' };

  const diaMatch = content.match(/^DIA:\s*(.+)$/m);
  const horarioMatch = content.match(/^HORÁRIO:\s*(.+)$/m);
  const tipoMatch = content.match(/^TIPO:\s*(.+)$/m);
  const temaMatch = content.match(/^TEMA:\s*(.+)$/m);

  if (diaMatch) meta.dia = diaMatch[1].trim();
  if (horarioMatch) meta.horario = horarioMatch[1].trim();
  if (tipoMatch) meta.tipo = tipoMatch[1].trim();
  if (temaMatch) meta.tema = temaMatch[1].trim();

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