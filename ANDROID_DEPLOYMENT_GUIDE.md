# 🚀 Thorium Player - Android Deployment Guide

## Overview

This guide walks you through building and deploying Thorium Player to Android devices and the Google Play Store.

## Prerequisites

- Java Development Kit (JDK) 17+
- Android SDK (automatically managed by Gradle)
- Node.js 18+
- npm 8+
- USB-connected device OR Android emulator (for testing)

## Part 1: Environment Setup

### 1.1 Install Java (if not done)

```bash
sudo apt update
sudo apt install -y openjdk-17-jdk
```

Verify:
```bash
java -version
javac -version
```

### 1.2 Verify Node & npm

```bash
node --version  # Should be 18+
npm --version   # Should be 8+
```

### 1.3 Install Dependencies

```bash
cd /mnt/c/Dev/Thorium-player
npm install
```

## Part 2: Build Debug APK

### 2.1 Quick Build

```bash
cd /mnt/c/Dev/Thorium-player/android/android
./gradlew assembleDebug
```

**Output**: `app/build/outputs/apk/debug/app-debug.apk`

### 2.2 Using Build Script

```bash
cd /mnt/c/Dev/Thorium-player
./scripts/build-debug-apk.sh
```

## Part 3: Testing

### 3.1 With Connected Device

```bash
# Enable USB debugging on phone
# Connect phone via USB

# Install APK
adb install -r android/android/app/build/outputs/apk/debug/app-debug.apk

# Or use the React Native command
npm run android
```

### 3.2 With Emulator

```bash
# Open Android Emulator first (from Android Studio)
npm run android
```

## Part 4: Release Build Setup

### 4.1 Generate Signing Keystore

```bash
./scripts/generate-keystore.sh
```

This creates a keystore and shows you the environment variables to set.

**⚠️ Important**: Store your keystore securely! You'll need it for all future updates.

### 4.2 Configure Release Signing

Set environment variables:

```bash
export RELEASE_KEYSTORE="/path/to/thorium-release.keystore"
export RELEASE_KEYSTORE_PASSWORD="your-password"
export RELEASE_KEY_ALIAS="thorium-key"
export RELEASE_KEY_PASSWORD="your-key-password"
```

Or create `.env.local`:
```
RELEASE_KEYSTORE=/full/path/to/thorium-release.keystore
RELEASE_KEYSTORE_PASSWORD=password
RELEASE_KEY_ALIAS=thorium-key
RELEASE_KEY_PASSWORD=password
```

### 4.3 Build Release APK

```bash
./scripts/build-release.sh
```

**Outputs**:
- APK: `android/android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/android/app/build/outputs/bundle/release/app-release.aab`

**Note**: Use AAB (Android App Bundle) for Play Store. Use APK only for direct distribution.

## Part 5: Google Play Store Deployment

### 5.1 Prepare Store Listing

1. **Create developer account** at https://play.google.com/console
2. **Create new app**:
   - Name: Thorium Player
   - Default language: English
   - App category: Music & Audio

### 5.2 App Content

Fill in these sections in Play Console:

**App Details**:
- Title: Thorium Player
- Short description (80 chars): "Offline music player with AI-powered playlists and smart tagging"
- Full description (4000 chars): Add complete feature list

**Graphics**:
- Phone screenshots (up to 8): Show UI, player, playlists, AI features
- Feature graphic (1024×500px): Highlight main feature
- App icon (512×512px): Use app icon from project

**Gameplay**:
- Video: Optional, but recommended (show app in action)

**Content Ratings**:
- Run content rating questionnaire
- Typically rates as "Everyone" or "Everyone 10+"

**Pricing & Distribution**:
- Select countries
- Set price tier

### 5.3 Build & Upload

1. **Ensure you have release AAB**:
   ```bash
   ./scripts/build-release.sh
   ```

2. **In Play Console**:
   - Go to `Release > Production`
   - Create new release
   - Upload AAB file
   - Add release notes
   - Review final checks
   - Submit for review

### 5.4 Review Process

Google typically reviews within 24-48 hours. You'll receive email notification when:
- Approved - app goes live
- Rejected - review rejection reasons with fixes needed

Common rejection reasons:
- Broken functionality
- Crash on startup
- Missing privacy policy
- Misleading description

## Part 6: Updates & Maintenance

### Version Management

Each Play Store release requires incrementing `versionCode`:

Edit `android/android/app/build.gradle`:
```groovy
defaultConfig {
    ...
    versionCode 2          // Increment for each release
    versionName "1.0.1"    // Semantic versioning
}
```

### Release Notes

Every release should include:
- Bug fixes
- New features
- Performance improvements
- Library updates

### Minimum Version Requirements

```groovy
android {
    defaultConfig {
        minSdkVersion 21         // Android 5.0
        targetSdkVersion 34      // Android 14
    }
}
```

## Part 7: Runtime Permissions

Thorium Player needs runtime permissions for Android 6+:

Add to your code (in React Native component):

```typescript
import { PermissionsAndroid } from 'react-native';

export async function requestMusicPermissions() {
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    ]);
    
    if (granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('Music permissions granted');
    }
  } catch (err) {
    console.warn(err);
  }
}
```

Call this on app launch.

## Part 8: Troubleshooting

### "Cannot find gradle" error

```bash
# Ensure gradle executable exists
ls -la android/android/gradlew

# If missing, copy it
cp android/android/gradlew* android/
cp -r android/android/gradle android/
```

### Build fails with "OutOfMemoryError"

Increase Gradle heap in `android/android/gradle.properties`:

```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
```

### APK not found after build

Check build output directory:
```bash
ls -la android/android/app/build/outputs/apk/debug/
```

Clean and rebuild:
```bash
cd android/android
./gradlew clean assembleDebug
```

### App crashes on start

Check logs:
```bash
adb logcat | grep -i thorium
```

### Large APK size

Enable ProGuard minification in `build.gradle`:
```groovy
buildTypes {
    release {
        minifyEnabled true
        proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
    }
}
```

## Part 9: Monitoring & Analytics

Add Firebase or Sentry for:
- Crash reporting
- User analytics
- Performance monitoring
- Error tracking

## Commands Reference

| Task | Command |
|------|---------|
| Build debug APK | `./scripts/build-debug-apk.sh` |
| Build release | `./scripts/build-release.sh` |
| Generate keystore | `./scripts/generate-keystore.sh` |
| Clean build | `cd android/android && ./gradlew clean` |
| Check Gradle | `./gradlew --version` |
| View logs | `adb logcat` |
| Install APK | `adb install -r app.apk` |
| Run on device | `npm run android` |

## Useful Links

- [React Native Android Docs](https://reactnative.dev/docs/android-native-modules)
- [Google Play Console](https://play.google.com/console)
- [Android Gradle Plugin](https://developer.android.com/studio/releases/gradle-plugin)
- [Play Store App Review Guidelines](https://play.google.com/about/developer-content-policy/)

## Support

For issues specific to Thorium Player's Android implementation, check:
- `scripts/` - Build automation scripts
- `android/android/` - Android project files
- `ANDROID_DEPLOYMENT.md` - Configuration details
