import { schedule } from '@netlify/functions';
import { handlePost } from './lib/post-handler.mjs';

// Fires at 23:00 UTC = 20:00 BRT (UTC-3)
export const handler = schedule('0 23 * * *', async () => {
  try {
    const result = await handlePost('noite');
    console.log('[post-evening] Done:', result);
    return { statusCode: 200 };
  } catch (err) {
    console.error('[post-evening] Error:', err.message);
    return { statusCode: 500, body: err.message };
  }
});
