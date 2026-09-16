import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Code2,
  Coffee,
  Columns,
  Cpu,
  Download,
  ExternalLink,
  FolderGit2,
  Github,
  Globe,
  Info,
  Keyboard,
  Layers,
  Layout,
  Maximize2,
  Moon,
  Palette,
  Play,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Terminal,
  X,
  Zap
} from 'lucide-react';

interface LandingPageProps {
  onLaunchIde: () => void;
  onDownloadZip: () => void;
  onExportAndroid: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchIde,
  onDownloadZip,
  onExportAndroid,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalledSuccess(true);
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  return (
    <div className="landing-container">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="nav-content">
          <div className="nav-brand">
            <div className="nav-logo">
              <Code2 size={20} />
            </div>
            <span className="brand-name">CodeForge <span className="brand-sub">Mobile</span></span>
          </div>

          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#landscape">VS Code Vibe</a>
            <a href="#download">Download</a>
            <a href="#support">Support</a>
          </div>

          <div className="nav-actions">
            <a
              href="https://github.com/khalidabdullahh/CodeForgeMobile"
              target="_blank"
              rel="noreferrer"
              className="github-btn"
              title="Star on GitHub"
            >
              <Github size={16} />
              <span>Star Repo</span>
            </a>
            
            {/* Top Right: Install App / Download APK Button */}
            <button className="install-nav-btn" onClick={handleInstallClick}>
              <Download size={15} />
              <span>Install App (APK)</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-badge">
          <Sparkles size={14} className="text-yellow-400" />
          <span>Android-First VS Code-Inspired Mobile IDE · 100% Free & Open Source</span>
        </div>

        <h1 className="hero-title">
          Code Anytime, Anywhere <br />
          <span className="gradient-text">Right from Your Phone</span>
        </h1>

        <p className="hero-subtitle">
          CodeForge Mobile delivers a full-featured desktop VS Code experience in your pocket.
          Powered by Monaco Editor, AI Copilot, offline Git, and quick touch symbol toolbars.
        </p>

        <div className="hero-cta-group">
          <button className="cta-primary" onClick={onLaunchIde}>
            <Play size={18} />
            <span>Launch Web IDE</span>
            <ArrowRight size={18} />
          </button>

          <a
            href="https://buymeacoffee.com/khalidabdullah"
            target="_blank"
            rel="noreferrer"
            className="cta-coffee"
          >
            <Coffee size={18} />
            <span>Buy Me a Coffee</span>
          </a>

          <button className="cta-secondary" onClick={handleInstallClick}>
            <Download size={17} />
            <span>Install App / APK</span>
          </button>
        </div>

        {/* Hero Interactive App Mockup Frame */}
        <div className="hero-mockup-wrapper">
          <div className="mockup-header">
            <div className="mockup-dots">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
            </div>
            <span className="mockup-title">codeforge-workspace — Landscape Recommended</span>
            <button className="mockup-live-btn" onClick={onLaunchIde}>
              <Maximize2 size={13} /> Open Fullscreen
            </button>
          </div>

          <div className="mockup-body">
            <div className="mockup-sidebar">
              <div className="mockup-sidebar-title">EXPLORER</div>
              <div className="mockup-file selected">📄 index.html</div>
              <div className="mockup-file">🎨 style.css</div>
              <div className="mockup-file">⚡ script.js</div>
              <div className="mockup-file">🤖 ai-copilot.ts</div>
            </div>

            <div className="mockup-editor-area">
              <div className="mockup-tabs">
                <div className="mockup-tab active">index.html ✕</div>
                <div className="mockup-tab">style.css</div>
              </div>
              <div className="mockup-code">
                <span className="code-line"><span className="c-tag">&lt;!doctype</span> <span className="c-attr">html</span>&gt;</span>
                <span className="code-line">&lt;<span className="c-tag">div</span> <span className="c-attr">class</span>=<span className="c-str">"codeforge-pocket-ide"</span>&gt;</span>
                <span className="code-line indent">&lt;<span className="c-tag">h1</span>&gt;Pocket-Sized VS Code Power 🚀&lt;/<span className="c-tag">h1</span>&gt;</span>
                <span className="code-line indent">&lt;<span className="c-tag">button</span> <span className="c-attr">onclick</span>=<span className="c-str">"runMobileApp()"</span>&gt;Run&lt;/<span className="c-tag">button</span>&gt;</span>
                <span className="code-line">&lt;/<span className="c-tag">div</span>&gt;</span>
              </div>

              <div className="mockup-symbol-bar">
                <span>{'{ }'}</span>
                <span>( )</span>
                <span>[ ]</span>
                <span>=&gt;</span>
                <span>;</span>
                <span>===</span>
                <span>" "</span>
                <span>Tab</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Landscape Feature Highlight */}
      <section id="landscape" className="feature-highlight-section">
        <div className="section-header">
          <div className="section-pill">
            <Smartphone size={14} />
            <span>PRO LANDSCAPE EXPERIENCE</span>
          </div>
          <h2>Turn Your Phone into a Full Dev Machine</h2>
          <p>
            Flip your phone to <strong>Landscape Mode</strong> to unlock the genuine desktop VS Code vibe
            with side-by-side split editor, live interactive runtime preview, and docked terminal.
          </p>
        </div>

        <div className="landscape-grid">
          <div className="landscape-card">
            <div className="icon-badge"><Columns size={20} /></div>
            <h3>Split-Screen Preview</h3>
            <p>Code on the left, see instant live preview changes on the right with in-app console logging.</p>
          </div>

          <div className="landscape-card">
            <div className="icon-badge"><Keyboard size={20} /></div>
            <h3>Quick Symbol Bar</h3>
            <p>One-tap brackets, quotes, arrows, and operators so you don't struggle with mobile keyboard switches.</p>
          </div>

          <div className="landscape-card">
            <div className="icon-badge"><Bot size={20} /></div>
            <h3>AI Coding Copilot</h3>
            <p>Integrated Gemini & OpenAI assistant to explain code, fix bugs, and generate components automatically.</p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="features-section">
        <div className="section-header">
          <div className="section-pill">
            <Zap size={14} />
            <span>BUILT FOR DEVELOPERS</span>
          </div>
          <h2>Packed with Everything You Need</h2>
        </div>

        <div className="features-grid">
          <div className="feat-box">
            <div className="feat-icon"><Code2 size={22} /></div>
            <h4>Monaco Editor Engine</h4>
            <p>The exact same syntax highlighting, IntelliSense, and bracket pair colorization engine powering VS Code.</p>
          </div>

          <div className="feat-box">
            <div className="feat-icon"><Palette size={22} /></div>
            <h4>6 Pro Themes</h4>
            <p>Switch seamlessly between Dracula, One Dark Pro, Monokai, Synthwave '84, VS Dark, and VS Light.</p>
          </div>

          <div className="feat-box">
            <div className="feat-icon"><FolderGit2 size={22} /></div>
            <h4>Local Git & Source Control</h4>
            <p>Manage branch switches, commit histories, and change tracking fully offline without internet connection.</p>
          </div>

          <div className="feat-box">
            <div className="feat-icon"><Terminal size={22} /></div>
            <h4>Console & Shell Runtime</h4>
            <p>Simulated process execution and real-time JavaScript runtime error/log capturing.</p>
          </div>

          <div className="feat-box">
            <div className="feat-icon"><Smartphone size={22} /></div>
            <h4>Capacitor Android Packaging</h4>
            <p>Ready-to-compile Android project settings to produce native APK and AAB binaries with Android Studio.</p>
          </div>

          <div className="feat-box">
            <div className="feat-icon"><Globe size={22} /></div>
            <h4>100% Offline PWA</h4>
            <p>Installable directly from your browser as a standalone app that works seamlessly without WiFi.</p>
          </div>
        </div>
      </section>

      {/* Download & Installation Section */}
      <section id="download" className="download-section">
        <div className="download-card">
          <h2>Get CodeForge Mobile Today</h2>
          <p>Choose how you want to run or build CodeForge on your devices.</p>

          <div className="download-options">
            <div className="download-tile">
              <Globe size={28} />
              <h4>1-Click Install App (PWA)</h4>
              <p>Install directly to your Android home screen for instant offline use.</p>
              <button className="tile-btn" onClick={handleInstallClick}>
                <Download size={15} /> Install to Home Screen
              </button>
            </div>

            <div className="download-tile">
              <Download size={28} />
              <h4>Full Source ZIP</h4>
              <p>Download the complete project workspace as a .zip file.</p>
              <button className="tile-btn secondary" onClick={onDownloadZip}>
                <Download size={15} /> Download .ZIP
              </button>
            </div>

            <div className="download-tile">
              <Smartphone size={28} />
              <h4>Android APK Setup</h4>
              <p>Export Capacitor configuration & Android Studio build guides.</p>
              <button className="tile-btn secondary" onClick={onExportAndroid}>
                <Download size={15} /> Export Android Config
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Buy Me A Coffee Support Section */}
      <section id="support" className="support-section">
        <div className="coffee-container">
          <div className="coffee-icon-wrap">
            <Coffee size={36} className="text-amber-400" />
          </div>
          <h2>Support the Creator</h2>
          <p>
            CodeForge Mobile is an open-source labor of love by <strong>Khalid Abdullah</strong>.
            If this project helps your coding workflow, consider buying me a coffee to support future development!
          </p>

          <a
            href="https://buymeacoffee.com/khalidabdullah"
            target="_blank"
            rel="noreferrer"
            className="coffee-main-button"
          >
            <Coffee size={22} />
            <span>Buy Khalid a Coffee ☕</span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Code2 size={18} />
            <span>CodeForge Mobile</span>
          </div>
          <p>© 2026 Khalid Abdullah. Released under the MIT License.</p>
          <div className="footer-links">
            <a href="https://github.com/khalidabdullahh/CodeForgeMobile" target="_blank" rel="noreferrer">
              GitHub Repository
            </a>
            <a href="https://github.com/khalidabdullahh/CodeForgeMobile/blob/main/LICENSE" target="_blank" rel="noreferrer">
              MIT License
            </a>
            <a href="https://buymeacoffee.com/khalidabdullah" target="_blank" rel="noreferrer">
              Buy Me a Coffee
            </a>
          </div>
        </div>
      </footer>

      {/* 1-Click Install Modal */}
      {showInstallModal && (
        <div className="install-modal-backdrop" onClick={() => setShowInstallModal(false)}>
          <div className="install-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Smartphone className="text-blue-400" size={20} />
                <h3>Install CodeForge Mobile</h3>
              </div>
              <button className="close-btn" onClick={() => setShowInstallModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-content">
              <div className="install-step">
                <span className="step-num">1</span>
                <div>
                  <b>Instant Android / Mobile Installation:</b>
                  <p>
                    Open this page in <strong>Chrome</strong> on Android or <strong>Safari</strong> on iOS.
                    Tap the browser menu <strong>(⋮)</strong> and select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.
                  </p>
                </div>
              </div>

              <div className="install-step">
                <span className="step-num">2</span>
                <div>
                  <b>Offline Ready:</b>
                  <p>Once installed, CodeForge will appear as an app icon on your phone and open in full-screen landscape mode with 0 latency.</p>
                </div>
              </div>

              <div className="modal-buttons">
                <button
                  className="modal-btn-primary"
                  onClick={() => {
                    onLaunchIde();
                    setShowInstallModal(false);
                  }}
                >
                  <Play size={15} /> Launch Instant Web IDE
                </button>
                <button
                  className="modal-btn-secondary"
                  onClick={() => {
                    onDownloadZip();
                    setShowInstallModal(false);
                  }}
                >
                  <Download size={15} /> Download Source .ZIP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
