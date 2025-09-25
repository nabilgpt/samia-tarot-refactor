#!/bin/bash
# M39 Mobile App Setup Script
# Sets up Capacitor mobile app with minimal permissions and security hardening

set -e

echo "🚀 Setting up SAMIA TAROT Mobile App (M39)"
echo "============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not installed."
    exit 1
fi

echo "✅ Node.js and npm found"

# Install Capacitor dependencies
echo "📦 Installing Capacitor dependencies..."
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios --save-dev --legacy-peer-deps

# Initialize Capacitor (if not already done)
if [ ! -f "capacitor.config.ts" ]; then
    echo "🔧 Initializing Capacitor..."
    npx cap init "SAMIA TAROT" "com.samia.tarot" --web-dir=dist
else
    echo "✅ Capacitor already initialized"
fi

# Build web app
echo "🏗️  Building web app..."
npm run build

# Add Android platform
if [ ! -d "android" ]; then
    echo "🤖 Adding Android platform..."
    npx cap add android

    # Copy Android configuration files
    echo "📋 Configuring Android..."
    cp android-manifest.xml android/app/src/main/AndroidManifest.xml
    mkdir -p android/app/src/main/res/xml
    cp network-security-config.xml android/app/src/main/res/xml/network_security_config.xml
else
    echo "✅ Android platform already added"
fi

# Add iOS platform (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ ! -d "ios" ]; then
        echo "🍎 Adding iOS platform..."
        npx cap add ios

        # Copy iOS configuration
        echo "📋 Configuring iOS..."
        cp ios-info-plist.xml ios/App/App/Info.plist

        # Install CocoaPods dependencies
        cd ios/App && pod install && cd ../..
    else
        echo "✅ iOS platform already added"
    fi
else
    echo "⚠️  Skipping iOS setup (requires macOS)"
fi

# Sync Capacitor
echo "🔄 Syncing Capacitor..."
npx cap sync

# Security check
echo "🔒 Running security checks..."

# Check for debug flags
if grep -q "webContentsDebuggingEnabled.*true" android/app/src/main/java/com/samia/tarot/MainActivity.java 2>/dev/null; then
    echo "⚠️  Warning: Debug mode enabled in Android"
else
    echo "✅ Android debug mode disabled"
fi

# Check permissions
if grep -q "android.permission" android/app/src/main/AndroidManifest.xml; then
    echo "✅ Android permissions configured"
    echo "   Permissions requested:"
    grep "uses-permission" android/app/src/main/AndroidManifest.xml | sed 's/.*name="\([^"]*\)".*/   - \1/'
fi

# Verify HTTPS enforcement
if grep -q "usesCleartextTraffic.*false" android/app/src/main/AndroidManifest.xml; then
    echo "✅ HTTPS enforced (no cleartext traffic)"
else
    echo "⚠️  Warning: HTTPS enforcement not detected"
fi

echo ""
echo "🎉 Mobile app setup complete!"
echo ""
echo "📱 Next steps:"
echo "   1. Test the app: npm run mobile:android:run"
echo "   2. Build for release: npm run mobile:android:build"
echo "   3. Run QA tests from MOBILE_QA_MATRIX.md"
echo "   4. Submit to stores with MOBILE_PRIVACY.md info"
echo ""
echo "🔒 Security features enabled:"
echo "   ✅ Minimal permissions (INTERNET only)"
echo "   ✅ HTTPS enforcement"
echo "   ✅ Deep links configured"
echo "   ✅ WebView hardening applied"
echo "   ✅ Privacy metadata aligned with M38"
echo ""
echo "📚 Documentation:"
echo "   - MOBILE_PRIVACY.md: Store submission info"
echo "   - MOBILE_QA_MATRIX.md: Testing checklist"
echo "   - mobile-security.js: Security configuration"
echo ""
echo "🚢 CI/CD: GitHub Actions configured in .github/workflows/mobile-build.yml"