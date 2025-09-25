# M39 Mobile QA Testing Matrix

## Device Testing Matrix

### Android Testing
| Device Class | OS Version | Min Test Devices |
|--------------|------------|------------------|
| Budget | Android 10 (API 29) | Samsung Galaxy A-series |
| Mid-range | Android 12 (API 31) | Google Pixel 6a |
| Flagship | Android 14 (API 34) | Samsung Galaxy S24 |

### iOS Testing
| Device Class | OS Version | Min Test Devices |
|--------------|------------|------------------|
| Older | iOS 15.0 | iPhone 11 |
| Current | iOS 16.0 | iPhone 13/14 |
| Latest | iOS 17.0 | iPhone 15 |

## Functional Testing Checklist

### Core App Functions
- [ ] **App Launch**: Clean startup within 3 seconds
- [ ] **Splash Screen**: 2-second display with cosmic theme
- [ ] **Web Content Loading**: Main app loads correctly
- [ ] **Navigation**: All routes accessible
- [ ] **Authentication**: Login/signup flows work

### Deep Link Testing
#### Custom Scheme (`samiatarot://`)
- [ ] `samiatarot://` - Opens main app
- [ ] `samiatarot://order/123` - Opens specific order
- [ ] `samiatarot://profile` - Opens user profile
- [ ] Invalid URLs rejected gracefully

#### Universal Links (`https://samiatarot.com`)
- [ ] `https://samiatarot.com` - Opens in app (not browser)
- [ ] `https://samiatarot.com/order/123` - Deep links to order
- [ ] Links from SMS/email work correctly
- [ ] Fallback to browser if app not installed

### Security Testing
- [ ] **HTTPS Only**: All network requests use HTTPS
- [ ] **Certificate Validation**: Invalid certificates rejected
- [ ] **No Debug Console**: Developer tools disabled in production builds
- [ ] **Content Security Policy**: CSP headers present and enforced
- [ ] **Screen Recording Protection**: Sensitive content protected (iOS)

### Performance Testing
#### Core Web Vitals in WebView
- [ ] **LCP (Largest Contentful Paint)**: < 2.5s
- [ ] **FID (First Input Delay)**: < 100ms
- [ ] **CLS (Cumulative Layout Shift)**: < 0.1
- [ ] **Memory Usage**: Stable under 150MB
- [ ] **Battery Impact**: Minimal background usage

### Network Testing
- [ ] **Offline Behavior**: Graceful offline message
- [ ] **Poor Connection**: App remains responsive on 3G
- [ ] **Connection Recovery**: Auto-retry on network restore
- [ ] **Timeout Handling**: Proper error messages for timeouts

### User Experience Testing
- [ ] **Responsive Design**: UI adapts to screen sizes
- [ ] **Touch Interactions**: All buttons/links respond correctly
- [ ] **Keyboard Navigation**: Virtual keyboard doesn't break layout
- [ ] **Orientation Changes**: App handles portrait/landscape
- [ ] **System Back Button** (Android): Proper navigation behavior

## Store Compliance Testing

### Android (Play Store)
- [ ] **Minimal Permissions**: Only INTERNET + ACCESS_NETWORK_STATE
- [ ] **Data Safety**: Form matches actual data collection
- [ ] **Content Rating**: Appropriate for target audience
- [ ] **App Bundle**: AAB format, signed correctly
- [ ] **Target API Level**: Meets current Play Store requirements

### iOS (App Store)
- [ ] **Privacy Nutrition Labels**: Accurate data collection disclosure
- [ ] **Privacy Manifest**: iOS 17+ requirements met
- [ ] **App Transport Security**: HTTPS enforcement configured
- [ ] **Associated Domains**: Universal links properly configured
- [ ] **Code Signing**: Valid certificates and provisioning profiles

## Automated Testing Scripts

### Performance Monitoring
```bash
# Web Core Vitals in WebView
npm run performance:mobile

# Memory profiling
npm run mobile:profile

# Network request audit
npm run mobile:network-audit
```

### Deep Link Testing
```bash
# Android
adb shell am start -W -a android.intent.action.VIEW -d "samiatarot://order/123" com.samia.tarot

# iOS Simulator
xcrun simctl openurl booted "samiatarot://order/123"
```

### Security Testing
```bash
# Check for debug symbols
nm -D app-release.aab | grep -i debug

# Verify certificate pinning
openssl s_client -connect samiatarot.com:443 -servername samiatarot.com
```

## Accessibility Testing
- [ ] **VoiceOver** (iOS): Screen reader navigation works
- [ ] **TalkBack** (Android): Screen reader support
- [ ] **Large Text**: UI remains usable with 200% text size
- [ ] **High Contrast**: App remains readable in high contrast mode
- [ ] **Color Blindness**: UI doesn't rely solely on color

## Edge Case Testing
- [ ] **Low Storage**: App handles low device storage
- [ ] **Background/Foreground**: State preserved on app switching
- [ ] **System Interruptions**: Handles calls, notifications gracefully
- [ ] **App Updates**: Smooth update process without data loss
- [ ] **Multiple Instances**: Only one app instance runs

## Regression Testing (Post-Update)
- [ ] **Existing User Data**: Preserved after updates
- [ ] **Authentication State**: Login persists appropriately
- [ ] **Deep Links**: Still work after app updates
- [ ] **Performance**: No degradation in load times
- [ ] **Visual Consistency**: UI matches previous version

## Browser Fallback Testing
- [ ] **App Not Installed**: Universal links open in browser
- [ ] **Old App Version**: Graceful handling of unsupported deep links
- [ ] **Browser Compatibility**: Web app works in mobile browsers
- [ ] **PWA Features**: Add to home screen option available

## Test Execution Schedule

### Pre-Release (Required)
1. **Device Matrix Testing**: All target devices/OS combinations
2. **Deep Link Testing**: Full suite on 2 Android + 2 iOS devices
3. **Security Testing**: Automated scans + manual verification
4. **Performance Testing**: Core Web Vitals measurement

### Post-Release Monitoring
1. **Crash Reporting**: Monitor via Sentry integration
2. **Performance Monitoring**: Real user metrics
3. **Store Reviews**: Monitor for common issues
4. **Usage Analytics**: Deep link adoption rates

## Pass/Fail Criteria

### Must Pass (Blockers)
- App launches successfully on all test devices
- Deep links work on latest OS versions
- No security vulnerabilities detected
- Core Web Vitals meet targets
- Store compliance requirements met

### Should Pass (High Priority)
- Performance targets met on older devices
- Accessibility features work correctly
- Edge cases handled gracefully
- Battery usage within acceptable limits

### Nice to Have
- Advanced accessibility features
- Perfect performance on all devices
- Zero minor UI inconsistencies

## Test Result Documentation
- Create test report with device screenshots
- Document any workarounds or known issues
- Track performance metrics over time
- Generate store submission checklist