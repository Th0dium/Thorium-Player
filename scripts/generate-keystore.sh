#!/bin/bash
# Generate release keystore for Thorium Player

set -e

# Get the scripts directory
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPTS_DIR")"
ANDROID_DIR="$PROJECT_ROOT/android"

echo "🔐 Generate Release Keystore for Thorium Player"
echo ""

KEYSTORE_FILE="$ANDROID_DIR/app/thorium-release.keystore"

if [ -f "$KEYSTORE_FILE" ]; then
    echo "⚠️  Keystore already exists at: $KEYSTORE_FILE"
    read -p "Overwrite? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled"
        exit 0
    fi
fi

echo ""
echo "Enter keystore details (leave blank to use defaults):"
echo ""

read -p "Keystore password [thorium2026]: " -r KEYSTORE_PASS
KEYSTORE_PASS=${KEYSTORE_PASS:-thorium2026}

read -p "Key alias [thorium-key]: " -r KEY_ALIAS
KEY_ALIAS=${KEY_ALIAS:-thorium-key}

read -p "Key password [same as keystore password]: " -r KEY_PASS
KEY_PASS=${KEY_PASS:-$KEYSTORE_PASS}

read -p "Your name: " -r NAME
read -p "Your organization: " -r ORG
read -p "Your city: " -r CITY
read -p "Your state: " -r STATE
read -p "Your country code (e.g., US): " -r COUNTRY

echo ""
echo "🔑 Generating keystore..."

keytool -genkey -v \
    -keystore "$KEYSTORE_FILE" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -alias "$KEY_ALIAS" \
    -storepass "$KEYSTORE_PASS" \
    -keypass "$KEY_PASS" \
    -dname "CN=$NAME, O=$ORG, L=$CITY, ST=$STATE, C=$COUNTRY"

echo ""
echo "✅ Keystore generated successfully!"
echo ""
echo "📋 Keystore details:"
echo "  Location: $KEYSTORE_FILE"
echo "  Alias: $KEY_ALIAS"
echo ""
echo "🔒 Set these environment variables for release builds:"
echo "  export RELEASE_KEYSTORE=\"$KEYSTORE_FILE\""
echo "  export RELEASE_KEYSTORE_PASSWORD=\"$KEYSTORE_PASS\""
echo "  export RELEASE_KEY_ALIAS=\"$KEY_ALIAS\""
echo "  export RELEASE_KEY_PASSWORD=\"$KEY_PASS\""
echo ""
echo "Or add to a .env file:"
echo "  RELEASE_KEYSTORE=$KEYSTORE_FILE"
echo "  RELEASE_KEYSTORE_PASSWORD=$KEYSTORE_PASS"
echo "  RELEASE_KEY_ALIAS=$KEY_ALIAS"
echo "  RELEASE_KEY_PASSWORD=$KEY_PASS"
