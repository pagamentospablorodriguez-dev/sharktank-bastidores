// netlify/functions/lib/telegram.js

const TELEGRAM_API = 'https://api.telegram.org/bot';

function getToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN não configurado');
  return token;
}

function getChatId() {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) throw new Error('TELEGRAM_CHAT_ID não configurado');
  return chatId;
}

/**
 * Envia uma mensagem de texto para o canal
 */
async function sendMessage(text) {
  const token = getToken();
  const chatId = getChatId();

  const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(`Telegram sendMessage error: ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Envia uma enquete para o canal
 * @param {string} question - Texto da pergunta
 * @param {string[]} options - Array de opções (máx 10, mín 2)
 */
async function sendPoll(question, options) {
  const token = getToken();
  const chatId = getChatId();

  // Telegram aceita no máximo 10 opções e mínimo 2
  const sanitizedOptions = options.slice(0, 10);
  if (sanitizedOptions.length < 2) {
    throw new Error('Enquete precisa de pelo menos 2 opções');
  }

  const response = await fetch(`${TELEGRAM_API}${token}/sendPoll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      question: question.slice(0, 300), // limite do Telegram
      options: sanitizedOptions.map((opt) => opt.slice(0, 100)), // limite por opção
      is_anonymous: true,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(`Telegram sendPoll error: ${JSON.stringify(data)}`);
  }

  return data;
}

module.exports = { sendMessage, sendPoll };