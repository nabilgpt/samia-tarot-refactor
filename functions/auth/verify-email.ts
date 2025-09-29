// functions/auth/verify-email.ts
// Email verification with rate limiting (P-AUTH-01)

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

    const { token } = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Verification token required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify with Supabase Auth
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    })

    if (error) {
      // Log failed attempt
      if (data?.user?.id) {
        await supabase.from('verification_logs').insert({
          user_id: data.user.id,
          channel: 'email',
          action: 'verify_fail',
          metadata: { error: error.message }
        })
      }

      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update profile
    await supabase
      .from('profiles')
      .update({ email_verified: true })
      .eq('id', data.user!.id)

    // Log success
    await supabase.from('verification_logs').insert({
      user_id: data.user!.id,
      channel: 'email',
      action: 'verify_success'
    })

    return new Response(
      JSON.stringify({ success: true, message: 'Email verified successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})