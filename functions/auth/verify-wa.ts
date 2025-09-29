// functions/auth/verify-wa.ts
// WhatsApp verification via Twilio Verify (P-AUTH-01)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { code, action } = body

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('whatsapp')
      .eq('id', user.id)
      .single()

    if (!profile?.whatsapp) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp number not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'send') {
      // Check rate limit
      const { data: rateLimitResult } = await supabase.rpc('check_verification_rate_limit', {
        p_user_id: user.id,
        p_channel: 'whatsapp'
      })

      if (!rateLimitResult.allowed) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', locked_until: rateLimitResult.locked_until }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Send verification via Twilio
      const twilioResponse = await fetch(
        `https://verify.twilio.com/v2/Services/${Deno.env.get('TWILIO_VERIFY_SID')}/Verifications`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${Deno.env.get('TWILIO_ACCOUNT_SID')}:${Deno.env.get('TWILIO_AUTH_TOKEN')}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: `whatsapp:${profile.whatsapp}`,
            Channel: 'whatsapp',
            Locale: body.locale || 'en'
          })
        }
      )

      if (!twilioResponse.ok) {
        const error = await twilioResponse.json()
        return new Response(
          JSON.stringify({ error: error.message || 'Failed to send verification' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await supabase.from('verification_logs').insert({
        user_id: user.id,
        channel: 'whatsapp',
        action: 'send'
      })

      return new Response(
        JSON.stringify({ success: true, message: 'Verification code sent via WhatsApp' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'verify') {
      if (!code) {
        return new Response(
          JSON.stringify({ error: 'Verification code required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check verification via Twilio
      const twilioResponse = await fetch(
        `https://verify.twilio.com/v2/Services/${Deno.env.get('TWILIO_VERIFY_SID')}/VerificationCheck`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${Deno.env.get('TWILIO_ACCOUNT_SID')}:${Deno.env.get('TWILIO_AUTH_TOKEN')}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: `whatsapp:${profile.whatsapp}`,
            Code: code
          })
        }
      )

      const result = await twilioResponse.json()

      if (result.status !== 'approved') {
        await supabase.from('verification_logs').insert({
          user_id: user.id,
          channel: 'whatsapp',
          action: 'verify_fail'
        })

        return new Response(
          JSON.stringify({ error: 'Invalid or expired code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update profile
      await supabase
        .from('profiles')
        .update({ whatsapp_verified: true })
        .eq('id', user.id)

      await supabase.from('verification_logs').insert({
        user_id: user.id,
        channel: 'whatsapp',
        action: 'verify_success'
      })

      return new Response(
        JSON.stringify({ success: true, message: 'WhatsApp verified successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})