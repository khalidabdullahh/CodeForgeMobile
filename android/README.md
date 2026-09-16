# CodeForge Mobile Android Packaging

This directory contains the Capacitor-ready configuration for packaging the web IDE as an Android application.

## Build path

1. Build the web app with `npm run build`.
2. In a local development environment install Capacitor and add the Android platform.
3. Copy/use `android/capacitor.config.json` as the Capacitor configuration.
4. Run the Capacitor Android sync step.
5. Open the generated Android project in Android Studio and build an APK or AAB.

The hosted CodeForge web IDE itself cannot invoke Android Studio or produce a native APK inside the browser; this configuration makes the project ready for that final native packaging step.
