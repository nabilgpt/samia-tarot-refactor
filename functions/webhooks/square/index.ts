// HMAC-SHA256 over URL+raw body, compare to header; idempotent insert into processed_events
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SIGNATURE_KEY = Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY')!;
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function hmacBase64(key: string, data: string) {
  const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export default async (req: Request): Promise<Response> => {
  const given = req.headers.get('x-square-hmacsha256-signature') ?? '';
  const raw = await req.text();
  const url = new URL(req.url).toString(); // must match exactly the configured URL in Square
  const computed = await hmacBase64(SIGNATURE_KEY, url + raw);
  if (computed !== given) return new Response('unauthorized', { status: 401 });

  // Extract an event id from payload for idempotency
  let evtId = '';
  try {
    const payload = JSON.parse(raw);
    evtId = payload?.event_id || payload?.id || '';
  } catch {}
  if (!evtId) evtId = crypto.randomUUID();

  const { error: peErr } = await supabase
    .from('processed_events')
    .insert({ provider: 'square', event_id: evtId });
  if (peErr && !peErr.message?.includes('duplicate key')) {
    return new Response('db error', { status: 500 });
  }
  if (peErr) return new Response('ok'); // duplicate

  // TODO: map payment.updated → unified ledger transitions
  return new Response('ok');
};