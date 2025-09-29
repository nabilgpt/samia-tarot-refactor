// functions/webhooks/square.ts
// Square webhook with HMAC-SHA256 verification (P-PAY-01)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-square-hmacsha256-signature, content-type',
}

async function verifySquareSignature(
  body: string,
  signature: string,
  webhookUrl: string,
  webhookSecret: string
): Promise<boolean> {
  const payload = webhookUrl + body

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computedSignature === signature
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('x-square-hmacsha256-signature')
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.text()
    const webhookUrl = Deno.env.get('SQUARE_WEBHOOK_URL') ?? ''
    const webhookSecret = Deno.env.get('SQUARE_WEBHOOK_SECRET') ?? ''

    const isValid = await verifySquareSignature(body, signature, webhookUrl, webhookSecret)

    if (!isValid) {
      console.error('Square webhook signature verification failed')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const event = JSON.parse(body)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Idempotent webhook consumption
    const { data: existing } = await supabase
      .from('payment_events')
      .select('id')
      .eq('external_event_id', event.event_id)
      .single()

    if (existing) {
      console.log(`Event ${event.event_id} already processed`)
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Log event
    await supabase.from('payment_events').insert({
      external_event_id: event.event_id,
      provider: 'square',
      event_type: event.type,
      payload: event,
      hmac_signature: signature,
      verified_at: new Date().toISOString()
    })

    // Process payment.updated events
    if (event.type === 'payment.updated' && event.data?.object?.payment) {
      const payment = event.data.object.payment

      let status = 'pending'
      if (payment.status === 'COMPLETED') status = 'succeeded'
      else if (payment.status === 'FAILED') status = 'failed'
      else if (payment.status === 'CANCELED') status = 'canceled'

      await supabase
        .from('payment_intents')
        .update({
          status,
          provider_status: payment.status,
          updated_at: new Date().toISOString(),
          ...(status === 'succeeded' ? { confirmed_at: new Date().toISOString() } : {}),
          ...(status === 'failed' ? { failed_at: new Date().toISOString() } : {})
        })
        .eq('external_id', payment.id)

      await supabase
        .from('payment_events')
        .update({ processed_at: new Date().toISOString() })
        .eq('external_event_id', event.event_id)
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