# 🚀 Quick Start - Android Build Commands

## Build Scripts Ready

All build scripts are configured and ready to use:

### 1. Debug APK (for testing)
```bash
cd /mnt/c/Dev/Thorium-player
./scripts/build-debug-apk.sh
```
**Output**: `android/android/app/build/outputs/apk/debug/app-debug.apk`

### 2. Release Keystore (one-time setup)
```bash
./scripts/generate-keystore.sh
```
This creates a release keystore and shows environment variables needed.

### 3. Release APK/AAB (for Play Store)
```bash
# First, set environment variables from keystore generation
export RELEASE_KEYSTORE="/path/to/thorium-release.keystore"
export RELEASE_KEYSTORE_PASSWORD="your-password"
export RELEASE_KEY_ALIAS="thorium-key"
export RELEASE_KEY_PASSWORD="your-key-password"

# Then build
./scripts/build-release.sh
```
**Output**: 
- APK: `android/android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/android/app/build/outputs/bundle/release/app-release.aab`

## Environment Status

✅ Java JDK 17 installed
✅ Gradle 8.3 configured
✅ npm dependencies installed
✅ Build scripts ready

## Next Steps

1. **Test build**: Run `./scripts/build-debug-apk.sh`
2. **Install on device**: `adb install android/android/app/build/outputs/apk/debug/app-debug.apk`
3. **For Play Store**: Run `./scripts/generate-keystore.sh` then `./scripts/build-release.sh`

## Troubleshooting

If build fails:
```bash
# Clean and retry
cd android/android
./gradlew clean
./gradlew assembleDebug
```

Check logs:
```bash
tail -100 /mnt/c/Dev/Thorium-player/build_debug.log
```

## File Paths

- Scripts: `/mnt/c/Dev/Thorium-player/scripts/`
- Android project: `/mnt/c/Dev/Thorium-player/android/android/`
- App build config: `/mnt/c/Dev/Thorium-player/android/android/app/build.gradle`
- Manifest: `/mnt/c/Dev/Thorium-player/android/android/app/src/main/AndroidManifest.xml`
