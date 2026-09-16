# CodeForge Mobile

An Android-first, VS Code-inspired coding IDE for phones and the web.

## Current capabilities

- Monaco editor
- Syntax highlighting and IntelliSense-style suggestions
- Virtual project/file workspace
- File search and search-in-files
- Tabs, create/rename/duplicate/delete
- Integrated terminal UI and runtime preview
- Local Git workflow, branches and commits
- Extension catalog UI
- Project import/export
- PWA/offline workspace
- Capacitor Android packaging configuration

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Android

See `android/README.md`.

Note: the current browser runtime simulates terminal/process execution and local Git state. A real shell, remote Git provider integration, native APK/AAB compilation, and full VS Code extension host require additional native/cloud runtime infrastructure.
