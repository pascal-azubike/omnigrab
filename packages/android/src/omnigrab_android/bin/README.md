# QuickJS Binary for Android

This folder contains the QuickJS JavaScript engine binary used by yt-dlp
to execute YouTube's JavaScript challenges on Android.

## What is QuickJS?

QuickJS is a lightweight JavaScript engine. yt-dlp uses it to solve
YouTube's JavaScript-based format token challenges, which improves:
- Format availability (more quality options)
- Access to age-restricted content (with cookies)
- Reliability of YouTube downloads overall

## Binary Source

The ARM64 Android binary should be obtained from:
https://github.com/nicowillis/quickjs-android

Download the `qjs` binary for `arm64-v8a` and place it here as `qjs`.

## How to Update

1. Download the latest ARM64 `qjs` binary from the link above.
2. Replace this `qjs` file.
3. Commit the binary to the repository.
4. The binary is included in the APK via Briefcase's `sources` configuration.

## What happens if the binary is missing?

OmniGrab will still work for most downloads. yt-dlp falls back to its
built-in Python implementation. You may see the warning:
  "No supported JavaScript runtime"
Basic YouTube downloads still function; some formats may be limited.

## Checking availability

In the OmniGrab Android app, go to Settings → About to see QuickJS status.
