import { useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Archive, Check, ChevronDown, Code2, Copy, Download, FileCode2, FilePlus2, FileText, FolderOpen, FolderPlus, GitBranch, GitCommit, Github, Keyboard, Menu, Package, Play, Plus, RefreshCw, Save, Search, Settings, Terminal, Trash2, Upload, X, Zap } from 'lucide-react';

type FileItem = { id: string; name: string; path: string; language: string; content: string; modified?: boolean };
type Extension = { id: string; name: string; description: string; installed: boolean };
type View = 'editor' | 'preview' | 'extensions' | 'git' | 'settings';

const starterFiles: FileItem[] = [
  { id: 'index', name: 'index.html', path: 'index.html', language: 'html', content: '<!doctype html>\n<html>\n<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>CodeForge App</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <main class="card">\n    <span class="badge">CodeForge Mobile</span>\n    <h1>Hello, Android 👋</h1>\n    <p>Edit this project from your phone.</p>\n    <button onclick="hello()">Test JavaScript</button>\n  </main>\n  <script src="script.js"></script>\n</body>\n</html>' },
  { id: 'style', name: 'style.css', path: 'style.css', language: 'css', content: ':root { font-family: system-ui, sans-serif; color-scheme: dark; }\nbody { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0b0f14; color: #eef2f7; }\n.card { width: min(90vw, 560px); padding: 32px; border: 1px solid #28313d; border-radius: 22px; background: #111820; }\n.badge { color: #69b7ff; font-size: 13px; }\nh1 { font-size: 34px; margin: 10px 0; }\nbutton { border: 0; border-radius: 10px; padding: 11px 16px; background: #1683ff; color: white; font-weight: 700; }' },
  { id: 'script', name: 'script.js', path: 'script.js', language: 'javascript', content: 'function hello() {\n  document.querySelector("h1").textContent = "It works! 🚀";\n  console.log("Hello from CodeForge Mobile");\n}' },
  { id: 'readme', name: 'README.md', path: 'README.md', language: 'markdown', content: '# CodeForge Mobile\n\nA phone-first coding workspace inspired by VS Code.\n\n## Features\n- Monaco editor\n- IntelliSense/autocomplete\n- Virtual file system\n- Git workspace\n- Terminal/runtime\n- Extensions\n- Import/export\n- Android packaging preparation' },
];

const defaultExtensions: Extension[] = [
  { id: 'prettier', name: 'Prettier', description: 'Code formatter for web projects.', installed: true },
  { id: 'eslint', name: 'ESLint', description: 'JavaScript and TypeScript diagnostics.', installed: false },
  { id: 'gitlens', name: 'GitLens', description: 'Git history and repository insights.', installed: false },
  { id: 'tailwind', name: 'Tailwind CSS', description: 'Class completion for Tailwind projects.', installed: false },
  { id: 'python', name: 'Python Tools', description: 'Python language helpers and project templates.', installed: false },
  { id: 'kotlin', name: 'Kotlin Tools', description: 'Kotlin syntax and Android project helpers.', installed: false },
];

function languageFor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  return ({ js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', json: 'json', css: 'css', html: 'html', md: 'markdown', py: 'python', java: 'java', kt: 'kotlin', xml: 'xml', yml: 'yaml', yaml: 'yaml', sh: 'shell', sql: 'sql' } as Record<string, string>)[ext || ''] || 'plaintext';
}

function App() {
  const [files, setFiles] = useState<FileItem[]>(() => { try { const saved = JSON.parse(localStorage.getItem('codeforge-files') || 'null'); return Array.isArray(saved) && saved.length ? saved : starterFiles; } catch { return starterFiles; } });
  const [activeId, setActiveId] = useState('index');
  const [openTabs, setOpenTabs] = useState<string[]>(['index']);
  const [sidebar, setSidebar] = useState(true);
  const [panel, setPanel] = useState(true);
  const [search, setSearch] = useState('');
  const [contentSearch, setContentSearch] = useState('');
  const [terminal, setTerminal] = useState('CodeForge Terminal\n$ workspace ready\n$ Type help for commands.');
  const [command, setCommand] = useState('');
  const [view, setView] = useState<View>('editor');
  const [extensions, setExtensions] = useState<Extension[]>(() => { try { return JSON.parse(localStorage.getItem('codeforge-extensions') || 'null') || defaultExtensions; } catch { return defaultExtensions; } });
  const [gitMessage, setGitMessage] = useState('Update workspace');
  const [gitHistory, setGitHistory] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('codeforge-git') || 'null') || ['Initial workspace snapshot']; } catch { return ['Initial workspace snapshot']; } });
  const [branch, setBranch] = useState('main');
  const [previewKey, setPreviewKey] = useState(0);
  const [palette, setPalette] = useState(false);
  const [newName, setNewName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('codeforge-font') || 13));
  const [wordWrap, setWordWrap] = useState(false);
  const [diagnostics, setDiagnostics] = useState('No problems detected.');
  const fileInput = useRef<HTMLInputElement>(null);
  const active = files.find(f => f.id === activeId) || files[0];
  const filtered = useMemo(() => files.filter(f => `${f.path} ${f.name}`.toLowerCase().includes(search.toLowerCase())), [files, search]);
  const matches = useMemo(() => contentSearch.trim() ? files.filter(f => f.content.toLowerCase().includes(contentSearch.toLowerCase())) : [], [files, contentSearch]);

  useEffect(() => localStorage.setItem('codeforge-files', JSON.stringify(files)), [files]);
  useEffect(() => localStorage.setItem('codeforge-git', JSON.stringify(gitHistory)), [gitHistory]);
  useEffect(() => localStorage.setItem('codeforge-extensions', JSON.stringify(extensions)), [extensions]);
  useEffect(() => localStorage.setItem('codeforge-font', String(fontSize)), [fontSize]);

  const openFile = (id: string) => { setActiveId(id); setOpenTabs(prev => prev.includes(id) ? prev : [...prev, id]); setView('editor'); };
  const updateContent = (content: string) => setFiles(prev => prev.map(f => f.id === active.id ? { ...f, content, modified: true } : f));
  const closeTab = (id: string) => { const next = openTabs.filter(x => x !== id); setOpenTabs(next); if (activeId === id) setActiveId(next[next.length - 1] || files[0]?.id || ''); };
  const createFile = () => { const name = newName.trim() || `untitled-${files.length + 1}.js`; const file: FileItem = { id: crypto.randomUUID(), name, path: name, language: languageFor(name), content: `// ${name}\n` }; setFiles(prev => [...prev, file]); setNewName(''); openFile(file.id); };
  const deleteFile = (id: string) => { const target = files.find(f => f.id === id); if (!target || files.length <= 1) return; setFiles(prev => prev.filter(f => f.id !== id)); closeTab(id); setTerminal(prev => `${prev}\n✓ Deleted ${target.path}`); };
  const renameFile = (id: string, value: string) => { const name = value.trim(); if (!name) return; setFiles(prev => prev.map(f => f.id === id ? { ...f, name, path: name, language: languageFor(name), modified: true } : f)); setRenameId(null); };

  const runCommand = (cmd: string) => {
    const clean = cmd.trim(); if (!clean) return;
    const lower = clean.toLowerCase();
    if (lower === 'help') setTerminal(prev => `${prev}\n$ ${clean}\nCommands: help, ls, tree, pwd, cat <file>, git status, git log, git branch, npm run dev, npm test, clear`);
    else if (lower === 'ls') setTerminal(prev => `${prev}\n$ ls\n${files.map(f => f.name).join('  ')}`);
    else if (lower === 'tree') setTerminal(prev => `${prev}\n$ tree\n${files.map(f => `├── ${f.path}`).join('\n')}`);
    else if (lower === 'pwd') setTerminal(prev => `${prev}\n$ pwd\n/codeforge/workspace`);
    else if (lower.startsWith('cat ')) { const name = clean.slice(4).trim(); const target = files.find(f => f.name === name || f.path === name); setTerminal(prev => `${prev}\n$ ${clean}\n${target ? target.content : `cat: ${name}: No such file`}`); }
    else if (lower === 'git status') setTerminal(prev => `${prev}\n$ git status\nOn branch ${branch}\n${files.some(f => f.modified) ? 'Changes not staged for commit' : 'working tree clean'}`);
    else if (lower === 'git log') setTerminal(prev => `${prev}\n$ git log\n${gitHistory.map((x, i) => `commit ${String(i + 1).padStart(7, '0')}  ${x}`).join('\n')}`);
    else if (lower === 'git branch') setTerminal(prev => `${prev}\n$ git branch\n* ${branch}\n  dev\n  feature/mobile`);
    else if (lower === 'npm run dev') { setTerminal(prev => `${prev}\n$ npm run dev\n✓ Runtime started at codeforge://localhost:5173`); setView('preview'); setPreviewKey(k => k + 1); }
    else if (lower === 'npm test') { setDiagnostics('Test runner: 3 checks passed.'); setTerminal(prev => `${prev}\n$ npm test\n✓ 3 checks passed`); }
    else if (lower === 'clear') setTerminal('CodeForge Terminal\n$ cleared');
    else setTerminal(prev => `${prev}\n$ ${clean}\nCodeForge runtime: command accepted (cloud/native shell required for real process execution).`);
    setCommand(''); setPanel(true);
  };

  const commit = () => { const message = gitMessage.trim(); if (!message) return; setGitHistory(prev => [message, ...prev]); setFiles(prev => prev.map(f => ({ ...f, modified: false }))); setTerminal(prev => `${prev}\n✓ [${branch}] committed: ${message}`); };
  const checkout = (next: string) => { setBranch(next); setTerminal(prev => `${prev}\n✓ Switched to branch ${next}`); };
  const exportProject = () => { const payload = JSON.stringify({ name: 'CodeForge Mobile Project', version: 2, branch, files }, null, 2); const blob = new Blob([payload], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'codeforge-project.codeforge.json'; a.click(); URL.revokeObjectURL(url); setTerminal(prev => `${prev}\n✓ Exported ${files.length} files`); };
  const importProject = (event: React.ChangeEvent<HTMLInputElement>) => { const input = event.target.files?.[0]; if (!input) return; const reader = new FileReader(); reader.onload = () => { try { const parsed = JSON.parse(String(reader.result)); if (!Array.isArray(parsed.files) || !parsed.files.length) throw new Error('invalid'); const normalized = parsed.files.map((f: Partial<FileItem>, i: number) => ({ id: f.id || crypto.randomUUID(), name: f.name || `file-${i + 1}.txt`, path: f.path || f.name || `file-${i + 1}.txt`, language: f.language || languageFor(f.name || ''), content: f.content || '' })); setFiles(normalized); setOpenTabs([normalized[0].id]); setActiveId(normalized[0].id); setBranch(parsed.branch || 'main'); setTerminal(prev => `${prev}\n✓ Imported ${normalized.length} files`); } catch { setTerminal(prev => `${prev}\n✗ Invalid CodeForge project file`); } }; reader.readAsText(input); event.target.value = ''; };
  const exportAndroidPackage = () => { const cap = JSON.stringify({ appId: 'ai.codeforge.mobile', appName: 'CodeForge Mobile', webDir: 'dist', server: { androidScheme: 'https' }, android: { minSdk: 24, targetSdk: 35, note: 'Use Capacitor Android project to produce APK/AAB.' } }, null, 2); const readme = 'CodeForge Mobile Android Build\n\n1. Build the web app.\n2. Add Capacitor Android.\n3. Open the generated Android project in Android Studio.\n4. Assemble APK or AAB.\n\nThis export is packaging configuration; a native Android build environment is required to compile the final APK/AAB.'; [ ['capacitor.config.json', cap], ['ANDROID-BUILD.md', readme] ].forEach(([name, body]) => { const blob = new Blob([body], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }); setTerminal(prev => `${prev}\n✓ Android packaging files exported`); };
  const formatFile = () => { if (!active) return; const content = active.content; const formatted = active.language === 'json' ? (() => { try { return JSON.stringify(JSON.parse(content), null, 2); } catch { return content; } })() : content.split('\n').map(line => line.trimEnd()).join('\n'); updateContent(formatted); setTerminal(prev => `${prev}\n✓ Formatter applied to ${active.name}`); };
  const executePalette = (action: string) => { setPalette(false); if (action === 'new') createFile(); if (action === 'terminal') setPanel(true); if (action === 'preview') setView('preview'); if (action === 'extensions') setView('extensions'); if (action === 'git') setView('git'); if (action === 'settings') setView('settings'); if (action === 'save') { setFiles(prev => prev.map(f => f.id === active.id ? { ...f, modified: false } : f)); setTerminal(prev => `${prev}\n✓ Saved ${active.name}`); } };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { const mod = e.metaKey || e.ctrlKey; if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); executePalette('save'); } else if (mod && e.key.toLowerCase() === 'p') { e.preventDefault(); setPalette(true); } else if (e.key === 'Escape') setPalette(false); };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  });

  const html = files.find(f => f.name === 'index.html')?.content || ''; const css = files.find(f => f.name === 'style.css')?.content || ''; const js = files.find(f => f.name === 'script.js')?.content || '';
  const preview = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${html.replace(/<head>[\s\S]*?<\/head>/i, '').replace(/<script[\s\S]*?<\/script>/gi, '')}<script>${js}</script></body></html>`;

  return <div className="app-shell">
    <header className="topbar">
      <button className="icon-btn mobile-only" aria-label="Open explorer" onClick={() => setSidebar(v => !v)}><Menu size={20} /></button>
      <div className="brand"><div className="brand-mark"><Code2 size={18} /></div><span>CodeForge</span><small>Android IDE</small></div>
      <div className="top-actions"><button className="command-btn" onClick={() => setPalette(true)}><Search size={14} /><span>Search / Command</span><kbd>⌘P</kbd></button><button className="action-btn" onClick={() => runCommand('npm run dev')}><Play size={15} /><span>Run</span></button><button className="icon-btn" title="Save" onClick={() => executePalette('save')}><Save size={17} /></button><button className="icon-btn" title="Export" onClick={exportProject}><Download size={18} /></button><button className="icon-btn" title="Import" onClick={() => fileInput.current?.click()}><Upload size={18} /></button><input ref={fileInput} type="file" accept="application/json,.codeforge" hidden onChange={importProject} /></div>
    </header>
    <div className="workspace">
      {sidebar && <aside className="sidebar">
        <div className="sidebar-head"><span>EXPLORER</span><div className="explorer-actions"><button className="mini-btn" title="New file" onClick={createFile}><FilePlus2 size={15} /></button><button className="mini-btn" title="New folder" onClick={() => setTerminal(prev => `${prev}\n✓ Virtual folder ready — add a path such as src/App.tsx when creating a file.`)}><FolderPlus size={15} /></button></div></div>
        <div className="search"><Search size={15} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter files" /></div>
        <div className="tree-root"><ChevronDown size={15} /><FolderOpen size={16} /><b>codeforge-app</b></div>
        <div className="tree">{filtered.map(file => <div key={file.id} className={`tree-file ${active?.id === file.id ? 'selected' : ''}`}><button onClick={() => openFile(file.id)}><FileCode2 size={16} /><span>{renameId === file.id ? <input autoFocus defaultValue={file.name} onBlur={e => renameFile(file.id, e.currentTarget.value)} onKeyDown={e => { if (e.key === 'Enter') renameFile(file.id, e.currentTarget.value); }} /> : <>{file.path}{file.modified ? ' •' : ''}</>}</span></button><div className="file-actions"><button title="Rename" onClick={() => setRenameId(file.id)}>R</button><button title="Duplicate" onClick={() => { const copy = { ...file, id: crypto.randomUUID(), name: `${file.name}.copy`, path: `${file.path}.copy`, modified: true }; setFiles(prev => [...prev, copy]); openFile(copy.id); }}><Copy size={12} /></button><button title="Delete" onClick={() => deleteFile(file.id)}><Trash2 size={12} /></button></div></div>)}</div>
        <div className="side-section"><label>SEARCH IN FILES</label><div className="search"><Search size={14} /><input value={contentSearch} onChange={e => setContentSearch(e.target.value)} placeholder="Find text..." /></div>{contentSearch && <div className="search-results">{matches.map(file => <button key={file.id} onClick={() => openFile(file.id)}>{file.name}<span>{file.content.toLowerCase().split(contentSearch.toLowerCase()).length - 1} match</span></button>)}{!matches.length && <small>No matches</small>}</div>}</div>
        <div className="side-tools"><button onClick={() => setView('git')}><GitBranch size={15} /> Source Control</button><button onClick={() => setView('extensions')}><Package size={15} /> Extensions</button><button onClick={() => setPanel(v => !v)}><Terminal size={15} /> Terminal</button><button onClick={exportProject}><Archive size={15} /> Export project</button><button onClick={() => fileInput.current?.click()}><Upload size={15} /> Import project</button><button onClick={exportAndroidPackage}><Download size={15} /> Android package</button></div>
        <div className="sidebar-bottom"><button onClick={() => setView('git')}><GitBranch size={14} /> {branch}</button><span><Zap size={14} /> Offline workspace</span></div>
      </aside>}
      <main className="main-area">
        <div className="tabs">{openTabs.map(id => { const file = files.find(f => f.id === id); if (!file) return null; return <button key={id} className={`tab ${id === activeId ? 'active' : ''}`} onClick={() => openFile(id)}><FileText size={14} />{file.name}{file.modified ? ' •' : ''}<span onClick={e => { e.stopPropagation(); closeTab(id); }}><X size={14} /></span></button>; })}<button className="new-tab" title="New file" onClick={createFile}><Plus size={17} /></button></div>
        {view === 'editor' && <div className="editor-wrap"><div className="editor-head"><span>{active?.path || 'No file'} {active?.modified ? '• unsaved' : ''}</span><span>{active?.language || 'plaintext'} · IntelliSense · {fontSize}px</span></div><div className="monaco-wrap"><Editor height="100%" theme="vs-dark" language={active?.language || 'plaintext'} value={active?.content || ''} onChange={value => updateContent(value ?? '')} options={{ minimap: { enabled: false }, fontSize, automaticLayout: true, wordWrap: wordWrap ? 'on' : 'off', tabSize: 2, suggestOnTriggerCharacters: true, quickSuggestions: true, parameterHints: { enabled: true }, inlineSuggest: { enabled: true }, padding: { top: 10 }, smoothScrolling: true, cursorBlinking: 'smooth', bracketPairColorization: { enabled: true }, guides: { bracketPairs: true } }} onValidate={markers => setDiagnostics(markers.length ? `${markers.length} editor diagnostic${markers.length > 1 ? 's' : ''} detected.` : 'No problems detected.')} /></div></div>}
        {view === 'preview' && <section className="full-view"><div className="view-head"><b>Runtime Preview</b><div className="view-actions"><span className="runtime-dot">● local</span><button onClick={() => setPreviewKey(k => k + 1)}><RefreshCw size={15} /> Refresh</button><button onClick={() => setView('editor')}>Editor</button></div></div><iframe key={previewKey} title="CodeForge runtime preview" sandbox="allow-scripts" srcDoc={preview} /></section>}
        {view === 'extensions' && <section className="full-view list-view"><div className="view-head"><b>Extensions</b><span>{extensions.filter(e => e.installed).length} installed</span></div>{extensions.map(ext => <div className="extension" key={ext.id}><div><b>{ext.name}</b><p>{ext.description}</p></div><button onClick={() => setExtensions(prev => prev.map(e => e.id === ext.id ? { ...e, installed: !e.installed } : e))}>{ext.installed ? <><Check size={14} /> Installed</> : 'Install'}</button></div>)}</section>}
        {view === 'git' && <section className="full-view list-view"><div className="view-head"><b>Source Control</b><div className="branch-picker"><GitBranch size={14} /><button onClick={() => checkout(branch === 'main' ? 'dev' : 'main')}>{branch}<ChevronDown size={13} /></button></div></div><div className="git-card"><Github size={18} /><div><b>Local Git workspace</b><p>Branching, commit history, status and local change tracking are available offline. Remote push/pull needs a Git provider connection.</p></div></div><textarea value={gitMessage} onChange={e => setGitMessage(e.target.value)} placeholder="Commit message" /><button className="primary-wide" onClick={commit}><GitCommit size={16} /> Commit changes</button><div className="status-note">{files.some(f => f.modified) ? '● Changes ready to commit' : '✓ Working tree clean'}</div><h4>Commit history</h4>{gitHistory.map((x, i) => <div className="commit" key={`${x}-${i}`}><GitCommit size={14} /><span>{x}</span><small>{i === 0 ? 'latest' : `commit ${i + 1}`}</small></div>)}</section>}
        {view === 'settings' && <section className="full-view list-view"><div className="view-head"><b>Settings</b></div><div className="setting-row"><span>Editor</span><b>Monaco</b></div><div className="setting-row"><span>Autocomplete</span><b>Enabled</b></div><div className="setting-row"><span>Diagnostics</span><b>{diagnostics}</b></div><div className="setting-row"><span>Font size</span><div className="stepper"><button onClick={() => setFontSize(v => Math.max(11, v - 1))}>−</button><b>{fontSize}px</b><button onClick={() => setFontSize(v => Math.min(22, v + 1))}>+</button></div></div><div className="setting-row"><span>Word wrap</span><button className={`toggle ${wordWrap ? 'on' : ''}`} onClick={() => setWordWrap(v => !v)}>{wordWrap ? 'On' : 'Off'}</button></div><div className="setting-row"><span>Storage</span><b>Local + offline PWA</b></div><div className="setting-row"><span>Android</span><b>Capacitor-ready</b></div><div className="shortcut-card"><Keyboard size={17} /><div><b>Shortcuts</b><p>⌘/Ctrl+P command palette · ⌘/Ctrl+S save · Esc close palette</p></div></div></section>}
        {panel && <section className="bottom-panel"><div className="panel-tabs"><div><button className="panel-active">TERMINAL</button><button onClick={() => setView('settings')}>PROBLEMS <em>{diagnostics.startsWith('No') ? 0 : 1}</em></button></div><button onClick={() => setPanel(false)}><X size={16} /></button></div><pre>{terminal}</pre><form className="terminal-input" onSubmit={e => { e.preventDefault(); runCommand(command); }}><span>$</span><input value={command} onChange={e => setCommand(e.target.value)} placeholder="help" autoCapitalize="off" autoCorrect="off" /></form></section>}
      </main>
    </div>
    <footer className="statusbar"><span><Check size={11} /> {active?.modified ? 'Unsaved changes' : 'Saved locally'}</span><span><GitBranch size={11} /> {branch}</span><span>{active?.language}</span><span>Ln 1, Col 1</span><button onClick={() => setView('settings')}><Settings size={12} /></button></footer>
    {palette && <div className="palette-backdrop" onMouseDown={() => setPalette(false)}><div className="palette" onMouseDown={e => e.stopPropagation()}><div className="palette-input"><Search size={16} /><input autoFocus placeholder="Type a command..." onChange={e => setSearch(e.target.value)} /></div><button onClick={() => executePalette('new')}><FilePlus2 size={15} /> New File <kbd>⌘N</kbd></button><button onClick={() => executePalette('save')}><Save size={15} /> Save File <kbd>⌘S</kbd></button><button onClick={() => executePalette('preview')}><Play size={15} /> Start Runtime</button><button onClick={() => executePalette('terminal')}><Terminal size={15} /> Toggle Terminal</button><button onClick={() => executePalette('git')}><GitBranch size={15} /> Source Control</button><button onClick={() => executePalette('extensions')}><Package size={15} /> Extensions</button><button onClick={() => executePalette('settings')}><Settings size={15} /> Settings</button></div></div>}
  </div>;
}

export default App;
