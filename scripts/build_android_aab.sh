#!/bin/bash

# Build Android App Bundle (AAB) for Google Play
# Usage: ./build_android_aab.sh [debug|release]

set -e

BUILD_TYPE=${1:-release}
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$PROJECT_ROOT/android"

echo "Building Android App Bundle for $BUILD_TYPE..."

# Check if Android project exists
if [ ! -d "$ANDROID_DIR" ]; then
    echo "Error: Android directory not found at $ANDROID_DIR"
    exit 1
fi

cd "$ANDROID_DIR"

# Clean previous builds
echo "Cleaning previous builds..."
./gradlew clean

# Check environment variables for release builds
if [ "$BUILD_TYPE" = "release" ]; then
    if [ -z "$KEYSTORE_PASSWORD" ] || [ -z "$KEY_ALIAS" ] || [ -z "$KEY_PASSWORD" ]; then
        echo "Error: Release build requires KEYSTORE_PASSWORD, KEY_ALIAS, and KEY_PASSWORD environment variables"
        echo "Set these variables with your release keystore credentials"
        exit 1
    fi
    
    if [ ! -f "app/release.keystore" ]; then
        echo "Error: Release keystore not found at app/release.keystore"
        echo "Generate a release keystore first"
        exit 1
    fi
fi

# Build the AAB
if [ "$BUILD_TYPE" = "release" ]; then
    echo "Building release AAB..."
    ./gradlew bundleRelease
    
    AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
else
    echo "Building debug AAB..."
    ./gradlew bundleDebug
    
    AAB_PATH="app/build/outputs/bundle/debug/app-debug.aab"
fi

# Verify AAB was created
if [ -f "$AAB_PATH" ]; then
    echo "✅ AAB built successfully: $AAB_PATH"
    
    # Show AAB info
    echo ""
    echo "AAB Information:"
    ls -lh "$AAB_PATH"
    
    # Copy to outputs directory
    OUTPUTS_DIR="$PROJECT_ROOT/outputs"
    mkdir -p "$OUTPUTS_DIR"
    
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    OUTPUT_NAME="samia-tarot-${BUILD_TYPE}-${TIMESTAMP}.aab"
    
    cp "$AAB_PATH" "$OUTPUTS_DIR/$OUTPUT_NAME"
    echo "AAB copied to: $OUTPUTS_DIR/$OUTPUT_NAME"
    
    # Generate upload instructions
    cat > "$OUTPUTS_DIR/upload_instructions_${BUILD_TYPE}.md" << EOF
# Google Play Console Upload Instructions

## File Information
- **File**: $OUTPUT_NAME
- **Build Type**: $BUILD_TYPE
- **Built**: $(date)
- **Version**: 1.0.0 (Update in build.gradle for new releases)

## Upload Steps

### Internal Testing
1. Go to Google Play Console → Samia Tarot app
2. Navigate to Release → Testing → Internal testing
3. Click "Create new release"
4. Upload the AAB file: $OUTPUT_NAME
5. Add release notes (see below)
6. Review and rollout to internal testing

### Closed Testing
1. Create new release in Closed testing
2. Upload the same AAB
3. Set up test user groups
4. Rollout to closed testing

### Production (After Testing)
1. Create new production release
2. Upload the AAB
3. Complete store listing requirements
4. Submit for review

## Release Notes Template

### English
- Initial release of Samia Tarot
- Personalized tarot readings and spiritual guidance
- Voice calls with certified readers
- 18+ spiritual services with privacy protection
- GDPR-compliant data handling

### Arabic
- الإصدار الأول من سميا تاروت
- قراءات تاروت شخصية وإرشاد روحي
- مكالمات صوتية مع قراء معتمدين
- خدمات روحية للبالغين 18+ مع حماية الخصوصية
- التعامل مع البيانات وفقاً لقانون GDPR

## Pre-Upload Checklist
- [ ] Data Safety section completed
- [ ] Privacy Policy uploaded and linked
- [ ] Content rating set to 18+
- [ ] Account deletion URL configured
- [ ] Store listing content prepared
- [ ] Screenshots uploaded (including RTL for Arabic)
- [ ] App category set correctly
- [ ] Contact information updated
EOF

else
    echo "❌ AAB build failed"
    exit 1
fi

# Additional validation for release builds
if [ "$BUILD_TYPE" = "release" ]; then
    echo ""
    echo "Release Build Checklist:"
    echo "- [ ] Version code incremented in build.gradle"
    echo "- [ ] Version name updated in build.gradle"  
    echo "- [ ] Release notes prepared"
    echo "- [ ] Testing on internal track completed"
    echo "- [ ] Store listing updated"
    echo "- [ ] Privacy policy current"
    echo ""
    echo "Ready for Google Play Console upload!"
fi