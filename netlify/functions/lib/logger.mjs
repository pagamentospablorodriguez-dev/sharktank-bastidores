import { createClient } from '@supabase/supabase-js';

let _supabase = null;

function getClient() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return _supabase;
}

export async function logPost({ day, period, postType, contentPreview, weekNumber, isPoll, telegramResponse }) {
  try {
    const supabase = getClient();
    const { error } = await supabase.from('post_logs').insert({
      day,
      period,
      post_type: postType,
      content_preview: contentPreview,
      week_number: weekNumber,
      is_poll: isPoll,
      telegram_response: telegramResponse,
      posted_at: new Date().toISOString(),
    });
    if (error) {
      console.error('[logger] Supabase insert error:', error.message);
    }
  } catch (err) {
    // Logging failure should never crash the main flow
    console.error('[logger] Unexpected error:', err.message);
  }
}
