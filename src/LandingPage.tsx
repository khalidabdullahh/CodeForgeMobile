import React, { useEffect, useState } from 'react';
import { ArrowRight, ChevronUp, Download, ExternalLink, Github, Globe, Menu, Play, Star, X } from 'lucide-react';
import '@fontsource/chelsea-market/400.css';
import '@fontsource/cabin-sketch/400.css';
import '@fontsource/cabin-sketch/700.css';
import './landing.css';

interface LandingPageProps {
  onLaunchIde: () => void;
  onDownloadZip: () => void;
  onExportAndroid: () => void;
}

const REPO = 'https://github.com/khalidabdullahh/CodeForgeMobile';
const GITHUB_REPO_API = 'https://api.github.com/repos/khalidabdullahh/CodeForgeMobile';
const STARS_CACHE_KEY = 'codeforge-gh-stars';
const STARS_CACHE_MS = 30 * 60 * 1000;
const APK_URL = `${REPO}/releases/download/apk-latest/CodeForgeMobile.apk`;
const RELEASES_URL = `${REPO}/releases`;

type Platform = 'android' | 'ios' | 'other';
function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1)) return 'ios';
  return 'other';
}
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function formatStars(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n);
}

// Live GitHub star count, cached for 30 minutes to stay inside the unauthenticated API rate limit
function useGithubStars(): number | null {
  const [stars, setStars] = useState<number | null>(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(STARS_CACHE_KEY) || 'null');
      return cached && Number.isFinite(cached.count) ? cached.count : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let cancelled = false;
    try {
      const cached = JSON.parse(localStorage.getItem(STARS_CACHE_KEY) || 'null');
      if (cached && Date.now() - cached.ts < STARS_CACHE_MS) return;
    } catch {
      /* ignore bad cache */
    }
    fetch(GITHUB_REPO_API, { headers: { Accept: 'application/vnd.github+json' } })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(data => {
        if (cancelled || !Number.isFinite(data?.stargazers_count)) return;
        setStars(data.stargazers_count);
        try {
          localStorage.setItem(STARS_CACHE_KEY, JSON.stringify({ count: data.stargazers_count, ts: Date.now() }));
        } catch {
          /* storage unavailable */
        }
      })
      .catch(() => {
        /* offline or rate limited: keep the cached value or show no count */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return stars;
}

// ---- editor mockup content (code is shown in a monospace face on purpose)
const t = (s: string) => `<span class="c-tag">${s}</span>`;
const a = (s: string) => `<span class="c-attr">${s}</span>`;
const q = (s: string) => `<span class="c-str">${s}</span>`;
const sp = (n: number) => '&nbsp;'.repeat(n);

const SNIPPETS: { tab: string; lines: string[] }[] = [
  {
    tab: 'index.html',
    lines: [
      `${t('&lt;!doctype')} ${a('html')}&gt;`,
      `&lt;${t('main')} ${a('class')}=${q('"card"')}&gt;`,
      `${sp(2)}&lt;${t('h1')}&gt;Hello from my phone&lt;/${t('h1')}&gt;`,
      `${sp(2)}&lt;${t('button')} ${a('onclick')}=${q('"run()"')}&gt;Run&lt;/${t('button')}&gt;`,
      `&lt;/${t('main')}&gt;`
    ]
  },
  {
    tab: 'main.py',
    lines: [
      `${t('def')} ${a('fibonacci')}(n):`,
      `${sp(4)}a, b = ${q('0')}, ${q('1')}`,
      `${sp(4)}${t('for')} _ ${t('in')} range(n):`,
      `${sp(8)}print(a, end=${q('" "')})`,
      `${sp(8)}a, b = b, a + b`
    ]
  },
  {
    tab: 'app.ts',
    lines: [
      `${t('interface')} ${a('Task')} { title: string; done: boolean }`,
      ``,
      `${t('const')} tasks: ${a('Task')}[] = [{ title: ${q('"Ship it"')}, done: ${q('true')} }];`,
      `${t('const')} open = tasks.filter(x =&gt; !x.done);`,
      `console.log(${q('`${open.length} open`')});`
    ]
  },
  {
    tab: 'main.cpp',
    lines: [
      `${t('#include')} ${q('&lt;iostream&gt;')}`,
      `${t('int')} ${a('main')}() {`,
      `${sp(4)}std::cout &lt;&lt; ${q('"Compiled on a phone\\n"')};`,
      `${sp(4)}${t('return')} ${q('0')};`,
      `}`
    ]
  },
  {
    tab: 'style.css',
    lines: [
      `${t('.card')} {`,
      `${sp(2)}${a('background')}: ${q('#131519')};`,
      `${sp(2)}${a('border-radius')}: ${q('16px')};`,
      `${sp(2)}${a('padding')}: ${q('24px')};`,
      `}`
    ]
  }
];

const FEATURES = [
  {
    title: 'The Monaco editor',
    text: 'The editing engine behind VS Code: syntax highlighting, IntelliSense and bracket colorization, tuned for touch.'
  },
  {
    title: 'Run code instantly',
    text: 'Python, JavaScript and TypeScript run right in the browser. C, C++ and Java compile on a remote server.'
  },
  {
    title: 'Live preview',
    text: 'See HTML, CSS and JavaScript render beside your code, with an in-app console for errors and logs.'
  },
  {
    title: 'Local Git',
    text: 'Branches, commits and diffs, stored on your device. No account and no server required.'
  },
  {
    title: 'AI assistant',
    text: 'Explain code, fix bugs and generate components with Gemini or OpenAI, using your own API key.'
  },
  {
    title: 'StykAnime Studio',
    text: 'A 2D stick-figure animator built in. Pose characters by touch, then export your animation as code, GIF or video.'
  }
];

const LANGUAGES: { name: string; how: string; tag: string; net?: boolean }[] = [
  { name: 'Python', how: 'Runs in your browser with Pyodide (Python 3.12), including input() and plots.', tag: 'In browser' },
  { name: 'JavaScript', how: 'Runs in your browser, with top-level await and a live console.', tag: 'In browser' },
  { name: 'TypeScript', how: 'Types are stripped on the fly, then your code runs in the browser.', tag: 'In browser' },
  { name: 'HTML & CSS', how: 'Instant split-screen preview with your linked or inline styles and scripts.', tag: 'In browser' },
  { name: 'C & C++', how: 'Compiled with GCC on a remote compiler server, with stdin support.', tag: 'Needs internet', net: true },
  { name: 'Java', how: 'Compiled and run on a remote OpenJDK server, with stdin support.', tag: 'Needs internet', net: true }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchIde, onDownloadZip, onExportAndroid }) => {
  const stars = useGithubStars();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [showDock, setShowDock] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const platform = React.useMemo(detectPlatform, []);
  const reduceMotion = React.useMemo(prefersReducedMotion, []);

  // Mockup: cycle through languages until the visitor picks one
  const [snippetIndex, setSnippetIndex] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [autoplay, setAutoplay] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowTop(window.scrollY > 700);
      setShowDock(window.scrollY > 380);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Reveal on scroll
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.lp-reveal'));
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('is-revealed'));
      return;
    }
    const observer = new IntersectionObserver(
      entries =>
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Type the snippet line by line, then move on
  useEffect(() => {
    const total = SNIPPETS[snippetIndex].lines.length;
    if (reduceMotion) {
      setVisibleLines(total);
      return;
    }
    setVisibleLines(0);
    const lineTimer = setInterval(() => {
      setVisibleLines(v => {
        if (v >= total) {
          clearInterval(lineTimer);
          return v;
        }
        return v + 1;
      });
    }, 240);
    const next = autoplay ? setTimeout(() => setSnippetIndex(i => (i + 1) % SNIPPETS.length), 4600) : undefined;
    return () => {
      clearInterval(lineTimer);
      if (next) clearTimeout(next);
    };
  }, [snippetIndex, autoplay, reduceMotion]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      setShowInstallModal(true);
    }
  };

  const snippet = SNIPPETS[snippetIndex];
  const starBadge =
    stars !== null ? (
      <span className="lp-stars">
        <Star size={15} fill="currentColor" /> {formatStars(stars)}
      </span>
    ) : null;

  return (
    <div className="lp">
      {/* ---------- navigation ---------- */}
      <nav className="lp-nav" aria-label="Main">
        <div className="lp-wrap lp-nav-inner">
          <a className="lp-brand" href="#top" aria-label="CodeForge Mobile home">
            <img src="./icon-192.png" alt="" width={36} height={36} />
            <div>
              CodeForge <span>Mobile</span>
            </div>
          </a>
          <div className="lp-links">
            <a href="#features">Features</a>
            <a href="#download">Download</a>
            <a href="#languages">Languages</a>
            <a href="#creator">Creator</a>
            <a href="#community">Community</a>
          </div>
          <div className="lp-nav-actions">
            <a className="lp-btn lp-btn-ghost lp-btn-sm lp-nav-desktop" href={REPO} target="_blank" rel="noreferrer">
              <Github size={17} /> GitHub {starBadge}
            </a>
            <button className="lp-btn lp-btn-primary lp-btn-sm lp-nav-desktop" onClick={onLaunchIde}>
              Launch IDE
            </button>
            <button
              className="lp-menu-btn"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(o => !o)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="lp-menu">
            <div className="lp-wrap">
              {[
                ['features', 'Features'],
                ['download', 'Download'],
                ['languages', 'Languages'],
                ['creator', 'Creator'],
                ['community', 'Community']
              ].map(([id, label]) => (
                <a key={id} className="item" href={`#${id}`} onClick={() => setMenuOpen(false)}>
                  {label} <ArrowRight size={18} />
                </a>
              ))}
              <div className="menu-cta">
                <button
                  className="lp-btn lp-btn-primary"
                  onClick={() => {
                    setMenuOpen(false);
                    onLaunchIde();
                  }}
                >
                  <Play size={18} /> Launch Web IDE
                </button>
                <a className="lp-btn lp-btn-ghost" href={REPO} target="_blank" rel="noreferrer">
                  <Github size={18} /> GitHub {starBadge}
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ---------- hero ---------- */}
      <header className="lp-hero" id="top">
        <div className="lp-wrap">
          <span className="lp-eyebrow">The mobile IDE · Free to use</span>
          <h1>
            A real code editor, <em>in your pocket.</em>
          </h1>
          <p className="lp-hero-sub">
            CodeForge Mobile brings the Monaco editor, a live terminal, local Git and an AI assistant to your phone.
            Write and run Python, JavaScript, TypeScript, C++ and more, wherever you happen to be.
          </p>
          <div className="lp-cta">
            {platform === 'android' ? (
              <>
                <a className="lp-btn lp-btn-primary" href={APK_URL} download rel="noreferrer">
                  <Download size={18} /> Download for Android
                </a>
                <button className="lp-btn lp-btn-ghost" onClick={onLaunchIde}>
                  <Play size={18} /> Open in browser
                </button>
              </>
            ) : platform === 'ios' ? (
              <>
                <button className="lp-btn lp-btn-primary" onClick={onLaunchIde}>
                  <Play size={18} /> Launch Web IDE <ArrowRight size={18} />
                </button>
                <button className="lp-btn lp-btn-ghost" onClick={handleInstallClick}>
                  <Download size={18} /> Add to Home Screen
                </button>
              </>
            ) : (
              <>
                <button className="lp-btn lp-btn-primary" onClick={onLaunchIde}>
                  <Play size={18} /> Launch Web IDE <ArrowRight size={18} />
                </button>
                <a className="lp-btn lp-btn-ghost" href={APK_URL} download rel="noreferrer">
                  <Download size={18} /> Download for Android
                </a>
              </>
            )}
          </div>
          <p className="lp-meta">Android app · Installable web app · No account required</p>

          <div className="lp-window" aria-label="Editor preview">
            <div className="lp-window-bar">
              <div className="lp-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <div className="lp-tabs" role="tablist">
                {SNIPPETS.map((s, i) => (
                  <button
                    key={s.tab}
                    role="tab"
                    aria-selected={i === snippetIndex}
                    className={`lp-tab ${i === snippetIndex ? 'active' : ''}`}
                    onClick={() => {
                      setAutoplay(false);
                      setSnippetIndex(i);
                    }}
                  >
                    {s.tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="lp-code" aria-hidden="true">
              {snippet.lines.slice(0, visibleLines).map((line, idx) => (
                <span key={`${snippetIndex}-${idx}`} className="ln">
                  <span className="num">{idx + 1}</span>
                  <span dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
                </span>
              ))}
              {visibleLines < snippet.lines.length && (
                <span className="ln">
                  <span className="num">{visibleLines + 1}</span>
                  <span className="caret" />
                </span>
              )}
            </div>
            <div className="lp-symbols" aria-hidden="true">
              {['Tab', '{ }', '( )', '[ ]', ';', '"', "'", '<', '>', '=>', '/'].map(s => (
                <span key={s}>{s}</span>
              ))}
            </div>
            <div className="lp-window-foot">
              <span>codeforge-workspace / {snippet.tab}</span>
              <span>Landscape mode adds a split-screen live preview</span>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- proof strip ---------- */}
      <section className="lp-strip" aria-label="At a glance">
        <div className="lp-wrap lp-strip-grid">
          <div className="lp-stat">
            <b>8</b>
            <span>Languages</span>
          </div>
          <div className="lp-stat">
            <b>7</b>
            <span>Editor themes</span>
          </div>
          <div className="lp-stat">
            <b>0</b>
            <span>Accounts needed</span>
          </div>
          <div className="lp-stat">
            <b>Free</b>
            <span>To use, always</span>
          </div>
        </div>
      </section>

      {/* ---------- features ---------- */}
      <section className="lp-section" id="features">
        <div className="lp-wrap">
          <div className="lp-section-head lp-reveal">
            <span className="lp-eyebrow">What is inside</span>
            <h2>
              Everything you need to build, <em>nothing you don&rsquo;t.</em>
            </h2>
            <p>A focused set of tools for writing, running and shipping small projects entirely from a phone.</p>
          </div>
          <div className="lp-features lp-reveal">
            {FEATURES.map((f, i) => (
              <article className="lp-feature" key={f.title}>
                <span className="no">{String(i + 1).padStart(2, '0')}</span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- download ---------- */}
      <section className="lp-section lp-download" id="download">
        <div className="lp-wrap">
          <div className="lp-section-head center lp-reveal">
            <span className="lp-eyebrow">Get started</span>
            <h2>
              Take it with you, <em>or try it now.</em>
            </h2>
            <p>Install the Android app, add the web app to your home screen, or just open it in your browser.</p>
          </div>
          <div className="lp-tiles lp-reveal">
            <div className="lp-tile featured">
              <h3>Android app</h3>
              <p>
                The ready-to-install APK. When Android asks, allow &ldquo;Install unknown apps&rdquo; for your browser.
              </p>
              <a className="lp-btn lp-btn-primary lp-btn-sm" href={APK_URL} download rel="noreferrer">
                <Download size={17} /> Download APK
              </a>
              <a className="lp-tile-link" href={RELEASES_URL} target="_blank" rel="noreferrer">
                All releases
              </a>
            </div>
            <div className="lp-tile">
              <h3>Web app</h3>
              <p>Install it to your home screen as a standalone app, or launch the IDE straight in your browser.</p>
              <button className="lp-btn lp-btn-ghost lp-btn-sm" onClick={handleInstallClick}>
                <Download size={17} /> Add to home screen
              </button>
              <button className="lp-tile-link" onClick={onLaunchIde}>
                Or open the IDE now
              </button>
            </div>
            <div className="lp-tile">
              <h3>Project files</h3>
              <p>Download your workspace as a .zip, or export the Capacitor setup to build the Android app yourself.</p>
              <button className="lp-btn lp-btn-ghost lp-btn-sm" onClick={onDownloadZip}>
                <Download size={17} /> Download .zip
              </button>
              <button className="lp-tile-link" onClick={onExportAndroid}>
                Export Android config
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- experience ---------- */}
      <section className="lp-section">
        <div className="lp-wrap lp-split">
          <div className="lp-section-head lp-reveal">
            <span className="lp-eyebrow">Made for the phone</span>
            <h2>
              Turn your phone into <em>a workstation.</em>
            </h2>
            <p>Hold it upright for focused editing, or flip to landscape for the full desktop-style layout.</p>
          </div>
          <ul className="lp-points lp-reveal">
            <li>
              <h3>Split-screen preview</h3>
              <p>Code on the left, live result on the right, with a docked terminal below.</p>
            </li>
            <li>
              <h3>One-tap symbol bar</h3>
              <p>Brackets, quotes, arrows and Tab are always a tap away, so you never fight the keyboard.</p>
            </li>
            <li>
              <h3>Seven editor themes</h3>
              <p>The CodeForge theme you see here, plus Dracula, One Dark Pro, Monokai, Synthwave &rsquo;84, VS Dark and VS Light.</p>
            </li>
          </ul>
        </div>
      </section>

      {/* ---------- languages ---------- */}
      <section className="lp-section" id="languages" style={{ paddingTop: 0 }}>
        <div className="lp-wrap">
          <div className="lp-section-head lp-reveal">
            <span className="lp-eyebrow">Languages</span>
            <h2>
              Run it, <em>don&rsquo;t just edit it.</em>
            </h2>
            <p>Here is exactly what runs where, so there are no surprises.</p>
          </div>
          <div className="lp-langs lp-reveal">
            {LANGUAGES.map(l => (
              <div className="lp-lang-row" key={l.name}>
                <h3>{l.name}</h3>
                <p>{l.how}</p>
                <span className={`tag ${l.net ? 'net' : ''}`}>{l.tag}</span>
              </div>
            ))}
          </div>
          <p className="lp-note">
            Remote compilers are shared public services, so C, C++ and Java need an internet connection and may be
            rate limited at busy times.
          </p>
        </div>
      </section>

      {/* ---------- creator ---------- */}
      <section className="lp-section" id="creator">
        <div className="lp-wrap">
          <div className="lp-author lp-reveal">
            <img
              className="lp-avatar"
              src="https://github.com/khalidabdullahh.png?size=264"
              alt="Khalid Abdullah"
              width={132}
              height={132}
              loading="lazy"
              onError={e => {
                const img = e.currentTarget;
                if (!img.dataset.fallback) {
                  img.dataset.fallback = '1';
                  img.src = './icon-192.png';
                }
              }}
            />
            <div>
              <span className="lp-eyebrow">Author &amp; owner</span>
              <h2>Khalid Abdullah</h2>
              <p>
                A computer science student from Bangladesh, curious about technology, mathematics and problem solving.
                I built CodeForge Mobile so that anyone with just a phone can learn and write real code.
              </p>
              <div className="lp-author-links">
                <a href="https://github.com/khalidabdullahh" target="_blank" rel="noreferrer">
                  <Github size={17} /> GitHub
                </a>
                <a href="https://khalidslab.pages.dev" target="_blank" rel="noreferrer">
                  <Globe size={17} /> Portfolio
                </a>
                <a href="https://x.com/voiceoffkhalid" target="_blank" rel="noreferrer">
                  <ExternalLink size={17} /> @voiceoffkhalid
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- community ---------- */}
      <section className="lp-section lp-community" id="community" style={{ paddingTop: 0 }}>
        <div className="lp-wrap">
          <div className="lp-section-head center lp-reveal">
            <span className="lp-eyebrow">Community</span>
            <h2>
              Free to use. <em>Open to ideas.</em>
            </h2>
            <p>
              The source code is public. Read it, learn from it, report bugs and send pull requests, all of it is
              welcome.
            </p>
          </div>
          <div className="lp-cta lp-reveal" style={{ marginTop: 0 }}>
            <a className="lp-btn lp-btn-primary" href={REPO} target="_blank" rel="noreferrer">
              <Star size={18} /> Star on GitHub {starBadge}
            </a>
            <a className="lp-btn lp-btn-ghost" href={`${REPO}/discussions`} target="_blank" rel="noreferrer">
              Join the discussion
            </a>
          </div>
          <div className="lp-license lp-reveal">
            <div>
              <h4>You can</h4>
              <ul>
                <li>Use the app for anything</li>
                <li>Read and learn from the code</li>
                <li>Fork privately and contribute</li>
              </ul>
            </div>
            <div>
              <h4>You can&rsquo;t</h4>
              <ul>
                <li>Republish it as your own</li>
                <li>Remove credit or the license</li>
                <li>Sell it or its copies</li>
              </ul>
            </div>
          </div>
          <p className="lp-note" style={{ marginTop: 18 }}>
            Source-available, not an OSI-approved open-source license.{' '}
            <a href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
              Read the full license
            </a>
            .
          </p>
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-inner">
          <a className="lp-brand" href="#top">
            <img src="./icon-192.png" alt="" width={30} height={30} />
            <div>CodeForge Mobile</div>
          </a>
          <p>&copy; 2026 Khalid Abdullah. All rights reserved. Free to use, source-available.</p>
          <nav aria-label="Footer">
            <a href={REPO} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
              License
            </a>
            <a href={RELEASES_URL} target="_blank" rel="noreferrer">
              Releases
            </a>
          </nav>
        </div>
      </footer>

      {/* Sticky action bar for phones: always one tap from the main actions */}
      <div className={`lp-dock ${showDock && !showInstallModal ? 'show' : ''}`} aria-hidden={!showDock}>
        <button className="lp-btn lp-btn-ghost" onClick={onLaunchIde} tabIndex={showDock ? 0 : -1}>
          <Play size={17} /> Launch IDE
        </button>
        {platform === 'ios' ? (
          <button className="lp-btn lp-btn-primary" onClick={handleInstallClick} tabIndex={showDock ? 0 : -1}>
            <Download size={17} /> Add to Home
          </button>
        ) : (
          <a className="lp-btn lp-btn-primary" href={APK_URL} download rel="noreferrer" tabIndex={showDock ? 0 : -1}>
            <Download size={17} /> Get Android APK
          </a>
        )}
      </div>

      {showTop && (
        <button
          className="lp-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
        >
          <ChevronUp size={22} />
        </button>
      )}

      {/* ---------- install dialog ---------- */}
      {showInstallModal && (
        <div className="lp-modal-backdrop" onClick={() => setShowInstallModal(false)}>
          <div className="lp-modal" role="dialog" aria-modal="true" aria-label="Install CodeForge Mobile" onClick={e => e.stopPropagation()}>
            <div className="lp-modal-head">
              <h3>Install CodeForge Mobile</h3>
              <button className="lp-modal-close" onClick={() => setShowInstallModal(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            {platform !== 'ios' && (
              <div className="lp-step">
                <span className="n">1</span>
                <div>
                  <b>Android APK</b>
                  <p>Download the APK from GitHub Releases and open it on your Android phone.</p>
                </div>
              </div>
            )}
            <div className="lp-step">
              <span className="n">{platform === 'ios' ? 1 : 2}</span>
              <div>
                <b>Web app, no download</b>
                <p>
                  {platform === 'ios'
                    ? 'In Safari, tap the Share button, then choose \u201cAdd to Home Screen\u201d.'
                    : 'In Chrome, open the browser menu and choose \u201cAdd to Home screen\u201d (\u201cInstall app\u201d on some devices).'}
                </p>
              </div>
            </div>
            <div className="lp-modal-actions">
              {platform !== 'ios' && (
                <a className="lp-btn lp-btn-primary lp-btn-sm" href={APK_URL} download rel="noreferrer">
                  <Download size={17} /> Download Android APK
                </a>
              )}
              <div className="row">
                <button
                  className="lp-btn lp-btn-ghost lp-btn-sm"
                  onClick={() => {
                    onLaunchIde();
                    setShowInstallModal(false);
                  }}
                >
                  <Play size={16} /> Launch IDE
                </button>
                <button
                  className="lp-btn lp-btn-ghost lp-btn-sm"
                  onClick={() => {
                    onDownloadZip();
                    setShowInstallModal(false);
                  }}
                >
                  <Download size={16} /> .zip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
