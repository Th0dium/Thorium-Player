#!/bin/bash
# Build release APK/AAB for Thorium Player

set -e

# Get the scripts directory
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPTS_DIR")"
ANDROID_DIR="$PROJECT_ROOT/android"

echo "🔨 Building Thorium Player Release"
echo "📦 Project: $PROJECT_ROOT"
echo "📁 Android: $ANDROID_DIR"
echo ""

# Check for required environment variables
if [ -z "$RELEASE_KEYSTORE" ]; then
    echo "❌ Error: RELEASE_KEYSTORE environment variable not set"
    echo "Set it to the path of your release keystore file"
    exit 1
fi

if [ ! -f "$RELEASE_KEYSTORE" ]; then
    echo "❌ Error: Keystore file not found: $RELEASE_KEYSTORE"
    exit 1
fi

if [ -z "$RELEASE_KEYSTORE_PASSWORD" ] || [ -z "$RELEASE_KEY_ALIAS" ] || [ -z "$RELEASE_KEY_PASSWORD" ]; then
    echo "❌ Error: Missing keystore credentials environment variables"
    echo "Required:"
    echo "  - RELEASE_KEYSTORE_PASSWORD"
    echo "  - RELEASE_KEY_ALIAS"
    echo "  - RELEASE_KEY_PASSWORD"
    exit 1
fi

# Navigate to Android directory
cd "$ANDROID_DIR"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean

# Build APK
echo "🏗️  Building release APK..."
./gradlew assembleRelease

# Build AAB (recommended for Play Store)
echo "📦 Building Android App Bundle (AAB)..."
./gradlew bundleRelease

# Check for outputs
APK_PATH="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
AAB_PATH="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"

if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(ls -lh "$APK_PATH" | awk '{print $5}')
    echo ""
    echo "✅ Release APK built successfully!"
    echo "📱 APK: $APK_PATH"
    echo "📊 Size: $APK_SIZE"
else
    echo "⚠️  Release APK not found"
fi

if [ -f "$AAB_PATH" ]; then
    AAB_SIZE=$(ls -lh "$AAB_PATH" | awk '{print $5}')
    echo ""
    echo "✅ Release AAB built successfully!"
    echo "📱 AAB: $AAB_PATH"
    echo "📊 Size: $AAB_SIZE"
    echo ""
    echo "📤 To upload to Play Store:"
    echo "  1. Go to Google Play Console"
    echo "  2. Select your app"
    echo "  3. Go to Releases > Production"
    echo "  4. Upload the AAB file"
else
    echo "⚠️  AAB not found"
fi
