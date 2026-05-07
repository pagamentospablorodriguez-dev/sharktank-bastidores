import { getBRTContext, resolvePostCategory } from './scheduler.mjs';
import { generatePost } from './openai-client.mjs';
import { dispatchPost } from './telegram.mjs';
import { logPost } from './logger.mjs';

// period: 'manhã' | 'noite'
export async function handlePost(period) {
  const { dayIndex, dayName, weekNumber, lancamentoRelampago } = getBRTContext();
  const postCategory = resolvePostCategory(dayIndex, period, weekNumber);

  console.log(`[post-handler] ${dayName} ${period} | category=${postCategory} | week=${weekNumber} | lancamento=${lancamentoRelampago}`);

  const rawContent = await generatePost({ dayName, period, weekNumber, lancamentoRelampago });

  console.log(`[post-handler] GPT response preview: ${rawContent.slice(0, 100)}`);

  const { isPoll, telegramResponse, contentPreview } = await dispatchPost(rawContent);

  const telegramOk = telegramResponse?.ok === true;
  console.log(`[post-handler] Telegram dispatch ok=${telegramOk} | isPoll=${isPoll}`);
  console.log(`[post-handler] LOG — ${dayName} ${period} | ${contentPreview}`);

  await logPost({
    day: dayName,
    period,
    postType: postCategory,
    contentPreview,
    weekNumber,
    isPoll,
    telegramResponse,
  });

  return { ok: telegramOk, isPoll, contentPreview, postCategory };
}
