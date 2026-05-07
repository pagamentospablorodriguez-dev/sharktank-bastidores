import { handlePost } from './lib/post-handler.mjs';

// Manual HTTP trigger for testing before going live.
// Usage:
//   GET /.netlify/functions/test-post?period=manha   → posts morning content
//   GET /.netlify/functions/test-post?period=noite   → posts evening content
//
// Requires the same env vars: OPENAI_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
export const handler = async (event) => {
  // Simple secret check so the URL can't be hit by anyone
  const secret = event.queryStringParameters?.secret;
  if (!secret || secret !== process.env.TEST_SECRET) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized. Pass ?secret=TEST_SECRET in the URL.' }),
    };
  }

  const rawPeriod = event.queryStringParameters?.period ?? 'manha';
  const period = rawPeriod === 'noite' ? 'noite' : 'manhã';

  try {
    const result = await handlePost(period);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, ...result }),
    };
  } catch (err) {
    console.error('[test-post] Error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
