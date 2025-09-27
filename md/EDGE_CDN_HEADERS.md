# Edge/CDN Headers Configuration

## Overview
Configure Nginx/Cloudflare headers for security, caching, and performance optimization.

---

## Security Headers

### 1. Content Security Policy (CSP)
**Purpose:** Prevent XSS attacks by controlling resource origins

```nginx
add_header Content-Security-Policy "
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https:;
    connect-src 'self' https://api.example.com https://*.supabase.co;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
" always;
```

**Cloudflare:**
```
Transform Rules > Modify Response Header
Header: Content-Security-Policy
Value: [same as above]
```

---

### 2. Strict-Transport-Security (HSTS)
**Purpose:** Enforce HTTPS

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

**Cloudflare:**
- Enable SSL/TLS > Always Use HTTPS
- Edge Certificates > Enable HSTS

---

### 3. X-Frame-Options
**Purpose:** Prevent clickjacking

```nginx
add_header X-Frame-Options "DENY" always;
```

---

### 4. X-Content-Type-Options
**Purpose:** Prevent MIME sniffing

```nginx
add_header X-Content-Type-Options "nosniff" always;
```

---

### 5. Referrer-Policy
**Purpose:** Control referrer information

```nginx
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

### 6. Permissions-Policy
**Purpose:** Control browser features

```nginx
add_header Permissions-Policy "
    geolocation=(),
    microphone=(),
    camera=(),
    payment=(),
    usb=(),
    magnetometer=(),
    gyroscope=()
" always;
```

---

## Caching Headers

### Static Assets (JS, CSS, Images)
**Cache for 1 year with immutable flag**

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header X-Content-Type-Options "nosniff" always;
}
```

**Cloudflare:**
```
Page Rules:
URL: *example.com/*.{js,css,png,jpg,jpeg,gif,svg,woff,woff2}
Cache Level: Cache Everything
Edge Cache TTL: 1 year
Browser Cache TTL: 1 year
```

---

### index.html (No Cache)
**Always revalidate for SPA routing**

```nginx
location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}
```

**Cloudflare:**
```
Page Rules:
URL: *example.com/
Cache Level: Bypass
```

---

### API Responses (CRITICAL: no-store)
**CRITICAL: Use Cache-Control: no-store for all sensitive API responses**

Per OWASP/MDN: `no-cache` allows caching with revalidation. Use `no-store` to prevent any caching.

```nginx
location /api/ {
    proxy_pass http://backend:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    add_header Cache-Control "no-store, must-revalidate, private" always;
    add_header Pragma "no-cache" always;
    add_header Expires "0" always;
}
```

---

### Signed URLs (CRITICAL: no-store)
**CRITICAL: Never cache short-lived signed URLs (≤15min TTL)**

```nginx
location ~ ^/api/.*/media$ {
    proxy_pass http://backend:5000;

    add_header Cache-Control "no-store, must-revalidate, private" always;
    add_header Pragma "no-cache" always;
    add_header Expires "0" always;
}
```

---

## CORS Headers

### Public Endpoints (Daily Horoscopes)
```nginx
location /api/horoscopes/daily {
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin '*';
        add_header Access-Control-Allow-Methods 'GET, OPTIONS';
        add_header Access-Control-Allow-Headers 'Content-Type';
        add_header Access-Control-Max-Age 86400;
        return 204;
    }

    add_header Access-Control-Allow-Origin '*' always;
    proxy_pass http://backend:5000;
}
```

### Authenticated Endpoints
```nginx
location /api/ {
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin 'https://example.com';
        add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS';
        add_header Access-Control-Allow-Headers 'Authorization, Content-Type';
        add_header Access-Control-Allow-Credentials 'true';
        add_header Access-Control-Max-Age 86400;
        return 204;
    }

    add_header Access-Control-Allow-Origin 'https://example.com' always;
    add_header Access-Control-Allow-Credentials 'true' always;
    proxy_pass http://backend:5000;
}
```

**Cloudflare:**
- Enable CORS in Transform Rules
- Allow Origin: `https://example.com`
- Allow Credentials: `true`

---

## Performance Headers

### 1. Compression (gzip/brotli)
```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
```

**Cloudflare:**
- Speed > Optimization > Auto Minify (Enable JS, CSS, HTML)
- Speed > Optimization > Brotli (Enable)

---

### 2. HTTP/2 & HTTP/3
```nginx
listen 443 ssl http2;
listen 443 quic reuseport;

add_header Alt-Svc 'h3=":443"; ma=86400';
```

**Cloudflare:**
- Automatically enabled for all sites

---

### 3. Early Hints (103)
```nginx
http2_push_preload on;

location / {
    add_header Link "</static/main.css>; rel=preload; as=style";
    add_header Link "</static/main.js>; rel=preload; as=script";
}
```

---

## Complete Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    listen 443 quic reuseport;
    server_name example.com;

    ssl_certificate /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none';" always;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;

    # Root
    root /var/www/html;
    index index.html;

    # Static Assets (1 year cache)
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # index.html (no cache)
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # API Proxy (no cache)
    location /api/ {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        add_header Pragma "no-cache" always;
    }

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=300r/m;

    location /api/ {
        limit_req zone=api burst=50 nodelay;
        limit_req_status 429;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Cloudflare Configuration

### Page Rules
1. **Static Assets:**
   - URL: `*example.com/*.{js,css,png,jpg,svg,woff2}`
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 year
   - Browser Cache TTL: 1 year

2. **API Routes:**
   - URL: `*example.com/api/*`
   - Cache Level: Bypass

3. **Root:**
   - URL: `*example.com/`
   - Cache Level: Standard

### Speed Settings
- Auto Minify: JS, CSS, HTML
- Brotli: Enabled
- Early Hints: Enabled
- HTTP/2: Enabled
- HTTP/3 (QUIC): Enabled

### Security Settings
- SSL/TLS: Full (strict)
- Always Use HTTPS: Enabled
- Automatic HTTPS Rewrites: Enabled
- HSTS: Enabled (max-age: 31536000, includeSubDomains, preload)

### Firewall Rules
- Block known bots
- Challenge suspicious traffic
- Rate limit: 300 req/min per IP

---

## Testing

### Verify Security Headers
```bash
curl -I https://example.com | grep -E "(Strict-Transport|X-Frame|X-Content|CSP|Referrer)"
```

**Expected:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self'; ...
Referrer-Policy: strict-origin-when-cross-origin
```

### Verify Cache Headers
```bash
# Static asset (should cache)
curl -I https://example.com/static/main.js | grep Cache-Control
# Expected: Cache-Control: public, immutable

# API endpoint (should NOT cache)
curl -I https://example.com/api/horoscopes/daily | grep Cache-Control
# Expected: Cache-Control: no-store, no-cache, must-revalidate
```

### Test HSTS Preload
```bash
# Check if domain is preloaded
curl https://hstspreload.org/api/v2/status?domain=example.com
```

---

## Checklist

- [ ] HSTS enabled with preload
- [ ] CSP configured with specific origins
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy configured
- [ ] Static assets cached for 1 year
- [ ] index.html never cached
- [ ] API responses never cached
- [ ] Signed URLs never cached
- [ ] Compression (gzip/brotli) enabled
- [ ] HTTP/2 and HTTP/3 enabled
- [ ] CORS headers configured
- [ ] Rate limiting at edge
- [ ] HTTP redirects to HTTPS
- [ ] Security headers tested with curl
- [ ] Cache headers verified
- [ ] SSL Labs grade A or A+