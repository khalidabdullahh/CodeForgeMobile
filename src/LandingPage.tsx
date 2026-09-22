import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  ChevronUp,
  Code2,
  Columns,
  Download,
  FolderGit2,
  Github,
  Globe,
  Keyboard,
  Maximize2,
  Palette,
  Play,
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

const TYPEWRITER_WORDS = ['Build', 'Create', 'Code', 'Deploy', 'Ship'];

const MOCK_SNIPPETS = [
  {
    lang: 'HTML',
    tab: 'index.html',
    lines: [
      { html: '<span class="c-tag">&lt;!doctype</span> <span class="c-attr">html</span>&gt;' },
      { html: '&lt;<span class="c-tag">div</span> <span class="c-attr">class</span>=<span class="c-str">"codeforge-pocket-ide"</span>&gt;' },
      { html: '&nbsp;&nbsp;&lt;<span class="c-tag">h1</span>&gt;Pocket-Sized VS Code 🚀&lt;/<span class="c-tag">h1</span>&gt;' },
      { html: '&nbsp;&nbsp;&lt;<span class="c-tag">button</span> <span class="c-attr">onclick</span>=<span class="c-str">"runApp()"</span>&gt;Run&lt;/<span class="c-tag">button</span>&gt;' },
      { html: '&lt;/<span class="c-tag">div</span>&gt;' }
    ]
  },
  {
    lang: 'CSS',
    tab: 'style.css',
    lines: [
      { html: '<span class="c-tag">.card</span> {' },
      { html: '&nbsp;&nbsp;<span class="c-attr">background</span>: <span class="c-str">linear-gradient(135deg, #0f172a, #1e3a8a)</span>;' },
      { html: '&nbsp;&nbsp;<span class="c-attr">border-radius</span>: <span class="c-str">16px</span>;' },
      { html: '&nbsp;&nbsp;<span class="c-attr">padding</span>: <span class="c-str">24px</span>;' },
      { html: '}' }
    ]
  },
  {
    lang: 'JavaScript',
    tab: 'script.js',
    lines: [
      { html: '<span class="c-tag">function</span> <span class="c-attr">runApp</span>() {' },
      { html: '&nbsp;&nbsp;<span class="c-attr">console</span>.log(<span class="c-str">"CodeForge ready!"</span>);' },
      { html: '&nbsp;&nbsp;<span class="c-attr">document</span>.querySelector(<span class="c-str">".card"</span>)' },
      { html: '&nbsp;&nbsp;&nbsp;&nbsp;.classList.add(<span class="c-str">"active"</span>);' },
      { html: '}' }
    ]
  },
  {
    lang: 'Python',
    tab: 'main.py',
    lines: [
      { html: '<span class="c-tag">def</span> <span class="c-attr">fibonacci</span>(n):' },
      { html: '&nbsp;&nbsp;a, b = <span class="c-str">0</span>, <span class="c-str">1</span>' },
      { html: '&nbsp;&nbsp;<span class="c-tag">for</span> _ <span class="c-tag">in</span> range(n):' },
      { html: '&nbsp;&nbsp;&nbsp;&nbsp;print(a, end=<span class="c-str">" "</span>)' },
      { html: '&nbsp;&nbsp;&nbsp;&nbsp;a, b = b, a + b' }
    ]
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchIde,
  onDownloadZip,
  onExportAndroid
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Typewriter rotating word
  const [wordIndex, setWordIndex] = useState(0);
  const [displayWord, setDisplayWord] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Mock editor cycling language
  const [snippetIndex, setSnippetIndex] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);

  // Mouse Spotlight and 3D Tilt State
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [mockupTilt, setMockupTilt] = useState({ rx: 0, ry: 0 });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Scroll Progress & Back to top tracker
  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current;
      if (el) {
        const total = el.scrollHeight - el.clientHeight;
        const current = el.scrollTop;
        const pct = total > 0 ? (current / total) * 100 : 0;
        setScrollProgress(pct);
        setShowBackToTop(current > 320);
      } else {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const current = window.scrollY;
        const pct = total > 0 ? (current / total) * 100 : 0;
        setScrollProgress(pct);
        setShowBackToTop(current > 320);
      }
    };

    if (containerRef.current) {
      containerRef.current.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Intersection Observer for Reveal-on-Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    revealElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Particle Trail Mouse Animation (Matching CV Builder & CodeForge)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only activate on devices with fine pointer (mouse / trackpad)
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (!hasFinePointer) return;

    let lastCreated = 0;
    const activeDots = new Set<HTMLDivElement>();

    const handleTrailingMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      // Throttle to ~18-20ms for smooth 60fps performance
      if (now - lastCreated < 20) return;
      lastCreated = now;

      const dot = document.createElement('div');
      dot.className = 'cursor-trail-dot';
      dot.style.position = 'fixed';
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
      dot.style.width = '7px';
      dot.style.height = '7px';
      dot.style.marginLeft = '-3.5px';
      dot.style.marginTop = '-3.5px';
      dot.style.background = 'linear-gradient(135deg, #3b82f6, #6366f1, #06b6d4)';
      dot.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.85), 0 0 20px rgba(99, 102, 241, 0.45)';
      dot.style.borderRadius = '50%';
      dot.style.opacity = '0.9';
      dot.style.transform = 'scale(1)';
      dot.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
      dot.style.pointerEvents = 'none';
      dot.style.zIndex = '99999';

      document.body.appendChild(dot);
      activeDots.add(dot);

      setTimeout(() => {
        dot.style.opacity = '0';
        dot.style.transform = 'scale(0.2)';
        dot.style.width = '0px';
        dot.style.height = '0px';
      }, 40);

      setTimeout(() => {
        if (dot && dot.parentNode) {
          dot.remove();
        }
        activeDots.delete(dot);
      }, 550);
    };

    document.addEventListener('mousemove', handleTrailingMouseMove, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleTrailingMouseMove);
      activeDots.forEach(d => {
        if (d && d.parentNode) d.remove();
      });
      activeDots.clear();
    };
  }, []);

  // Typewriter effect
  useEffect(() => {
    const current = TYPEWRITER_WORDS[wordIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && displayWord === current) {
      timeout = setTimeout(() => setIsDeleting(true), 1800);
    } else if (isDeleting && displayWord === '') {
      setIsDeleting(false);
      setWordIndex(i => (i + 1) % TYPEWRITER_WORDS.length);
    } else {
      timeout = setTimeout(
        () => {
          setDisplayWord(prev =>
            isDeleting ? current.slice(0, prev.length - 1) : current.slice(0, prev.length + 1)
          );
        },
        isDeleting ? 45 : 90
      );
    }
    return () => clearTimeout(timeout);
  }, [displayWord, isDeleting, wordIndex]);

  // Cycle mock snippets + line-by-line reveal
  useEffect(() => {
    setVisibleLines(0);
    const lineTimer = setInterval(() => {
      setVisibleLines(v => {
        if (v >= MOCK_SNIPPETS[snippetIndex].lines.length) {
          clearInterval(lineTimer);
          return v;
        }
        return v + 1;
      });
    }, 220);

    const switchTimer = setTimeout(() => {
      setSnippetIndex(i => (i + 1) % MOCK_SNIPPETS.length);
    }, 4200);

    return () => {
      clearInterval(lineTimer);
      clearTimeout(switchTimer);
    };
  }, [snippetIndex]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMockupMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mockupRef.current) return;
    const rect = mockupRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rx = ((y / rect.height) - 0.5) * -12;
    const ry = ((x / rect.width) - 0.5) * 12;
    setMockupTilt({ rx, ry });
  };

  const handleMockupMouseLeave = () => {
    setMockupTilt({ rx: 0, ry: 0 });
  };

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      setShowInstallModal(true);
    }
  };

  const currentSnippet = MOCK_SNIPPETS[snippetIndex];

  return (
    <div className="landing-container" ref={containerRef} onMouseMove={handleMouseMove}>
      {/* Scroll Progress Bar */}
      <div className="scroll-progress-bar" style={{ width: `${scrollProgress}%` }} />

      {/* Mouse Spotlight Glow */}
      <div
        className="mouse-spotlight"
        style={{
          left: `${mousePos.x}px`,
          top: `${mousePos.y}px`
        }}
      />

      {/* Floating Ambient Particles in Background */}
      <div className="floating-particles-container" aria-hidden="true">
        <span className="floating-particle p-1">{'<code />'}</span>
        <span className="floating-particle p-2">{'{ state }'}</span>
        <span className="floating-particle p-3">fn() =&gt;</span>
        <span className="floating-particle p-4">const dev = true;</span>
        <span className="floating-particle p-5">01011001</span>
        <span className="floating-particle p-6">async / await</span>
      </div>

      {/* Navbar */}
      <nav className="landing-nav">
        <div className="nav-content">
          <div className="nav-brand">
            <div className="nav-logo">
              <Code2 size={20} />
            </div>
            <span className="brand-name">
              CodeForge <span className="brand-sub">Mobile</span>
            </span>
          </div>

          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#landscape">VS Code Vibe</a>
            <a href="#download">Download</a>
            <a href="#community">Community</a>
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
            <button className="install-nav-btn" onClick={handleInstallClick}>
              <Download size={15} />
              <span>Install App (APK)</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-badge anim-fade-up">
          <Sparkles size={14} className="text-yellow-400" />
          <span>Android-First VS Code-Inspired Mobile IDE · 100% Free & Open Source</span>
        </div>

        <h1 className="hero-title anim-fade-up delay-1">
          Code. Create.{' '}
          <span className="typewriter-word">
            {displayWord}
            <span className="typewriter-cursor">|</span>
          </span>
          <br />
          <span className="gradient-text">Right from Your Phone</span>
        </h1>

        <p className="hero-subtitle anim-fade-up delay-2">
          Full desktop VS Code experience in your pocket. Edit{' '}
          <strong>HTML, CSS, JavaScript &amp; Python</strong> with Monaco Editor, AI Copilot,
          offline Git, live preview and one-tap symbol toolbar.
        </p>

        <div className="hero-cta-group anim-fade-up delay-3">
          <button className="cta-primary pulse-glow" onClick={onLaunchIde}>
            <Play size={18} />
            <span>Launch Web IDE</span>
            <ArrowRight size={18} />
          </button>

          <button className="cta-install" onClick={handleInstallClick}>
            <Download size={18} />
            <span>Install App (APK)</span>
          </button>

          <a
            href="https://github.com/khalidabdullahh/CodeForgeMobile"
            target="_blank"
            rel="noreferrer"
            className="cta-secondary"
          >
            <Github size={17} />
            <span>Star on GitHub</span>
          </a>
        </div>

        {/* Languages pill strip */}
        <div className="lang-pills anim-fade-up delay-4">
          <span className="lang-pill html">HTML</span>
          <span className="lang-pill css">CSS</span>
          <span className="lang-pill js">JavaScript</span>
          <span className="lang-pill py">Python</span>
          <span className="lang-pill more">+ Markdown, JSON, TS…</span>
        </div>

        {/* Hero Interactive App Mockup Frame with 3D Tilt */}
        <div
          className="hero-mockup-wrapper anim-fade-up delay-5 tilt-card-3d"
          ref={mockupRef}
          onMouseMove={handleMockupMouseMove}
          onMouseLeave={handleMockupMouseLeave}
          style={{
            transform: `perspective(1000px) rotateX(${mockupTilt.rx}deg) rotateY(${mockupTilt.ry}deg)`
          }}
        >
          <div className="mockup-header">
            <div className="mockup-dots">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
            </div>
            <span className="mockup-title">codeforge-workspace — {currentSnippet.lang}</span>
            <button className="mockup-live-btn" onClick={onLaunchIde}>
              <Maximize2 size={13} /> Open Fullscreen
            </button>
          </div>

          <div className="mockup-body">
            <div className="mockup-sidebar">
              <div className="mockup-sidebar-title">EXPLORER</div>
              {MOCK_SNIPPETS.map((s, i) => (
                <div
                  key={s.tab}
                  className={`mockup-file ${i === snippetIndex ? 'selected' : ''}`}
                >
                  {s.lang === 'HTML' && '📄 '}
                  {s.lang === 'CSS' && '🎨 '}
                  {s.lang === 'JavaScript' && '⚡ '}
                  {s.lang === 'Python' && '🐍 '}
                  {s.tab}
                </div>
              ))}
            </div>

            <div className="mockup-editor-area">
              <div className="mockup-tabs">
                <div className="mockup-tab active">{currentSnippet.tab} ✕</div>
              </div>
              <div className="mockup-code">
                {currentSnippet.lines.slice(0, visibleLines).map((line, idx) => (
                  <span
                    key={`${snippetIndex}-${idx}`}
                    className="code-line typing-line"
                    dangerouslySetInnerHTML={{ __html: line.html }}
                  />
                ))}
                {visibleLines < currentSnippet.lines.length && (
                  <span className="code-line">
                    <span className="typewriter-cursor">|</span>
                  </span>
                )}
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
      <section id="landscape" className="feature-highlight-section reveal-on-scroll">
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
          <div className="landscape-card anim-card">
            <div className="icon-badge">
              <Columns size={20} />
            </div>
            <h3>Split-Screen Preview</h3>
            <p>Code on the left, see instant live preview changes on the right with in-app console logging.</p>
          </div>

          <div className="landscape-card anim-card">
            <div className="icon-badge">
              <Keyboard size={20} />
            </div>
            <h3>Quick Symbol Bar</h3>
            <p>One-tap brackets, quotes, arrows, and operators so you don't struggle with mobile keyboard switches.</p>
          </div>

          <div className="landscape-card anim-card">
            <div className="icon-badge">
              <Bot size={20} />
            </div>
            <h3>AI Coding Copilot</h3>
            <p>Integrated Gemini & OpenAI assistant to explain code, fix bugs, and generate components automatically.</p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="features-section reveal-on-scroll">
        <div className="section-header">
          <div className="section-pill">
            <Zap size={14} />
            <span>BUILT FOR DEVELOPERS</span>
          </div>
          <h2>Packed with Everything You Need</h2>
          <p style={{ color: '#94a3b8', maxWidth: 560, margin: '0 auto' }}>
            Full editing support for <strong>HTML, CSS, JavaScript &amp; Python</strong> (Pyodide) —
            plus Markdown, JSON, TypeScript and more.
          </p>
        </div>

        <div className="features-grid">
          <div className="feat-box anim-card">
            <div className="feat-icon">
              <Code2 size={22} />
            </div>
            <h4>Monaco Editor Engine</h4>
            <p>
              The exact same syntax highlighting, IntelliSense, and bracket pair colorization engine powering VS Code.
              Edit HTML, CSS, JS &amp; Python with full language intelligence.
            </p>
          </div>

          <div className="feat-box anim-card">
            <div className="feat-icon">
              <Palette size={22} />
            </div>
            <h4>6 Pro Themes</h4>
            <p>Switch seamlessly between Dracula, One Dark Pro, Monokai, Synthwave '84, VS Dark, and VS Light.</p>
          </div>

          <div className="feat-box anim-card">
            <div className="feat-icon">
              <FolderGit2 size={22} />
            </div>
            <h4>Local Git & Source Control</h4>
            <p>Manage branch switches, commit histories, and change tracking fully offline without internet connection.</p>
          </div>

          <div className="feat-box anim-card">
            <div className="feat-icon">
              <Terminal size={22} />
            </div>
            <h4>Console & Python Runtime</h4>
            <p>
              Live JS console + in-browser Python (Pyodide). Run <code>python main.py</code> directly from the terminal.
            </p>
          </div>

          <div className="feat-box anim-card">
            <div className="feat-icon">
              <Smartphone size={22} />
            </div>
            <h4>Capacitor Android Packaging</h4>
            <p>Ready-to-compile Android project settings to produce native APK and AAB binaries with Android Studio.</p>
          </div>

          <div className="feat-box anim-card">
            <div className="feat-icon">
              <Globe size={22} />
            </div>
            <h4>100% Offline PWA</h4>
            <p>Installable directly from your browser as a standalone app that works seamlessly without WiFi.</p>
          </div>
        </div>
      </section>

      {/* Download & Installation Section */}
      <section id="download" className="download-section reveal-on-scroll">
        <div className="download-card">
          <h2>Get CodeForge Mobile Today</h2>
          <p>Choose how you want to run or build CodeForge on your devices.</p>

          <div className="download-options">
            <div className="download-tile anim-card">
              <Globe size={28} />
              <h4>1-Click Install App (PWA)</h4>
              <p>Install directly to your Android home screen for instant offline use.</p>
              <button className="tile-btn" onClick={handleInstallClick}>
                <Download size={15} /> Install to Home Screen
              </button>
            </div>

            <div className="download-tile anim-card">
              <Download size={28} />
              <h4>Full Source ZIP</h4>
              <p>Download the complete project workspace as a .zip file.</p>
              <button className="tile-btn secondary" onClick={onDownloadZip}>
                <Download size={15} /> Download .ZIP
              </button>
            </div>

            <div className="download-tile anim-card">
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

      {/* Open Source Community Section */}
      <section id="community" className="support-section reveal-on-scroll">
        <div className="coffee-container">
          <div
            className="coffee-icon-wrap"
            style={{ background: 'rgba(37, 99, 235, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)' }}
          >
            <Github size={36} className="text-blue-400" />
          </div>
          <h2>Join the Open Source Community</h2>
          <p>
            CodeForge Mobile is 100% free and open-source created by <strong>Khalid Abdullah</strong>.
            Contribute features, report issues, or star the project on GitHub to help us grow!
          </p>

          <div className="flex gap-3 justify-center flex-wrap">
            <a
              href="https://github.com/khalidabdullahh/CodeForgeMobile"
              target="_blank"
              rel="noreferrer"
              className="coffee-main-button"
              style={{ background: '#2563eb', color: 'white' }}
            >
              <Star size={20} />
              <span>Star on GitHub ⭐️</span>
            </a>
            <button
              className="coffee-main-button"
              style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' }}
              onClick={onLaunchIde}
            >
              <Play size={20} />
              <span>Launch Web IDE 🚀</span>
            </button>
          </div>
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
            <a
              href="https://github.com/khalidabdullahh/CodeForgeMobile/blob/main/LICENSE"
              target="_blank"
              rel="noreferrer"
            >
              MIT License
            </a>
            <a href="https://codeforgemobile.pages.dev" target="_blank" rel="noreferrer">
              Live Website
            </a>
          </div>
        </div>
      </footer>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          className="back-to-top-btn pulse-glow"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          title="Back to Top"
        >
          <ChevronUp size={20} />
        </button>
      )}

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
                  <b>Direct APK Installation (Android):</b>
                  <p>
                    Download the pre-compiled Android APK directly from GitHub Releases to install CodeForge Mobile on
                    any Android device.
                  </p>
                </div>
              </div>

              <div className="install-step">
                <span className="step-num">2</span>
                <div>
                  <b>Instant PWA Install (No Download Needed):</b>
                  <p>
                    Tap the browser menu <strong>(⋮)</strong> in Chrome/Safari and select{' '}
                    <strong>"Add to Home screen"</strong> to install as a standalone offline app.
                  </p>
                </div>
              </div>

              <div className="modal-buttons" style={{ flexDirection: 'column' }}>
                <a
                  href="https://github.com/khalidabdullahh/CodeForgeMobile/releases"
                  target="_blank"
                  rel="noreferrer"
                  className="modal-btn-primary"
                  style={{ textDecoration: 'none' }}
                >
                  <Download size={16} /> Download APK from GitHub Releases
                </a>

                <div className="flex gap-2 w-full">
                  <button
                    className="modal-btn-secondary"
                    onClick={() => {
                      onLaunchIde();
                      setShowInstallModal(false);
                    }}
                  >
                    <Play size={15} /> Launch Web IDE
                  </button>
                  <button
                    className="modal-btn-secondary"
                    onClick={() => {
                      onDownloadZip();
                      setShowInstallModal(false);
                    }}
                  >
                    <Download size={15} /> Source .ZIP
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
