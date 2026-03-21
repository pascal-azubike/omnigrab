#!/bin/bash
# create-keystore.sh
# Usage: ./create-keystore.sh [alias] [password]

ALIAS=${1:-omnigrab}
PASSWORD=${2:-omnigrab123}

echo "Generating release keystore for OmniGrab..."
keytool -genkey -v -keystore packages/android/omnigrab-release.jks \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -alias $ALIAS -storepass $PASSWORD -keypass $PASSWORD \
        -dname "CN=OmniGrab, OU=Development, O=OmniGrab, L=Default, S=Default, C=US"

echo "Keystore created: packages/android/omnigrab-release.jks"
echo "IMPORTANT: Add the base64 version to your GitHub Secrets (ANDROID_KEYSTORE_BASE64):"
base64 -w 0 packages/android/omnigrab-release.jks
