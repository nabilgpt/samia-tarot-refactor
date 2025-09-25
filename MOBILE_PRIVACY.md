# SAMIA TAROT Mobile App - Privacy & Store Metadata

## App Store Privacy Information

### Data Collection Summary
- **Minimal Data Collection**: Only essential data for app functionality
- **No Tracking**: App does not track users across other apps/websites
- **Server-Side Processing**: All sensitive operations handled server-side per M38

### Android (Play Store) - Data Safety Form

**Data types collected:**
- **Contact Info**: Email address (for account creation)
- **User Content**: Service requests, messages (for app functionality)

**Data sharing:** None with third parties
**Data security:** All data encrypted in transit and at rest
**Data retention:** Per privacy policy (M38 server-side policies apply)

### iOS (App Store) - Privacy Nutrition Labels

**Contact Info**
- Email Address: ✅ Used for app functionality, linked to user identity

**Usage Data**
- Performance data: ✅ Used for analytics, not linked to user identity

**Identifiers**
- User ID: ✅ Used for app functionality, linked to user identity

## App Permissions

### Android Permissions
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### iOS Permissions
- **None required** - Web-based app with no device access

## Deep Links & Universal Links

**Custom URL Scheme:** `samiatarot://`
**Universal Links:** `https://samiatarot.com/*`

### Supported URLs:
- `samiatarot://order/{id}` - Direct to order
- `samiatarot://profile` - User profile
- `https://samiatarot.com/order/{id}` - Universal link to order
- `https://samiatarot.com/app/*` - Any app route

## Security Features

### Network Security
- **HTTPS Only**: All network traffic encrypted
- **Certificate Pinning**: Trusted certificate authorities only
- **No Cleartext Traffic**: Android `usesCleartextTraffic="false"`

### App Transport Security (iOS)
- **NSAllowsArbitraryLoads**: `false` (HTTPS enforced)
- **Minimum TLS**: 1.2
- **Forward Secrecy**: Required for all connections

## App Store Descriptions

### Short Description (80 chars)
Professional tarot readings with verified readers - Book your session today

### Long Description
SAMIA TAROT connects you with verified professional tarot readers for authentic, insightful readings. Our platform ensures quality through reader verification and secure payment processing.

**Features:**
- Browse verified professional readers
- Book sessions with instant confirmation
- Secure payment processing
- Real-time session management
- Order history and invoices

**Why Choose SAMIA TAROT:**
✨ Verified professional readers only
🔒 Secure & private platform
📱 Seamless mobile experience
💎 Premium service quality
🌟 Authentic readings you can trust

**Getting Started:**
1. Create your account
2. Browse our verified readers
3. Book your session
4. Enjoy your reading

Our commitment to privacy and security means your personal information is protected with enterprise-grade security. All transactions are processed securely, and your reading history remains private.

### Keywords (100 chars)
tarot,reading,spiritual,astrology,psychic,fortune,cards,predictions,guidance,mystic

## App Categories
- **Primary**: Lifestyle
- **Secondary**: Entertainment

## Content Rating
- **Android**: Everyone (suitable for all ages with user verification)
- **iOS**: 17+ (in-app purchases, user-generated content)

## App Icon & Screenshots
- Use existing cosmic/neon theme assets
- No theme changes per M39 requirements
- Screenshots from actual web app interface

## Version History
- **1.0.0**: Initial mobile app release
- Based on existing web platform with full feature parity