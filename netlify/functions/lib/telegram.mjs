const BASE_URL = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function apiCall(method, body) {
  const res = await fetch(`${BASE_URL()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function sendMessage(text) {
  return apiCall('sendMessage', {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text,
    parse_mode: 'HTML',
  });
}

export async function sendPoll(question, options) {
  return apiCall('sendPoll', {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    question,
    options,
    is_anonymous: false,
  });
}

// Parses GPT output and sends the appropriate Telegram message.
// Returns { isPoll, telegramResponse, contentPreview }
export async function dispatchPost(rawContent) {
  const trimmed = rawContent.trim();

  if (trimmed.startsWith('[ENQUETE]')) {
    const jsonStr = trimmed.replace('[ENQUETE]', '').trim();
    let poll;
    try {
      poll = JSON.parse(jsonStr);
    } catch {
      // Fallback: send as plain text if JSON is malformed
      const res = await sendMessage(trimmed);
      return { isPoll: false, telegramResponse: res, contentPreview: trimmed.slice(0, 100) };
    }

    const res = await sendPoll(poll.pergunta, poll.opcoes);
    const preview = `[ENQUETE] ${poll.pergunta}`.slice(0, 100);
    return { isPoll: true, telegramResponse: res, contentPreview: preview };
  }

  // Normal post — strip the metadata header block if present
  // Header format: "DIA: ...\nHORÁRIO: ...\nTIPO: ...\nTEMA: ...\n\n"
  const postText = extractPostText(trimmed);
  const res = await sendMessage(postText);
  return { isPoll: false, telegramResponse: res, contentPreview: postText.slice(0, 100) };
}

function extractPostText(raw) {
  // The header ends with a blank line before the post body
  const headerPattern = /^DIA:.*\nHORÁRIO:.*\nTIPO:.*\nTEMA:.*\n\n/s;
  const match = raw.match(headerPattern);
  if (match) {
    return raw.slice(match[0].length).trim();
  }
  return raw;
}
