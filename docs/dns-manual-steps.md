# DNS Manual Setup for SendGrid

## Overview

This guide explains how to add the three CNAME records required for SendGrid **Authenticated Domain** with **Automated Security** at your DNS provider.

**No nameserver change or domain transfer is required.** You only need to add three CNAME records.

---

## Why CNAMEs Only?

SendGrid's **Automated Security** feature uses CNAME records to:
- Authenticate your sending domain (SPF/DKIM)
- Maintain email deliverability
- Avoid complex DNS configurations

This approach works with any DNS provider without changing nameservers.

---

## Step 1: Get DNS Records

Run the setup script to get your three CNAME records:

```bash
bash scripts/sendgrid_auth_create.sh
```

This will output something like:

```
SENDGRID_DOMAIN_ID=12345678
# Create these CNAMEs at your DNS provider:
em123.samiatarot.com CNAME u12345678.wl.sendgrid.net
s1._domainkey.samiatarot.com CNAME s1.domainkey.u12345678.wl.sendgrid.net
s2._domainkey.samiatarot.com CNAME s2.domainkey.u12345678.wl.sendgrid.net
```

**Save the `SENDGRID_DOMAIN_ID` to your `.env` file.**

---

## Step 2: Add CNAMEs to Your DNS Provider

### General Instructions

1. Log into your DNS provider's control panel
2. Navigate to DNS management for your domain
3. Add three new **CNAME** records with the values from Step 1
4. Set TTL to 3600 (1 hour) or use automatic
5. Save changes

### Provider-Specific Guides

#### GoDaddy
1. Go to **My Products** → **Domains** → **Manage DNS**
2. Click **Add** → Select **CNAME**
3. Enter the hostname (left part before your domain)
4. Enter the Points to value (right part)
5. Click **Save**

#### Namecheap
1. Go to **Domain List** → **Manage** → **Advanced DNS**
2. Click **Add New Record** → Select **CNAME Record**
3. Enter the Host (subdomain part)
4. Enter the Target (destination value)
5. Click the checkmark to save

#### Cloudflare
1. Go to **DNS** → **Records**
2. Click **Add record**
3. Type: **CNAME**
4. Name: hostname part
5. Target: destination value
6. Proxy status: DNS only (gray cloud)
7. Click **Save**

#### AWS Route 53
1. Go to **Hosted zones** → Select your domain
2. Click **Create record**
3. Record type: **CNAME**
4. Record name: hostname part
5. Value: destination value
6. TTL: 3600
7. Click **Create records**

#### Google Domains
1. Go to **My domains** → Select domain → **DNS**
2. Scroll to **Custom resource records**
3. Name: hostname part
4. Type: **CNAME**
5. TTL: 1H
6. Data: destination value
7. Click **Add**

---

## Step 3: Verify DNS Propagation

### Check Propagation

Use `dig` or `nslookup` to verify:

```bash
dig em123.samiatarot.com CNAME
dig s1._domainkey.samiatarot.com CNAME
dig s2._domainkey.samiatarot.com CNAME
```

Or use online tools:
- https://dnschecker.org
- https://www.whatsmydns.net

### Expected Timeline

- **DNS propagation**: 5 minutes to 48 hours
- **Typical time**: 15-30 minutes
- **SendGrid validation**: Can be checked immediately after DNS propagates

---

## Step 4: Validate with SendGrid

Once DNS has propagated, validate the domain:

```bash
export SENDGRID_API_KEY="your_api_key"
export SENDGRID_DOMAIN_ID="12345678"
bash scripts/sendgrid_auth_validate.sh
```

Look for `"valid": true` in the response.

If validation fails:
1. Double-check the CNAME records match exactly
2. Wait longer for DNS propagation
3. Clear DNS cache: `sudo dscacheutil -flushcache` (macOS) or `ipconfig /flushdns` (Windows)
4. Try validation again

---

## Troubleshooting

### Common Issues

**Issue**: DNS not propagating
- **Solution**: Wait up to 48 hours; check TTL settings

**Issue**: Validation fails with "DNS not found"
- **Solution**: Verify exact CNAME values; check for typos

**Issue**: Records exist but validation fails
- **Solution**: Ensure CNAME records point to SendGrid, not other services

### Support

- SendGrid Support: https://support.sendgrid.com
- Your DNS Provider's support documentation

---

## Rollback

To remove the authenticated domain:

```bash
curl -X DELETE \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  https://api.sendgrid.com/v3/whitelabel/domains/$SENDGRID_DOMAIN_ID
```

Then remove the three CNAME records from your DNS provider.