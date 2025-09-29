// packages/shared/server/otp.ts
// Minimal, maintainable helpers for starting/checking OTP over WhatsApp, Email, or SMS

export type VerifyChannel = 'whatsapp' | 'email' | 'sms'

interface TwilioConfig {
  accountSid: string
  authToken?: string
  apiKey?: string
  apiSecret?: string
  verifyServiceSid: string
}

class TwilioClient {
  private config: TwilioConfig
  private authHeader: string

  constructor(config: TwilioConfig) {
    this.config = config

    if (config.authToken) {
      this.authHeader = 'Basic ' + btoa(`${config.accountSid}:${config.authToken}`)
    } else if (config.apiKey && config.apiSecret) {
      this.authHeader = 'Basic ' + btoa(`${config.apiKey}:${config.apiSecret}`)
    } else {
      throw new Error('Either authToken or apiKey/apiSecret is required')
    }
  }

  async startVerification(to: string, channel: VerifyChannel, locale = 'en') {
    const formattedTo = channel === 'whatsapp' ? `whatsapp:${to}` : to

    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${this.config.verifyServiceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedTo,
          Channel: channel,
          Locale: locale
        })
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to start verification')
    }

    return await response.json()
  }

  async checkVerification(to: string, code: string, channel: VerifyChannel) {
    const formattedTo = channel === 'whatsapp' ? `whatsapp:${to}` : to

    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${this.config.verifyServiceSid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedTo,
          Code: code
        })
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to check verification')
    }

    return await response.json()
  }
}

export function createTwilioClient(env: Record<string, string>): TwilioClient {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_API_KEY, TWILIO_API_SECRET, VERIFY_SERVICE_SID } = env

  if (!VERIFY_SERVICE_SID) {
    throw new Error('Missing VERIFY_SERVICE_SID')
  }

  return new TwilioClient({
    accountSid: TWILIO_ACCOUNT_SID,
    authToken: TWILIO_AUTH_TOKEN,
    apiKey: TWILIO_API_KEY,
    apiSecret: TWILIO_API_SECRET,
    verifyServiceSid: VERIFY_SERVICE_SID
  })
}

// Convenience exports
export { TwilioClient }