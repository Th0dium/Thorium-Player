#!/bin/bash
# Build debug APK for Thorium Player

set -e

# Get the scripts directory
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPTS_DIR")"
ANDROID_DIR="$PROJECT_ROOT/android"

echo "🔨 Building Thorium Player Debug APK"
echo "📦 Project: $PROJECT_ROOT"
echo "📁 Android: $ANDROID_DIR"
echo ""

# Navigate to Android directory
cd "$ANDROID_DIR"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean

# Build APK
echo "🏗️  Building debug APK..."
./gradlew assembleDebug

# Check for output
APK_PATH="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(ls -lh "$APK_PATH" | awk '{print $5}')
    echo ""
    echo "✅ Build successful!"
    echo "📱 APK: $APK_PATH"
    echo "📊 Size: $APK_SIZE"
    echo ""
    echo "To install on device/emulator:"
    echo "  adb install -r \"$APK_PATH\""
else
    echo "❌ APK not found at expected location"
    exit 1
fi
