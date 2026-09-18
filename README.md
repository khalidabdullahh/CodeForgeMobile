<div align="center">

# ⚡ CodeForge Mobile

### *An Android-First, VS Code-Inspired Mobile IDE for Phones & Web*

<br />

<p align="center">
  <img src="preview.png" width="100%" alt="CodeForge Mobile IDE Preview" />
</p>

[![Try Web IDE](https://img.shields.io/badge/🚀_LAUNCH_WEB_IDE-codeforgemobile.pages.dev-2563eb?style=for-the-badge&logo=googlechrome&logoColor=white)](https://codeforgemobile.pages.dev)
[![Install App](https://img.shields.io/badge/📱_INSTALL_APP_(APK)-1--Click_Install-10b981?style=for-the-badge&logo=android&logoColor=white)](https://codeforgemobile.pages.dev)
[![GitHub Stars](https://img.shields.io/github/stars/khalidabdullahh/CodeForgeMobile?style=for-the-badge&color=f59e0b&logo=github)](https://github.com/khalidabdullahh/CodeForgeMobile)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<br />

# 🌐 [👉 CLICK HERE TO OPEN CODEFORGE MOBILE IDE 👈](https://codeforgemobile.pages.dev)
### 🔥 Build, test, and run code directly from your phone browser or install as an Android app!

<br />

---

</div>

## 🎯 Quick Actions (CTAs)

| Action | Direct Link | Description |
|---|---|---|
| 🚀 **Try Web IDE** | **[Launch Web IDE](https://codeforgemobile.pages.dev)** | Open full VS Code editor directly in Chrome / Safari with 0 setup |
| 📱 **Install App (APK/PWA)** | **[Install to Phone](https://codeforgemobile.pages.dev)** | 1-Click install to Android/iOS home screen for full offline use |
| 📦 **Download Source ZIP** | **[Download Workspace](https://codeforgemobile.pages.dev)** | Export entire project and code files as `.zip` archive |
| 🤖 **Android APK Packaging** | **[Capacitor Setup](https://codeforgemobile.pages.dev)** | Pre-configured Android Studio settings to build native APK/AAB |

---

## 🌟 Overview

**CodeForge Mobile** is a full-featured, phone-first coding IDE designed to bring a true desktop **VS Code** experience to smartphones and tablets. 

Powered by **Monaco Editor**, **AI Copilot (Gemini & OpenAI)**, **Offline Git**, and **Mobile Quick-Symbol Toolbars**, you can develop, debug, and preview web apps anywhere.

👉 **Official Live Website & App Hub:** **[https://codeforgemobile.pages.dev](https://codeforgemobile.pages.dev)**

---

## 🚀 Key Capabilities

- ⚡ **Monaco Editor Engine:** The exact engine powering desktop VS Code with IntelliSense, auto-completion, bracket coloring, and syntax highlighting.
- ⌨️ **Mobile Quick Symbol Bar:** One-tap coding toolbar with `{ }`, `( )`, `[ ]`, `<`, `>`, `=>`, `;`, `===`, `" "`, `' '`, `\``, `Tab`, `Undo`, and `Redo`.
- 🔄 **Landscape Mode Experience:** Turn your phone to landscape to unlock full desktop VS Code layout with side-by-side split screen and docked terminal.
- 🤖 **AI Coding Copilot:** Integrated Gemini & OpenAI assistant to explain code, fix syntax errors, and generate components directly into your active files.
- 🎨 **Multi-Theme Engine:** Switch seamlessly between **VS Code Dark**, **VS Code Light**, **Dracula**, **One Dark Pro**, **Monokai**, and **Synthwave '84**.
- 🖥️ **Live Interactive Preview & In-App Console:** Real-time web preview that captures `console.log`, `console.warn`, and `console.error` directly into the in-app terminal.
- 📴 **100% Offline PWA Ready:** Installable on Android, iOS, and Desktop as a standalone offline application.
- 📦 **One-Click Export:** Download your entire project workspace as a standard `.zip` file with zero configuration.

---

## 📱 How to Install on Android / iOS

1. Open **[https://codeforgemobile.pages.dev](https://codeforgemobile.pages.dev)** on your phone (Chrome on Android or Safari on iOS).
2. Tap the **`Install App (APK)`** button at the top right, or tap the browser menu **(⋮)**.
3. Select **"Add to Home screen"** or **"Install app"**.
4. The CodeForge icon will appear on your phone home screen and launch in full-screen landscape mode!

---

## 💻 Local Development

```bash
# 1. Clone the repository
git clone https://github.com/khalidabdullahh/CodeForgeMobile.git
cd CodeForgeMobile

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open your browser at `http://localhost:5173`.

### Production Build

```bash
npm run build
```

---

## 🤖 Building Android APK with Android Studio

You can easily compile CodeForge Mobile into a native Android APK:

```bash
# 1. Build the web distribution
npm run build

# 2. Sync web files with the native Android project
npx cap sync android

# 3. Open project directly in Android Studio
npx cap open android
```

In Android Studio:
1. Wait for Gradle sync to complete.
2. Go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**.
3. Once generated, locate the `.apk` in `android/app/build/outputs/apk/debug/app-debug.apk` and transfer/install it directly on your Android phone!

*(Automated APK builds are also generated on every release via GitHub Actions and available on [GitHub Releases](https://github.com/khalidabdullahh/CodeForgeMobile/releases)).*

---

## 🤝 Contributing & Security

Contributions are welcome! Please follow these steps:

1. **Fork** the repository: `https://github.com/khalidabdullahh/CodeForgeMobile`
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to your branch (`git push origin feature/amazing-feature`)
5. Open a **Pull Request**

Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) for more details.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 **Khalid Abdullah**. All rights reserved.
