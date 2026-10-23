# 🤝 Contributing to CodeForge Mobile

Thank you for your interest in contributing to **CodeForge Mobile**! 🎉

CodeForge Mobile is an Android-first, VS Code-inspired mobile and web IDE designed, engineered, and exclusively owned by **Khalid Abdullah**. While the project is source-available (free to use and learn from, but not to copy and republish), community contributions such as bug fixes, mobile usability improvements, editor enhancements, animations, and documentation are warmly welcomed.

---

## 🛠️ How to Contribute

To maintain high code quality and security, direct pushes to `main` are restricted. All community contributions must go through GitHub Pull Requests (PRs).

### 1. Fork & Clone
1. Fork the repository on GitHub: [https://github.com/khalidabdullahh/CodeForgeMobile](https://github.com/khalidabdullahh/CodeForgeMobile)
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/CodeForgeMobile.git
   cd CodeForgeMobile
   ```

### 2. Create a Feature Branch
Always create a descriptive branch from `main`:
```bash
git checkout -b feature/mobile-symbol-enhancement
# or
git checkout -b fix/editor-layout-overflow
```

### 3. Development Workflow
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local development server:
   ```bash
   npm run dev
   ```
3. Test your changes thoroughly on both desktop and mobile viewports (portrait and landscape orientations).

### 4. Code Standards
- Write clean, modular React 19 and TypeScript code.
- Leverage Tailwind CSS utilities while maintaining responsive design.
- Ensure touch targets and gestures are optimized for mobile phone screens.
- Run typechecking prior to submitting:
  ```bash
  npm run typecheck
  ```

### 5. Submit a Pull Request
1. Push your branch to your GitHub fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request against the `main` branch of `khalidabdullahh/CodeForgeMobile`.
3. Provide a clear summary of your changes, along with mobile screenshots or video recordings if applicable.

---

## 📜 Contributor Terms & Ownership Grant

By submitting a Pull Request, issue, or patch to this repository, you explicitly agree to the following contributor terms:

1. **Original Work:** You certify that the contribution is your original creation or that you have sufficient legal rights and permissions to submit it.
2. **License Grant:** You grant **Khalid Abdullah** an irrevocable, perpetual, worldwide, non-exclusive, transferable, royalty-free license to use, merge, modify, adapt, publish, distribute, compile, and relicense your contribution as part of CodeForge Mobile or associated projects.
3. **Sole Ownership:** **Khalid Abdullah** retains 100% intellectual property ownership, copyright, trademark, and software rights for CodeForge Mobile.
4. **No Commercial Forks:** Contributions are integrated into the official upstream repository. Commercial repackaging, selling, or unauthorized relicensing of the codebase remains strictly prohibited under the project's [LICENSE](LICENSE).
