# Contributing to CodeForge Mobile

First off, thank you for considering contributing to CodeForge Mobile! 🎉

## How to Contribute

To maintain project quality and security, direct pushes to `main` are restricted. All contributions must go through the Pull Request (PR) process.

### 1. Fork & Clone
1. Fork the repository on GitHub: `https://github.com/khalidabdullahh/CodeForgeMobile`
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/CodeForgeMobile.git
   cd CodeForgeMobile
   ```

### 2. Create a Feature Branch
Always create a new branch from `main`:
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 3. Development Workflow
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local dev server:
   ```bash
   npm run dev
   ```
3. Test your changes thoroughly on both desktop and mobile viewports.

### 4. Commit Guidelines
- Write clear, concise commit messages.
- Format: `feat: add quick symbol bar for mobile keyboard` or `fix: resolve tab switching issue`.

### 5. Submit a Pull Request
1. Push your branch to your GitHub fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request against the `main` branch of `khalidabdullahh/CodeForgeMobile`.
3. Complete the PR template description.
4. Wait for maintainer review and approval.

---

## Code Style & Standards
- Follow React and TypeScript best practices.
- Use clean Tailwind CSS utility classes.
- Ensure the UI remains responsive and touch-friendly for mobile devices.
