// functions/auth/signup.ts
// Deno Edge Function for signup with mandatory fields (P-AUTH-01)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SignupRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | 'prefer_not_to_say'
  whatsapp: string
  country: string
  timeZone: string
  city?: string
  dob: string
  language: 'en' | 'ar' | 'fr'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    )

    const body: SignupRequest = await req.json()

    // Validate mandatory fields
    const required = ['email', 'password', 'firstName', 'lastName', 'gender',
                     'maritalStatus', 'whatsapp', 'country', 'timeZone', 'dob', 'language']
    for (const field of required) {
      if (!body[field as keyof SignupRequest]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate WhatsApp E.164 format
    if (!/^\+[1-9]\d{1,14}$/.test(body.whatsapp)) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp must be in E.164 format (e.g., +966501234567)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate age (≥18)
    const dob = new Date(body.dob)
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    if (age < 18) {
      return new Response(
        JSON.stringify({ error: 'Must be at least 18 years old' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
    })

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create profile with service role (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user!.id,
        email: body.email,
        first_name: body.firstName,
        last_name: body.lastName,
        gender: body.gender,
        marital_status: body.maritalStatus,
        whatsapp: body.whatsapp,
        country: body.country,
        time_zone: body.timeZone || 'Asia/Riyadh',
        city: body.city,
        dob: body.dob,
        language: body.language,
        role_id: 5, // client
      })

    if (profileError) {
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        user: authData.user,
        message: 'Signup successful. Please verify your email and WhatsApp.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})