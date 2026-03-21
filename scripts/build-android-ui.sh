#!/bin/bash
# build-android-ui.sh
echo "Building OmniGrab UI for Android..."
cd packages/ui
npm run build:android
echo "UI build complete. Outputs located in packages/android/src/omnigrab_android/ui"
