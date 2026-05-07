import { schedule } from '@netlify/functions';
import { handlePost } from './lib/post-handler.mjs';

// Fires at 11:00 UTC = 08:00 BRT (UTC-3)
export const handler = schedule('0 11 * * *', async () => {
  try {
    const result = await handlePost('manhã');
    console.log('[post-morning] Done:', result);
    return { statusCode: 200 };
  } catch (err) {
    console.error('[post-morning] Error:', err.message);
    return { statusCode: 500, body: err.message };
  }
});
