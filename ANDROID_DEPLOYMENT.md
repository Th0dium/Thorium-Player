# Android Deployment Setup - Thorium Player

## ✅ Completed Steps

### 1. Development Environment
- ✅ Java JDK 17 installed
- ✅ Gradle 8.3 configured
- ✅ WSL terminal working
- ✅ npm dependencies installed

### 2. Android Configuration
- ✅ AndroidManifest.xml updated with:
  - Package name: `com.tempthorium`
  - Required permissions for music player:
    - READ_EXTERNAL_STORAGE (access music files)
    - WRITE_EXTERNAL_STORAGE (write metadata)
    - ACCESS_MEDIA_LOCATION (access media locations)
    - MODIFY_AUDIO_SETTINGS (control audio)
    - INTERNET (AI features)
    - CHANGE_NETWORK_STATE
    - ACCESS_NETWORK_STATE

### 3. Build Configuration
- ✅ Gradle paths corrected in `settings.gradle`
- ✅ Release signing configured in `build.gradle`
- ✅ Gradle wrapper files copied to android root

### 4. Build Scripts Created
- ✅ `scripts/build-debug-apk.sh` - Build debug APK
- ✅ `scripts/build-release.sh` - Build release APK/AAB
- ✅ `scripts/generate-keystore.sh` - Generate signing keystore

## 📋 Next Steps

### Step 1: Complete the APK Build
```bash
cd /mnt/c/Dev/Thorium-player
./gradlew assembleDebug
```

APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 2: Test on Device/Emulator
```bash
# Install debug APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Or run directly
npm run android
```

### Step 3: Generate Release Keystore
```bash
./scripts/generate-keystore.sh
```

This will create a signing keystore for Play Store releases.

### Step 4: Build Release APK/AAB
```bash
# Set environment variables (from generate-keystore output)
export RELEASE_KEYSTORE="/path/to/keystore"
export RELEASE_KEYSTORE_PASSWORD="password"
export RELEASE_KEY_ALIAS="alias"
export RELEASE_KEY_PASSWORD="password"

# Build
./scripts/build-release.sh
```

## 🚀 Play Store Deployment

1. Create Google Play Developer account
2. Create new app in Play Console
3. Build release AAB:
   ```bash
   ./scripts/build-release.sh
   ```
4. Upload AAB to Play Console
5. Complete app listing with:
   - Screenshots (5-8 per orientation)
   - Feature graphic
   - Short description
   - Full description
   - Category: Music & Audio
6. Set content rating questionnaire
7. Submit for review

## 📱 App Configuration

- **Package Name**: com.tempthorium
- **Min SDK**: API 21 (Android 5.0)
- **Target SDK**: API 34 (Android 14)
- **Build Tools**: 34.0.0
- **NDK Version**: 25.1.8937393

## 🔐 Security Notes

- Keep your release keystore safe
- Store credentials securely (use environment variables)
- Don't commit keystore to version control
- Use different keystores for different apps

## 📝 Configuration Files Modified

1. `android/android/app/build.gradle` - Added release signing config
2. `android/android/app/src/main/AndroidManifest.xml` - Added permissions and package
3. `android/android/settings.gradle` - Fixed gradle paths
4. `android/gradlew` & `android/gradlew.bat` - Copied from android/android
5. `android/gradle/` - Copied wrapper directory

## 🐛 Troubleshooting

### Build fails with "cannot find gradle"
- Ensure `android/gradlew` exists
- Run: `cp android/android/gradlew* android/`

### Missing permissions at runtime
- Implement runtime permissions for Android 6+
- Add to your code:
  ```typescript
  import { PermissionsAndroid } from 'react-native';
  
  const permissions = [
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  ];
  
  await PermissionsAndroid.requestMultiple(permissions);
  ```

### Build too slow
- Increase Gradle heap: Edit `android/gradle.properties`
- Add: `org.gradle.jvmargs=-Xmx4096m`

### APK not found after build
- Check build output: `android/app/build/outputs/apk/debug/`
- Clean and rebuild: `./gradlew clean assembleDebug`
