// functions/webhooks/stripe.ts
// Stripe webhook with raw-body signature verification (P-PAY-01)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'stripe-signature, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Idempotent webhook consumption
    const { data: existing } = await supabase
      .from('payment_events')
      .select('id')
      .eq('external_event_id', event.id)
      .single()

    if (existing) {
      console.log(`Event ${event.id} already processed`)
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Log event
    await supabase.from('payment_events').insert({
      external_event_id: event.id,
      provider: 'stripe',
      event_type: event.type,
      payload: event,
      hmac_signature: signature,
      verified_at: new Date().toISOString()
    })

    // Process specific events
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        await supabase
          .from('payment_intents')
          .update({
            status: 'succeeded',
            provider_status: paymentIntent.status,
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('external_id', paymentIntent.id)

        // Mark event as processed
        await supabase
          .from('payment_events')
          .update({ processed_at: new Date().toISOString() })
          .eq('external_event_id', event.id)

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        await supabase
          .from('payment_intents')
          .update({
            status: 'failed',
            provider_status: paymentIntent.status,
            failed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('external_id', paymentIntent.id)

        await supabase
          .from('payment_events')
          .update({ processed_at: new Date().toISOString() })
          .eq('external_event_id', event.id)

        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        await supabase
          .from('payment_intents')
          .update({
            status: 'canceled',
            provider_status: paymentIntent.status,
            updated_at: new Date().toISOString()
          })
          .eq('external_id', paymentIntent.id)

        await supabase
          .from('payment_events')
          .update({ processed_at: new Date().toISOString() })
          .eq('external_event_id', event.id)

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})