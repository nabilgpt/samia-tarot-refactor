// Signed URL until KSA midnight; if audio missing → generate on-demand, upload, then sign
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const BUCKET = 'zodiac-audio';

function secondsUntilNextKsaMidnight(): number {
  const now = new Date();
  const ksaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  const midnight = new Date(ksaNow); midnight.setHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((midnight.getTime() - ksaNow.getTime()) / 1000));
}
function ksaDate(): string {
  const ksaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  const y = ksaNow.getFullYear(); const m = String(ksaNow.getMonth()+1).padStart(2,'0'); const d = String(ksaNow.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function pathFor(sign: string, lang: 'ar'|'en') {
  const today = ksaDate();
  return `${today.replaceAll('-', '/')}/${lang}/${sign}.mp3`; // YYYY/MM/DD/lang/sign.mp3
}
async function generateTTS(text: string, lang: 'ar'|'en') {
  const base = Deno.env.get('PUBLIC_BASE_URL');
  if (!base) throw new Error('PUBLIC_BASE_URL missing');
  const res = await fetch(new URL('/admin/ai/execute', base), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal': '1' },
    body: JSON.stringify({ service: 'tts', payload: { text, voice: lang === 'ar' ? 'female_ar' : 'female_en', format: 'mp3' } })
  });
  if (!res.ok) throw new Error('tts-failed');
  const { audioBase64 } = await res.json();
  return Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
}

export default async (req: Request): Promise<Response> => {
  try {
    const { sign, lang } = await req.json();
    if (!sign || !lang) return new Response('bad request', { status: 400 });

    // Load today's row (KSA)
    const { data, error } = await supabase
      .from('daily_zodiac')
      .select('audio_path, body')
      .eq('date_key', ksaDate())
      .eq('sign', sign)
      .eq('lang', lang)
      .single();
    if (error) return new Response('not found', { status: 404 });

    let p = (data as any).audio_path as string | null;
    if (!p) {
      // Create if missing
      const bytes = await generateTTS((data as any).body as string, lang);
      p = pathFor(sign, lang);
      const up = await supabase.storage.from(BUCKET).upload(p, bytes, { contentType: 'audio/mpeg', upsert: true });
      if (up.error) return new Response('upload failed', { status: 500 });
      await supabase.from('daily_zodiac').update({ audio_path: p }).eq('date_key', ksaDate()).eq('sign', sign).eq('lang', lang);
    }

    const expiresIn = secondsUntilNextKsaMidnight();
    const { data: signed, error: sErr } = await supabase.storage.from(BUCKET).createSignedUrl(p, expiresIn);
    if (sErr) return new Response('signing failed', { status: 500 });
    return new Response(JSON.stringify({ url: signed.signedUrl, expiresIn }), { headers: { 'content-type': 'application/json' } });
  } catch {
    return new Response('error', { status: 500 });
  }
};