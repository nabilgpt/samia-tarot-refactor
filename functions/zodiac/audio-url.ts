// functions/zodiac/audio-url.ts
// Signed URL with TTL until next KSA midnight (P-ZOD-URL-01)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function secondsUntilNextKsaMidnight(): number {
  const now = new Date()
  const ksaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }))

  const nextMidnight = new Date(ksaNow)
  nextMidnight.setDate(nextMidnight.getDate() + 1)
  nextMidnight.setHours(0, 0, 0, 0)

  return Math.floor((nextMidnight.getTime() - ksaNow.getTime()) / 1000)
}

function getKsaDate(): string {
  const now = new Date()
  const ksaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }))
  return ksaNow.toISOString().split('T')[0]
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

    const url = new URL(req.url)
    const lang = url.searchParams.get('lang') || 'en'

    // Get user's zodiac sign
    const { data: profile } = await supabase
      .from('profiles')
      .select('zodiac_sun')
      .eq('id', user.id)
      .single()

    if (!profile?.zodiac_sun) {
      return new Response(
        JSON.stringify({ error: 'Zodiac sign not set. Please update your profile.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const dateKey = getKsaDate()

    // Get today's zodiac entry
    const { data: zodiac } = await supabase
      .from('daily_zodiac')
      .select('*')
      .eq('date_key', dateKey)
      .eq('lang', lang)
      .eq('sign', profile.zodiac_sun)
      .eq('archived', false)
      .single()

    if (!zodiac) {
      return new Response(
        JSON.stringify({ error: 'No zodiac entry for today' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If audio missing, generate on-demand (placeholder - actual generation via n8n)
    if (!zodiac.audio_url) {
      // TODO: Trigger n8n workflow to generate audio
      // For now, return text-only response
      return new Response(
        JSON.stringify({
          sign: zodiac.sign,
          date: zodiac.date_key,
          text: zodiac.text_content,
          audio_available: false,
          message: 'Audio generation in progress'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate signed URL with TTL until next KSA midnight
    const expiresIn = secondsUntilNextKsaMidnight()

    // Extract bucket and path from audio_url
    const audioPath = zodiac.audio_url.replace(/^.*storage\/v1\/object\/public\//, '')

    const { data: signedData, error: signError } = await supabase
      .storage
      .from('zodiac-audio')
      .createSignedUrl(audioPath, expiresIn)

    if (signError) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate signed URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        sign: zodiac.sign,
        date: zodiac.date_key,
        text: zodiac.text_content,
        audio_url: signedData.signedUrl,
        audio_format: zodiac.audio_format,
        audio_duration_sec: zodiac.audio_duration_sec,
        expires_in: expiresIn,
        expires_at_ksa: new Date(Date.now() + expiresIn * 1000).toISOString()
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