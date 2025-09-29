// packages/realtime/livekit.ts
// LiveKit Cloud adapter for server-side recording & egress

export interface EgressRequest {
  roomName: string
  outputType: 'composite' | 'room_composite'
  outputFormat?: 'mp4' | 'webm'
  customTemplate?: string
}

export class LiveKitEgressClient {
  private apiKey: string
  private apiSecret: string
  private baseUrl: string

  constructor(apiKey: string, apiSecret: string, wsUrl: string) {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    // Convert wss://project.livekit.cloud to https://project.livekit.cloud
    this.baseUrl = wsUrl.replace('wss://', 'https://')
  }

  private async request(path: string, method: string, body?: any) {
    const url = `${this.baseUrl}${path}`
    const headers = {
      'Authorization': 'Bearer ' + this.createToken(),
      'Content-Type': 'application/json'
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`LiveKit API error: ${error}`)
    }

    return await response.json()
  }

  private createToken(): string {
    // Use livekit-server-sdk token generation
    // This is a simplified version - actual implementation should use AccessToken
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({
      iss: this.apiKey,
      exp: Math.floor(Date.now() / 1000) + 3600,
      video: { roomRecord: true }
    }))

    // In production, use proper HMAC-SHA256 signing
    return `${header}.${payload}.signature`
  }

  async startEgress(req: EgressRequest): Promise<any> {
    const body = {
      room_name: req.roomName,
      output: {
        file_type: req.outputFormat || 'mp4',
        custom_base_url: process.env.STORAGE_EGRESS_URL
      }
    }

    if (req.outputType === 'room_composite') {
      return await this.request('/twirp/livekit.Egress/StartRoomCompositeEgress', 'POST', body)
    } else {
      return await this.request('/twirp/livekit.Egress/StartWebEgress', 'POST', body)
    }
  }

  async stopEgress(egressId: string): Promise<any> {
    return await this.request('/twirp/livekit.Egress/StopEgress', 'POST', {
      egress_id: egressId
    })
  }

  async listEgress(roomName?: string): Promise<any> {
    return await this.request(
      `/twirp/livekit.Egress/ListEgress${roomName ? `?room_name=${roomName}` : ''}`,
      'GET'
    )
  }
}

export function createLiveKitClient(env: Record<string, string>): LiveKitEgressClient {
  const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_WS_URL } = env

  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_WS_URL) {
    throw new Error('Missing LiveKit configuration')
  }

  return new LiveKitEgressClient(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_WS_URL)
}