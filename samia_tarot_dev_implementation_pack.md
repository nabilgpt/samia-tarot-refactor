# SAMIA TAROT DEV — Implementation Pack

**Stack we’re implementing**

- **OTP**: Twilio Verify (WhatsApp + Email) with channel selection/fallback
- **Non‑OTP Email**: Twilio **SendGrid** (Domain Authentication via API)
- **DNS**: Use your current DNS provider (add CNAMEs only; no nameserver change)
- **LiveKit Cloud**: Region Pinning (EU/Frankfurt)

---

## 0) `.env.example`

```bash
# Twilio
TWILIO_ACCOUNT_SID=ACbea6761e4edb95a695c739b733ff33e4
# Option A (simple):
TWILIO_AUTH_TOKEN=219d873751e40e55d5117bc84d5750bc
TWILIO_VERIFY_SID=VA8be8fc33969f9e3dbf23e16fd4174e00
# Option B (API Keys):
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_key_secret
VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# SendGrid
SENDGRID_API_KEY=SG.1h37IS3LTB6fjgnzkUgKxgMIafkn0uQwFAB0_8sv9vhn8HESE_L42o7K_ZuMuwAhA
SENDING_DOMAIN=samiatarot.com
SENDGRID_SUBDOMAIN=em   # keep short; SG will expand like em123.yourdomain.com

# LiveKit
LIVEKIT_WS_URL=wss://samiatarot-styelzay.livekit.cloud
LIVEKIT_API_KEY=APIbJDrDQGgjmfM
LIVEKIT_API_SECRET=4CbBsxDtGAhvBFi2fztzf4Bfdhglq6pWlDPGAc3xQIlB
```

> Notes:
>
> - Keep either `TWILIO_AUTH_TOKEN` **or** the `TWILIO_API_KEY/SECRET` pair. Code supports both.
> - `SENDGRID_SUBDOMAIN` is the friendly prefix for Automated Security (SG may return a numeric variant).

---

## 1) `server/otp.ts` (Twilio Verify helpers)

```ts
// server/otp.ts
// Minimal, maintainable helpers for starting/checking OTP over WhatsApp, Email, or SMS.
// No UI changes. Keep code short.

import Twilio from 'twilio';

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  VERIFY_SERVICE_SID,
} = process.env as Record<string, string>;

if (!VERIFY_SERVICE_SID) throw new Error('Missing VERIFY_SERVICE_SID');

const client = TWILIO_AUTH_TOKEN
  ? Twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN)
  : Twilio(TWILIO_API_KEY!, TWILIO_API_SECRET!, { accountSid: TWILIO_ACCOUNT_SID });

export type VerifyChannel = 'whatsapp' | 'email' | 'sms';

export async function startVerification(to: string, channel: VerifyChannel, locale = 'en') {
  const formattedTo = channel === 'whatsapp' ? `whatsapp:${to}` : to;
  return client.verify.v2.services(VERIFY_SERVICE_SID!)
    .verifications
    .create({ to: formattedTo, channel, locale });
}

export async function checkVerification(to: string, code: string, channel: VerifyChannel) {
  const formattedTo = channel === 'whatsapp' ? `whatsapp:${to}` : to;
  return client.verify.v2.services(VERIFY_SERVICE_SID!)
    .verificationChecks
    .create({ to: formattedTo, code });
}
```

---

## 2) `scripts/sendgrid_auth_create.sh`

Creates an **Authenticated Domain** in SendGrid with **Automated Security** (CNAME-only). Prints the DNS records and the created **domain ID**.

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${SENDGRID_API_KEY?}"
: "${SENDING_DOMAIN?}"
SUBDOMAIN="${SENDGRID_SUBDOMAIN:-em}"

api() {
  curl -sS https://api.sendgrid.com/v3/whitelabel/domains \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    -H 'Content-Type: application/json' \
    -d "{\"domain\":\"$SENDING_DOMAIN\",\"subdomain\":\"$SUBDOMAIN\",\"automatic_security\":true,\"default\":true}"
}

RESP=$(api)
ID=$(echo "$RESP" | jq -r '.id')
MAIL_HOST=$(echo "$RESP" | jq -r '.dns.mail_cname.host')
MAIL_DATA=$(echo "$RESP" | jq -r '.dns.mail_cname.data')
DKIM1_HOST=$(echo "$RESP" | jq -r '.dns.dkim1.host')
DKIM1_DATA=$(echo "$RESP" | jq -r '.dns.dkim1.data')
DKIM2_HOST=$(echo "$RESP" | jq -r '.dns.dkim2.host')
DKIM2_DATA=$(echo "$RESP" | jq -r '.dns.dkim2.data')

cat <<EOF
SENDGRID_DOMAIN_ID=$ID
# Create these CNAMEs at your DNS provider:
$MAIL_HOST CNAME $MAIL_DATA
$DKIM1_HOST CNAME $DKIM1_DATA
$DKIM2_HOST CNAME $DKIM2_DATA
EOF
```

---

## 3) `docs/dns-manual-steps.md`

Use your current DNS provider (GoDaddy, Namecheap, Route53, etc.). Add the three **CNAME** records returned by step (2). No nameserver change or domain transfer is required. Include screenshots/instructions per provider if needed.

Contents:

- Why CNAMEs only (Automated Security)
- Where to add records (DNS control panel)
- How to check propagation (dig/nslookup)
- Typical TTLs and validation timing

---

## 4) (Intentionally omitted)

When not using Cloudflare, add the CNAMEs directly at your DNS provider (see §3). No script is needed.

---

## 5)  `scripts/sendgrid_auth_validate.sh`

Validates the authenticated domain after DNS propagates.

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${SENDGRID_API_KEY?}"
: "${SENDGRID_DOMAIN_ID?}"

curl -sS -X POST \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  https://api.sendgrid.com/v3/whitelabel/domains/$SENDGRID_DOMAIN_ID/validate | jq .
```

---

## 6) `scripts/otp_demo.js`

Tiny demo to trigger WhatsApp & Email OTP and then verify.

```js
// node scripts/otp_demo.js +123456789 user@example.com 123456
import Twilio from 'twilio';
const [,, phone, email, code] = process.argv;
const {
  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
  TWILIO_API_KEY, TWILIO_API_SECRET, VERIFY_SERVICE_SID
} = process.env;
const client = TWILIO_AUTH_TOKEN
  ? Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  : Twilio(TWILIO_API_KEY, TWILIO_API_SECRET, { accountSid: TWILIO_ACCOUNT_SID });

async function run(){
  console.log('> start whatsapp');
  await client.verify.v2.services(VERIFY_SERVICE_SID).verifications.create({ to: `whatsapp:${phone}`, channel: 'whatsapp' });
  console.log('> start email');
  await client.verify.v2.services(VERIFY_SERVICE_SID).verifications.create({ to: email, channel: 'email' });
  if (code) {
    const res = await client.verify.v2.services(VERIFY_SERVICE_SID).verificationChecks.create({ to: `whatsapp:${phone}`, code });
    console.log('check:', res.status);
  }
}
run().catch(e=>{ console.error(e); process.exit(1); });
```

---

## 7) `docs/verify-setup.md`

- Create **Verify Service** in Twilio Console; set brand name and default locale(s).
- **WhatsApp Sender:** in Twilio Console → Messaging → WhatsApp Senders. Complete WABA verification if required. Approve **WhatsApp Authentication** template or use Verify defaults.
- In code, use `startVerification(to, 'whatsapp' | 'email' | 'sms')`.
- (Optional) Enable **Channel Selection/Fallback** in Verify for automatic WhatsApp→SMS fallback.

---

## 8) `docs/livekit-region-pinning.md`

- Open LiveKit Cloud → **Support** → request **Region Pinning** for the project.
- Ask to pin to **EU (Frankfurt)** for lowest stable latency to Lebanon until a MENA region is officially supported.
- Note: Pinning disables automatic region failover. Keep monitoring + alerts enabled.

---

## 9) Runbook

1. `cp .env.example .env.local` and fill secrets.
2. `bash scripts/sendgrid_auth_create.sh` → capture `SENDGRID_DOMAIN_ID` and the three CNAMEs.
3. **Add the three CNAMEs at your current DNS provider** (no nameserver change).
4. `bash scripts/sendgrid_auth_validate.sh` until `valid=true` (allow up to 48h for DNS).
5. Deploy `server/otp.ts` and wire routes or handlers as needed.
6. Submit LiveKit support ticket to enable Region Pinning; update `LIVEKIT_WS_URL` if LiveKit provides a region‑specific endpoint.

---

## 10) Safety/rollback

- SendGrid: `DELETE /v3/whitelabel/domains/{id}` to remove the authenticated domain if misconfigured.
- Twilio Verify: rotate API keys any time; no UI theme changes in this pack.

```text
This pack intentionally avoids any UI edits and keeps code short and maintainable.
```

