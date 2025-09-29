# LiveKit Region Pinning Guide

## Overview

This guide explains how to request **Region Pinning** for LiveKit Cloud to ensure consistent, low-latency connections for users in Lebanon and the MENA region.

---

## Why Region Pinning?

By default, LiveKit Cloud uses **automatic region selection** based on client proximity. However, for production applications requiring:
- **Predictable latency**
- **Regulatory compliance**
- **Consistent performance**

Region Pinning ensures all participants connect to a specific datacenter.

### Trade-offs

✅ **Benefits**:
- Consistent latency for all users
- Predictable network paths
- Easier debugging and monitoring

❌ **Drawbacks**:
- No automatic failover to other regions
- Single point of failure (mitigated by LiveKit's regional redundancy)
- Requires manual monitoring and alerts

---

## Recommended Region: EU (Frankfurt)

For SAMIA TAROT serving Lebanon and MENA:

**Primary**: **EU (Frankfurt)** - `fra`

**Reasoning**:
- Closest available region to Lebanon (~2,500 km)
- Typical latency: **50-80ms**
- Stable infrastructure
- Good internet peering with Middle East

**When MENA region launches**: Migrate to `mena` or `dxb` (Dubai)

---

## Step 1: Request Region Pinning

### Contact LiveKit Support

1. Log into [LiveKit Cloud Dashboard](https://cloud.livekit.io)
2. Go to **Support** or **Contact**
3. Submit a ticket with the following template:

```
Subject: Request for Region Pinning - Production Application

Hi LiveKit Team,

We are launching a production application (SAMIA TAROT) serving users primarily in Lebanon and the Middle East.

We would like to request Region Pinning for our project:

- Project ID: [YOUR_PROJECT_ID]
- Project Name: samia-tarot-[environment]
- Desired Region: EU (Frankfurt) - fra
- Use Case: Live tarot reading sessions (1-on-1 video/audio calls)
- Expected concurrent sessions: 10-50
- Launch date: [DATE]

We understand that region pinning disables automatic failover, and we have monitoring and alerting in place.

Please confirm:
1. Region pinning is enabled
2. Any specific endpoint URL for the pinned region
3. SLA and redundancy within the pinned region

Thank you,
[Your Name]
[Your Email]
```

### Expected Response Time

- **Standard plan**: 1-2 business days
- **Enterprise plan**: Same day

---

## Step 2: Update Configuration

Once LiveKit confirms region pinning:

### Update Environment Variables

```bash
# If LiveKit provides a region-specific endpoint
LIVEKIT_WS_URL=wss://fra-samiatarot-styelzay.livekit.cloud

# Otherwise, keep existing
LIVEKIT_WS_URL=wss://samiatarot-styelzay.livekit.cloud
```

### Verify Latency

Test from your primary markets:

```bash
# From Lebanon server
ping fra.livekit.io

# Expected: 50-80ms
```

---

## Step 3: Configure Monitoring

### Metrics to Monitor

1. **Latency**: Track P50, P95, P99
2. **Connection success rate**: Should be >99%
3. **Regional failures**: Alert if region becomes unavailable
4. **Audio/video quality**: Track packet loss, jitter

### Alert Setup

Create alerts for:
- Latency >150ms sustained for 5min
- Connection failure rate >1%
- Room creation failures
- Region-wide outages

### LiveKit Dashboard

Monitor in LiveKit Cloud Dashboard:
1. **Rooms** → Active rooms
2. **Analytics** → Connection quality
3. **Logs** → Error patterns

---

## Step 4: Failover Planning

Since region pinning disables auto-failover:

### Manual Failover Process

1. **Detect regional outage** (via monitoring)
2. **Switch environment variable** to backup region:
   ```bash
   LIVEKIT_WS_URL=wss://backup-region.livekit.cloud
   ```
3. **Redeploy Edge Functions** with new configuration
4. **Notify users** of temporary service interruption

### Backup Region

Recommended backup: **EU (Dublin)** - `dub`
- Next closest to MENA
- Similar latency profile

---

## Step 5: Production Testing

### Load Testing

Test pinned region with:

```bash
# Using LiveKit CLI
livekit-cli load-test \
  --url $LIVEKIT_WS_URL \
  --api-key $LIVEKIT_API_KEY \
  --api-secret $LIVEKIT_API_SECRET \
  --room test-room-1 \
  --publishers 2 \
  --duration 5m
```

### Real-world Testing

1. **Test from Lebanon**: Verify 50-80ms latency
2. **Test from Saudi Arabia**: Verify 80-100ms latency
3. **Test from UAE**: Verify 100-120ms latency
4. **Test video quality**: Ensure stable 720p @ 30fps

---

## Performance Benchmarks

### Expected Latency by Country

| Country | Distance to Frankfurt | Expected Latency |
|---------|----------------------|------------------|
| Lebanon | ~2,500 km | 50-80ms |
| Saudi Arabia | ~3,500 km | 80-100ms |
| UAE | ~4,000 km | 100-120ms |
| Egypt | ~2,800 km | 60-90ms |
| Jordan | ~2,600 km | 55-85ms |

### Video Quality Targets

- **720p @ 30fps**: <100ms latency
- **480p @ 30fps**: <150ms latency
- **Audio-only**: <200ms tolerable

---

## Migration Plan (When MENA Region Launches)

When LiveKit announces MENA region:

1. **Request access** to MENA region
2. **Test latency** from primary markets
3. **Gradual rollout**:
   - Week 1: 10% of traffic to MENA
   - Week 2: 50% of traffic to MENA
   - Week 3: 100% of traffic to MENA
4. **Monitor** for improvements
5. **Update pinning** permanently to MENA

Expected latency with MENA region:
- Lebanon: **10-30ms**
- Saudi Arabia: **20-40ms**
- UAE: **15-35ms**

---

## Cost Implications

Region pinning does **not** change LiveKit pricing.

Pricing is based on:
- Participant minutes
- Egress (recording) bandwidth
- Storage (if using LiveKit storage)

Typical costs:
- **Participant minute**: $0.004
- **Egress per GB**: $0.10
- **Recording storage per GB/month**: $0.023

---

## Troubleshooting

### High Latency (>150ms)

**Possible causes**:
- ISP routing issues
- Network congestion
- Client location too far from region

**Solutions**:
1. Check traceroute: `traceroute fra.livekit.io`
2. Test from different ISP
3. Consider dual-region setup (advanced)

### Connection Failures

**Possible causes**:
- Regional outage
- Firewall blocking WebSocket
- DNS resolution issues

**Solutions**:
1. Check LiveKit status page
2. Verify WebSocket ports (443, 7881) are open
3. Use direct IP if DNS fails

### Poor Video Quality

**Possible causes**:
- Bandwidth limitations
- CPU overload on client
- Network packet loss

**Solutions**:
1. Reduce video resolution
2. Use adaptive bitrate
3. Enable simulcast

---

## Support

- **LiveKit Docs**: https://docs.livekit.io
- **LiveKit Status**: https://status.livekit.io
- **Community Slack**: https://livekit.io/slack
- **Email**: support@livekit.io

---

## Checklist

- [ ] Region pinning requested from LiveKit
- [ ] Confirmation received from LiveKit
- [ ] Environment variables updated
- [ ] Latency tested from Lebanon
- [ ] Monitoring alerts configured
- [ ] Failover plan documented
- [ ] Load testing completed
- [ ] Production deployment verified