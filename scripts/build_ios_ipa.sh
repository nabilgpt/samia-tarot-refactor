#!/bin/bash

# Build iOS IPA for App Store and TestFlight
# Usage: ./build_ios_ipa.sh [debug|release]

set -e

BUILD_TYPE=${1:-release}
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$PROJECT_ROOT/ios"

echo "Building iOS IPA for $BUILD_TYPE..."

# Check if iOS project exists
if [ ! -d "$IOS_DIR" ]; then
    echo "Error: iOS directory not found at $IOS_DIR"
    exit 1
fi

# Check for Xcode
if ! command -v xcodebuild &> /dev/null; then
    echo "Error: Xcode command line tools not found"
    echo "Install with: xcode-select --install"
    exit 1
fi

cd "$IOS_DIR"

# Configuration based on build type
if [ "$BUILD_TYPE" = "release" ]; then
    CONFIGURATION="Release"
    SCHEME="SamiaTarot"
    EXPORT_METHOD="app-store"
else
    CONFIGURATION="Debug"
    SCHEME="SamiaTarot"
    EXPORT_METHOD="development"
fi

# Clean and build
echo "Cleaning workspace..."
xcodebuild clean -workspace SamiaTarot.xcworkspace -scheme "$SCHEME" -configuration "$CONFIGURATION"

echo "Building archive..."
ARCHIVE_PATH="$PROJECT_ROOT/outputs/SamiaTarot-${BUILD_TYPE}.xcarchive"
mkdir -p "$(dirname "$ARCHIVE_PATH")"

xcodebuild archive \
    -workspace SamiaTarot.xcworkspace \
    -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -archivePath "$ARCHIVE_PATH" \
    -destination "generic/platform=iOS" \
    CODE_SIGN_STYLE=Manual \
    DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM_ID:-}" \
    CODE_SIGN_IDENTITY="${CODE_SIGN_IDENTITY:-iPhone Distribution}" \
    PROVISIONING_PROFILE_SPECIFIER="${PROVISIONING_PROFILE_NAME:-}"

# Export IPA
echo "Exporting IPA..."
EXPORT_OPTIONS_PATH="$PROJECT_ROOT/outputs/ExportOptions.plist"

# Create export options plist
cat > "$EXPORT_OPTIONS_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>$EXPORT_METHOD</string>
    <key>teamID</key>
    <string>${DEVELOPMENT_TEAM_ID:-TEAM_ID_HERE}</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
    <key>manageAppVersionAndBuildNumber</key>
    <false/>
    <key>destination</key>
    <string>export</string>
</dict>
</plist>
EOF

IPA_EXPORT_PATH="$PROJECT_ROOT/outputs/SamiaTarot-${BUILD_TYPE}-ipa"
xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$IPA_EXPORT_PATH" \
    -exportOptionsPlist "$EXPORT_OPTIONS_PATH"

# Verify IPA was created
IPA_FILE="$IPA_EXPORT_PATH/SamiaTarot.ipa"
if [ -f "$IPA_FILE" ]; then
    echo "✅ IPA built successfully: $IPA_FILE"
    
    # Show IPA info
    echo ""
    echo "IPA Information:"
    ls -lh "$IPA_FILE"
    
    # Rename with timestamp
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    FINAL_IPA="$PROJECT_ROOT/outputs/samia-tarot-${BUILD_TYPE}-${TIMESTAMP}.ipa"
    cp "$IPA_FILE" "$FINAL_IPA"
    echo "IPA copied to: $FINAL_IPA"
    
    # Generate upload instructions
    cat > "$PROJECT_ROOT/outputs/testflight_upload_instructions.md" << EOF
# TestFlight and App Store Upload Instructions

## File Information
- **File**: samia-tarot-${BUILD_TYPE}-${TIMESTAMP}.ipa
- **Build Type**: $BUILD_TYPE
- **Built**: $(date)
- **Archive**: $ARCHIVE_PATH

## Upload to TestFlight

### Using Xcode
1. Open Xcode
2. Window → Organizer
3. Select the archive: SamiaTarot-${BUILD_TYPE}.xcarchive
4. Click "Distribute App"
5. Select "App Store Connect"
6. Follow the upload wizard

### Using Transporter App
1. Download Transporter from Mac App Store
2. Sign in with Apple Developer account
3. Drag and drop the IPA file
4. Click "Deliver"

### Using Command Line
\`\`\`bash
xcrun altool --upload-app \\
    --type ios \\
    --file "$FINAL_IPA" \\
    --username "your-apple-id@email.com" \\
    --password "app-specific-password"
\`\`\`

## App Store Connect Configuration

### TestFlight
1. Go to App Store Connect → Apps → Samia Tarot
2. Navigate to TestFlight tab
3. Select the uploaded build
4. Add "What to Test" notes:
   - Test spiritual reading booking flow
   - Verify 18+ age gate functionality  
   - Test voice call quality with readers
   - Validate payment processing
   - Check Arabic/English language switching
   - Confirm privacy settings and data deletion

### App Store Submission
1. Complete App Store tab configuration:
   - App Information (18+ age rating)
   - Pricing and Availability
   - Privacy details (using PrivacyInfo.xcprivacy)
   - App Store screenshots (EN/AR, iPhone/iPad)
2. Submit for Review

## Pre-Upload Checklist
- [ ] Privacy manifest (PrivacyInfo.xcprivacy) included
- [ ] App Store privacy questions completed
- [ ] 18+ age rating configured
- [ ] Screenshots prepared (including Arabic RTL)
- [ ] App description ready (EN/AR)
- [ ] Keywords and categories selected
- [ ] Support and privacy policy URLs updated
- [ ] Review notes prepared for spiritual content

## Privacy Manifest Verification
The build includes PrivacyInfo.xcprivacy with:
- Data collection types and purposes
- Required reason APIs used
- Third-party SDK data collection
- No tracking across apps

## Known Review Considerations
- Spiritual/fortune-telling content requires 18+ rating
- Voice communication features need clear explanation
- Payment processing must be transparent
- Data handling must match privacy disclosures
- Arabic localization should be complete and accurate
EOF

else
    echo "❌ IPA build failed"
    exit 1
fi

echo ""
if [ "$BUILD_TYPE" = "release" ]; then
    echo "Release Build Complete!"
    echo "Ready for TestFlight upload and App Store submission"
else
    echo "Debug Build Complete!"
    echo "Ready for internal testing"
fi