#!/bin/bash
# ============================================================
# scripts/aab-to-apk.sh
# Convert a Briefcase-built AAB to a universal APK using bundletool.
#
# Prerequisites:
#   - Java 17+ installed and in PATH
#   - bundletool JAR downloaded (set BUNDLETOOL_JAR env var or use default)
#   - Signing keystore (see scripts/create-keystore.sh to generate)
#
# Required environment variables:
#   VERSION                   — e.g. "1.0.0" (without the leading 'v')
#   ANDROID_KEYSTORE_PATH     — absolute path to .jks file
#   ANDROID_KEYSTORE_PASSWORD — keystore password
#   ANDROID_KEY_ALIAS         — key alias (e.g. "omnigrab")
#   ANDROID_KEY_PASSWORD      — key password (usually same as keystore password)
#
# Optional environment variables:
#   BUNDLETOOL_JAR            — path to bundletool JAR (default: bundletool.jar)
#   BUNDLETOOL_VERSION        — version to auto-download if JAR missing (default: 1.16.0)
#
# Usage:
#   export VERSION=1.0.0
#   export ANDROID_KEYSTORE_PATH=/path/to/omnigrab-release.jks
#   export ANDROID_KEYSTORE_PASSWORD=mypassword
#   export ANDROID_KEY_ALIAS=omnigrab
#   export ANDROID_KEY_PASSWORD=mypassword
#   bash scripts/aab-to-apk.sh
# ============================================================
set -euo pipefail

# ── Defaults ─────────────────────────────────────────────────────────
BUNDLETOOL_JAR="${BUNDLETOOL_JAR:-bundletool.jar}"
BUNDLETOOL_VERSION="${BUNDLETOOL_VERSION:-1.16.0}"

# ── Validate required env vars ───────────────────────────────────────
: "${VERSION:?VERSION env var is required (e.g. 1.0.0)}"
: "${ANDROID_KEYSTORE_PATH:?ANDROID_KEYSTORE_PATH env var is required}"
: "${ANDROID_KEYSTORE_PASSWORD:?ANDROID_KEYSTORE_PASSWORD env var is required}"
: "${ANDROID_KEY_ALIAS:?ANDROID_KEY_ALIAS env var is required}"
: "${ANDROID_KEY_PASSWORD:?ANDROID_KEY_PASSWORD env var is required}"

# ── Download bundletool if not present ───────────────────────────────
if [ ! -f "$BUNDLETOOL_JAR" ]; then
    echo "📦 Downloading bundletool ${BUNDLETOOL_VERSION}..."
    wget -q \
        "https://github.com/google/bundletool/releases/download/${BUNDLETOOL_VERSION}/bundletool-all-${BUNDLETOOL_VERSION}.jar" \
        -O "$BUNDLETOOL_JAR"
    echo "✓ bundletool downloaded"
fi

# ── Locate the AAB ───────────────────────────────────────────────────
AAB_PATH="packages/android/dist/OmniGrab-${VERSION}.aab"

if [ ! -f "$AAB_PATH" ]; then
    echo "❌ AAB not found: $AAB_PATH"
    echo "   Run: cd packages/android && briefcase package android"
    exit 1
fi

echo "📱 Converting $AAB_PATH → universal APK..."

# ── Build APK set ────────────────────────────────────────────────────
java -jar "$BUNDLETOOL_JAR" build-apks \
    --bundle="$AAB_PATH" \
    --output="omnigrab.apks" \
    --mode=universal \
    --ks="$ANDROID_KEYSTORE_PATH" \
    --ks-pass="pass:${ANDROID_KEYSTORE_PASSWORD}" \
    --ks-key-alias="${ANDROID_KEY_ALIAS}" \
    --key-pass="pass:${ANDROID_KEY_PASSWORD}"

# ── Extract universal APK ────────────────────────────────────────────
mkdir -p dist
APK_OUT="dist/OmniGrab-${VERSION}-android.apk"
unzip -p omnigrab.apks universal.apk > "$APK_OUT"
rm -f omnigrab.apks

# ── Summary ──────────────────────────────────────────────────────────
APK_SIZE=$(du -sh "$APK_OUT" | cut -f1)
echo ""
echo "✅ Signed APK created: $APK_OUT ($APK_SIZE)"
echo ""
echo "Install on a device with:"
echo "  adb install $APK_OUT"
echo ""
echo "Or enable 'Install from unknown sources' on the device"
echo "and transfer/open the APK directly."
