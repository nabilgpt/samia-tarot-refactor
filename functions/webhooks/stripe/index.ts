// Verify signature on RAW body + idempotent insert into processed_events
import Stripe from 'https://esm.sh/stripe@16?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

export default async (req: Request): Promise<Response> => {
  const sig = req.headers.get('stripe-signature') ?? '';
  const rawBody = await req.text();
  try {
    const event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);

    // Idempotent consume (provider,event_id PK) — ignore duplicates gracefully
    const { error: peErr } = await supabase
      .from('processed_events')
      .insert({ provider: 'stripe', event_id: event.id });
    if (peErr && !peErr.message?.includes('duplicate key')) {
      return new Response('db error', { status: 500 });
    }
    if (peErr) return new Response('ok'); // already processed

    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'payment_intent.processing':
      case 'payment_intent.payment_failed':
        // TODO: update unified ledger from event.data.object (PI)
        break;
      default:
        break;
    }
    return new Response('ok');
  } catch {
    return new Response('signature verification failed', { status: 400 });
  }
};