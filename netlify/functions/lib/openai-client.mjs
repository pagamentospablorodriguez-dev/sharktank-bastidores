import OpenAI from 'openai';
import { SYSTEM_PROMPT } from './system-prompt.mjs';

let _client = null;

function getClient() {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export async function generatePost({ dayName, period, weekNumber, lancamentoRelampago }) {
  const client = getClient();
  const lancamento = lancamentoRelampago ? 'SIM' : 'NÃO';
  const userPrompt = `GERAR POST - ${dayName} - ${period} - SEMANA ${weekNumber} - LANCAMENTO_RELAMPAGO=${lancamento}`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.85,
    max_tokens: 800,
  });

  return completion.choices[0].message.content.trim();
}
