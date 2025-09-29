// functions/webrtc/token.ts
// LiveKit token generation for video/audio calls

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@1.2.7'

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

    const { roomName, orderId } = await req.json()

    if (!roomName) {
      return new Response(
        JSON.stringify({ error: 'Room name required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user has access to this order
    if (orderId) {
      const { data: order } = await supabase
        .from('orders')
        .select('user_id, assigned_reader')
        .eq('id', orderId)
        .single()

      if (!order || (order.user_id !== user.id && order.assigned_reader !== user.id)) {
        return new Response(
          JSON.stringify({ error: 'Access denied to this room' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, role_id')
      .eq('id', user.id)
      .single()

    const participantName = `${profile?.first_name || 'User'} ${profile?.last_name || ''}`

    // Create LiveKit token
    const at = new AccessToken(
      Deno.env.get('LIVEKIT_API_KEY') ?? '',
      Deno.env.get('LIVEKIT_API_SECRET') ?? '',
      {
        identity: user.id,
        name: participantName,
        metadata: JSON.stringify({
          userId: user.id,
          roleId: profile?.role_id,
          orderId: orderId
        })
      }
    )

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    })

    return new Response(
      JSON.stringify({
        token: at.toJwt(),
        url: Deno.env.get('LIVEKIT_WS_URL') ?? '',
        room: roomName,
        identity: user.id,
        name: participantName
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