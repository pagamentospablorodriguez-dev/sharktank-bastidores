// netlify/functions/lib/logger.js

/**
 * Registra o log de cada post enviado.
 * No Netlify, logs aparecem no painel Functions > Logs.
 * Formato: [LOG] DIA | HORÁRIO | TIPO | PREVIEW
 */
function logPost({ dia, horario, tipo, tema, conteudo, status }) {
  const preview = conteudo ? conteudo.slice(0, 100).replace(/\n/g, ' ') : '';
  const timestamp = new Date().toISOString();

  const logLine = [
    `[SHARK-BOT]`,
    `timestamp=${timestamp}`,
    `dia="${dia}"`,
    `horario="${horario}"`,
    `tipo="${tipo}"`,
    `tema="${tema}"`,
    `status="${status}"`,
    `preview="${preview}..."`,
  ].join(' | ');

  console.log(logLine);
}

function logError(context, error) {
  console.error(`[SHARK-BOT][ERRO] context="${context}" | message="${error.message}" | ${error.stack || ''}`);
}

module.exports = { logPost, logError };