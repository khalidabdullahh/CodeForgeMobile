import { useEffect, useMemo, useRef, useState } from 'react';
import MonacoEditorRaw, { Editor as MonacoEditorNamed, DiffEditor as MonacoDiffNamed, OnMount } from '@monaco-editor/react';
import JSZip from 'jszip';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { saveFile } from './utils/saveFile';
import { tsToJs, jsModulesToCjs, buildPreviewHtml } from './utils/transpile';
import { runNative, needsInput, type NativeLang } from './utils/remoteRunner';
import { runShell, type ShellAction, type ShellHost, type ShellSession } from './utils/shell';

// Resilient fallback for ESM/CJS interop so Editor & DiffEditor are always valid React components
const Editor: any = (MonacoEditorRaw as any)?.default || MonacoEditorNamed || MonacoEditorRaw;
const DiffEditor: any = MonacoDiffNamed || (MonacoEditorRaw as any)?.DiffEditor;


import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowLeftToLine,
  ArrowRight,
  ArrowRightToLine,
  ArrowUp,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Cloud,
  Code2,
  Columns,
  Copy,
  CopyPlus,
  Download,
  FileCode2,
  FilePlus2,
  FileText,
  Files,
  Film,
  FolderOpen,
  FolderPlus,
  GitBranch,
  GitCommit,
  GitCompare,
  Github,
  Home,
  Indent,
  Keyboard,
  Layers,
  Menu,
  Mic,
  MicOff,
  MoreHorizontal,
  MoreVertical,
  Outdent,
  Package,
  Pencil,
  Pin,
  Play,
  Plus,
  Radio,
  RefreshCw,
  RotateCw,
  Save,
  Search,
  Send,
  Settings,
  Share2,
  Slash,
  Smartphone,
  Sparkles,
  Terminal,
  Trash2,
  Undo2,
  Upload,
  Users,
  Wand2,
  X,
  Zap
} from 'lucide-react';
import { LandingPage } from './LandingPage';
import { StykAnimeStudio } from './components/StykAnimeStudio';

// True when running inside the installed Android app (not the browser)
const isNativeApp = (() => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
})();

export type FileItem = { id: string; name: string; path: string; language: string; content: string; modified?: boolean };
type Extension = { id: string; name: string; description: string; installed: boolean };
type View = 'editor' | 'preview' | 'extensions' | 'git' | 'settings' | 'ai' | 'templates' | 'github-sync' | 'liveshare' | 'stykanime';
export type SidebarTab = 'explorer' | 'search' | 'git' | 'debug' | 'ai' | 'extensions' | 'settings';
type ThemeName = 'codeforge' | 'vs-dark' | 'light' | 'dracula' | 'one-dark-pro' | 'monokai' | 'synthwave-84';
type AiProvider = 'gemini' | 'openai';

interface AiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  codeSnippet?: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  files: FileItem[];
}

const defaultStarterFiles: FileItem[] = [
  {
    id: 'index',
    name: 'index.html',
    path: 'index.html',
    language: 'html',
    content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CodeForge App</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main class="card">
    <div class="header-badge">
      <span class="badge">CodeForge Mobile</span>
      <span class="pill">v2.5</span>
    </div>
    <h1>Hello, World 👋</h1>
    <p>Build, test & run modern web, Python & mobile apps directly from your phone.</p>
    
    <div class="actions">
      <button class="primary" onclick="testApp()">Interactive Test</button>
      <button class="secondary" onclick="logData()">Console Log</button>
    </div>
    
    <div id="output" class="output-box">Waiting for interaction...</div>
  </main>
  <script src="script.js"></script>
</body>
</html>`
  },
  {
    id: 'style',
    name: 'style.css',
    path: 'style.css',
    language: 'css',
    content: `:root {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color-scheme: dark;
}
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at top, #151e2b, #0b0f14);
  color: #eef2f7;
  padding: 16px;
}
.card {
  width: min(92vw, 540px);
  padding: 28px;
  border: 1px solid #283547;
  border-radius: 20px;
  background: rgba(17, 24, 34, 0.95);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
}
.header-badge {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.badge {
  color: #60a5fa;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.pill {
  background: #1e293b;
  color: #94a3b8;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 99px;
  border: 1px solid #334155;
}
h1 {
  font-size: 30px;
  margin: 14px 0 8px;
  font-weight: 800;
  letter-spacing: -0.5px;
}
p {
  color: #94a3b8;
  line-height: 1.5;
  margin-bottom: 20px;
}
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
button {
  border: 0;
  border-radius: 10px;
  padding: 12px 18px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}
button.primary {
  background: #2563eb;
  color: white;
}
button.primary:hover {
  background: #1d4ed8;
}
button.secondary {
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid #334155;
}
.output-box {
  margin-top: 18px;
  padding: 14px;
  border-radius: 10px;
  background: #090d12;
  border: 1px solid #1e293b;
  font-family: monospace;
  font-size: 13px;
  color: #38bdf8;
}`
  },
  {
    id: 'script',
    name: 'script.js',
    path: 'script.js',
    language: 'javascript',
    content: `let counter = 0;

function testApp() {
  counter++;
  const out = document.getElementById('output');
  out.textContent = '🚀 Click count: ' + counter + ' at ' + new Date().toLocaleTimeString();
  console.log('App interactive test triggered! Total clicks: ' + counter);
}

function logData() {
  const device = {
    screen: window.innerWidth + 'x' + window.innerHeight,
    userAgent: navigator.userAgent,
    timestamp: Date.now()
  };
  console.log('Device telemetry sent:', device);
  alert('Logged to in-app CodeForge console!');
}

console.log('CodeForge Mobile Runtime initialized smoothly.');`
  },
  {
    id: 'python-demo',
    name: 'main.py',
    path: 'main.py',
    language: 'python',
    content: `# CodeForge In-Browser Python Runtime (Pyodide)
import math
import sys
import datetime

print("🐍 Python runtime initialized in CodeForge Mobile!")
print(f"🕒 Current Timestamp: {datetime.datetime.now()}")

def fibonacci(n):
    a, b = 0, 1
    result = []
    for _ in range(n):
        result.append(a)
        a, b = b, a + b
    return result

sequence = fibonacci(10)
print(f"📊 Fibonacci (10 numbers): {sequence}")
print(f"📐 Math Pi calculation: {math.pi:.6f}")
print("✓ Done executing Python script on device.")
`
  },
  {
    id: 'readme',
    name: 'README.md',
    path: 'README.md',
    language: 'markdown',
    content: `# CodeForge Mobile IDE

A phone-first, VS Code-inspired coding environment for Android & Web.

## Key Features
- ⚡ **Monaco Editor** with rich syntax highlighting & IntelliSense
- 🐍 **In-Browser Python Execution (Pyodide)**
- 📁 **1-Click Starter Project Templates** (React, 2D Games, Python, Portfolio)
- 🐙 **Real GitHub Cloud Sync & Push** (via PAT)
- 🎤 **Voice-to-Code Assistant**
- 👥 **Realtime Live Share Collaboration**
- 🎨 **Multi-Theme Engine** (VS Dark, Dracula, One Dark, Monokai, Synthwave)
- 🖥️ **Live Interactive Preview** with in-app console & split view
- 📦 **Zip & Android (Capacitor)** packaging support
- 📴 **Offline PWA** capability
`
  }
];

export const projectTemplates: ProjectTemplate[] = [
  {
    id: 'starter-web',
    name: 'Default Mobile App',
    category: 'Web',
    icon: '🌐',
    description: 'HTML5, CSS3, JavaScript starter with interactive buttons & telemetry.',
    files: defaultStarterFiles
  },
  {
    id: 'python-algorithms',
    name: 'Python Data & Algorithms',
    category: 'Python',
    icon: '🐍',
    description: 'Standalone Python 3.12 script with algorithm runners & data processing.',
    files: [
      {
        id: 'py-main',
        name: 'main.py',
        path: 'main.py',
        language: 'python',
        content: `# CodeForge Python Data & Algorithm Engine
import math
import random
import time

print("🚀 Starting Data Processing Benchmark...")

data = [random.randint(1, 1000) for _ in range(50)]
print(f"Original Data Sample: {data[:10]}...")

def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

sorted_data = quicksort(data)
print(f"Sorted Data (First 10): {sorted_data[:10]}")
print(f"Average Value: {sum(data)/len(data):.2f}")
print("✓ Benchmark successfully finished in Pyodide!")
`
      },
      {
        id: 'py-readme',
        name: 'README.md',
        path: 'README.md',
        language: 'markdown',
        content: `# Python Script Project\n\nClick **Run Python** or type \`python main.py\` in the terminal to execute!`
      }
    ]
  },
  {
    id: 'retro-canvas-game',
    name: '2D Retro Arcade Game',
    category: 'Game',
    icon: '🎮',
    description: 'Playable HTML5 2D Canvas Snake Arcade Game with touch controls.',
    files: [
      {
        id: 'game-html',
        name: 'index.html',
        path: 'index.html',
        language: 'html',
        content: `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <title>Retro Snake 2D</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="game-container">
    <div class="score-bar">Score: <span id="score">0</span></div>
    <canvas id="gameCanvas" width="320" height="320"></canvas>
    
    <div class="dpad">
      <button class="up" onclick="changeDir('UP')">▲</button>
      <div class="middle-row">
        <button onclick="changeDir('LEFT')">◀</button>
        <button onclick="resetGame()">🔄</button>
        <button onclick="changeDir('RIGHT')">▶</button>
      </div>
      <button class="down" onclick="changeDir('DOWN')">▼</button>
    </div>
  </div>
  <script src="game.js"></script>
</body>
</html>`
      },
      {
        id: 'game-css',
        name: 'style.css',
        path: 'style.css',
        language: 'css',
        content: `body {
  margin: 0;
  background: #090d12;
  color: #fff;
  font-family: monospace;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.score-bar {
  font-size: 18px;
  font-weight: bold;
  color: #4ade80;
}
canvas {
  background: #111827;
  border: 2px solid #374151;
  border-radius: 12px;
}
.dpad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.middle-row {
  display: flex;
  gap: 6px;
}
.dpad button {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  background: #1f2937;
  border: 1px solid #4b5563;
  color: #38bdf8;
  font-size: 20px;
  cursor: pointer;
}
.dpad button:active {
  background: #2563eb;
  color: #fff;
}`
      },
      {
        id: 'game-js',
        name: 'game.js',
        path: 'game.js',
        language: 'javascript',
        content: `const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const grid = 16;
let score = 0;
let snake = [{x: 160, y: 160}];
let dx = grid, dy = 0;
let food = {x: 80, y: 80};

function changeDir(dir) {
  if (dir === 'UP' && dy === 0) { dx = 0; dy = -grid; }
  if (dir === 'DOWN' && dy === 0) { dx = 0; dy = grid; }
  if (dir === 'LEFT' && dx === 0) { dx = -grid; dy = 0; }
  if (dir === 'RIGHT' && dx === 0) { dx = grid; dy = 0; }
}

function resetGame() {
  snake = [{x: 160, y: 160}];
  dx = grid; dy = 0;
  score = 0;
  document.getElementById('score').textContent = score;
}

function gameLoop() {
  setTimeout(() => {
    requestAnimationFrame(gameLoop);
    
    let head = {x: snake[0].x + dx, y: snake[0].y + dy};
    if (head.x < 0) head.x = canvas.width - grid;
    if (head.x >= canvas.width) head.x = 0;
    if (head.y < 0) head.y = canvas.height - grid;
    if (head.y >= canvas.height) head.y = 0;
    
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      document.getElementById('score').textContent = score;
      food = {
        x: Math.floor(Math.random() * (canvas.width / grid)) * grid,
        y: Math.floor(Math.random() * (canvas.height / grid)) * grid
      };
    } else {
      snake.pop();
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(food.x, food.y, grid - 2, grid - 2);
    
    ctx.fillStyle = '#10b981';
    snake.forEach((part, i) => {
      ctx.fillStyle = i === 0 ? '#34d399' : '#059669';
      ctx.fillRect(part.x, part.y, grid - 2, grid - 2);
    });
  }, 100);
}

requestAnimationFrame(gameLoop);
console.log('Retro Snake game loaded!');`
      }
    ]
  },
  {
    id: 'react-tailwind',
    name: 'React 19 + Tailwind Component',
    category: 'React',
    icon: '⚛️',
    description: 'React component workspace with state, Tailwind styling & live preview.',
    files: [
      {
        id: 'react-html',
        name: 'index.html',
        path: 'index.html',
        language: 'html',
        content: `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen grid place-items-center p-4">
  <div id="root"></div>
  <script type="text/babel" src="app.jsx"></script>
</body>
</html>`
      },
      {
        id: 'react-jsx',
        name: 'app.jsx',
        path: 'app.jsx',
        language: 'javascript',
        content: `function App() {
  const [count, setCount] = React.useState(0);
  const [todos, setTodos] = React.useState(['Explore CodeForge Mobile', 'Build a React App on phone']);
  const [text, setText] = React.useState('');

  const addTodo = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setTodos([...todos, text]);
    setText('');
  };

  return (
    <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">React + Tailwind</span>
        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">v18 CDN</span>
      </div>
      
      <h1 className="text-2xl font-black text-white">Mobile React Workspace ⚛️</h1>
      
      <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
        <button onClick={() => setCount(c => c - 1)} className="bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg font-bold text-lg">−</button>
        <span className="flex-1 text-center font-mono font-bold text-blue-400">Count: {count}</span>
        <button onClick={() => setCount(c => c + 1)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg font-bold text-lg">+</button>
      </div>

      <form onSubmit={addTodo} className="flex gap-2">
        <input 
          value={text} 
          onChange={e => setText(e.target.value)} 
          placeholder="New Task..." 
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <button type="submit" className="bg-blue-600 font-bold px-4 py-2 rounded-lg text-sm">Add</button>
      </form>

      <ul className="space-y-2">
        {todos.map((item, idx) => (
          <li key={idx} className="flex items-center gap-2 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 text-slate-300">
            <span>✓</span> {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));`
      }
    ]
  }
];

const defaultExtensions: Extension[] = [
  { id: 'prettier', name: 'Prettier', description: 'Code formatter for web projects.', installed: true },
  { id: 'eslint', name: 'ESLint', description: 'JavaScript and TypeScript diagnostics.', installed: true },
  { id: 'ai-copilot', name: 'AI Copilot', description: 'Inline code suggestions and automated bug repair.', installed: true },
  { id: 'python', name: 'Python Pyodide Runner', description: 'In-browser Python 3.12 runtime with real output.', installed: true },
  { id: 'tailwind', name: 'Tailwind CSS', description: 'Class completion for Tailwind projects.', installed: true },
  { id: 'gitlens', name: 'GitLens', description: 'Git history, blame, and repository insights.', installed: false },
  { id: 'kotlin', name: 'Kotlin & Android', description: 'Kotlin syntax and Android project packaging tools.', installed: true }
];

const quickSymbols = [
  { label: '{ }', insert: '{}', wrap: true },
  { label: '( )', insert: '()', wrap: true },
  { label: '[ ]', insert: '[]', wrap: true },
  { label: '< >', insert: '<>', wrap: true },
  { label: '=>', insert: ' => ' },
  { label: ';', insert: ';' },
  { label: ':', insert: ':' },
  { label: '=', insert: ' = ' },
  { label: '===', insert: ' === ' },
  { label: '!==', insert: ' !== ' },
  { label: '+', insert: ' + ' },
  { label: '-', insert: ' - ' },
  { label: '*', insert: ' * ' },
  { label: '/', insert: ' / ' },
  { label: '" "', insert: '""', wrap: true },
  { label: "' '", insert: "''", wrap: true },
  { label: '` `', insert: '``', wrap: true },
  { label: '$', insert: '$' },
  { label: '!', insert: '!' },
  { label: '&&', insert: ' && ' },
  { label: '||', insert: ' || ' },
  { label: '?.', insert: '?.' },
  { label: '_', insert: '_' },
  { label: '@', insert: '@' }
];

// Safe localStorage wrappers: storage can throw (quota exceeded, private mode, blocked access)
function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable or full */ }
}

function languageFor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  return (
    ({
      js: 'javascript',
      mjs: 'javascript',
      cjs: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      json: 'json',
      css: 'css',
      scss: 'scss',
      less: 'less',
      html: 'html',
      htm: 'html',
      md: 'markdown',
      markdown: 'markdown',
      py: 'python',
      pyw: 'python',
      c: 'c',
      h: 'c',
      cpp: 'cpp',
      cc: 'cpp',
      cxx: 'cpp',
      hpp: 'cpp',
      java: 'java',
      kt: 'kotlin',
      kts: 'kotlin',
      rs: 'rust',
      go: 'go',
      php: 'php',
      rb: 'ruby',
      cs: 'csharp',
      swift: 'swift',
      dart: 'dart',
      xml: 'xml',
      svg: 'xml',
      yml: 'yaml',
      yaml: 'yaml',
      sh: 'shell',
      bash: 'shell',
      zsh: 'shell',
      sql: 'sql',
      txt: 'plaintext'
    } as Record<string, string>)[ext || ''] || 'plaintext'
  );
}

const AVAILABLE_LANGUAGES = [
  { id: 'typescript', name: 'TypeScript', ext: '.ts' },
  { id: 'javascript', name: 'JavaScript', ext: '.js' },
  { id: 'html', name: 'HTML5', ext: '.html' },
  { id: 'css', name: 'CSS3', ext: '.css' },
  { id: 'scss', name: 'SCSS', ext: '.scss' },
  { id: 'python', name: 'Python', ext: '.py' },
  { id: 'json', name: 'JSON', ext: '.json' },
  { id: 'markdown', name: 'Markdown', ext: '.md' },
  { id: 'sql', name: 'SQL', ext: '.sql' },
  { id: 'cpp', name: 'C++', ext: '.cpp' },
  { id: 'c', name: 'C', ext: '.c' },
  { id: 'csharp', name: 'C#', ext: '.cs' },
  { id: 'java', name: 'Java', ext: '.java' },
  { id: 'kotlin', name: 'Kotlin', ext: '.kt' },
  { id: 'rust', name: 'Rust', ext: '.rs' },
  { id: 'go', name: 'Go', ext: '.go' },
  { id: 'php', name: 'PHP', ext: '.php' },
  { id: 'ruby', name: 'Ruby', ext: '.rb' },
  { id: 'swift', name: 'Swift', ext: '.swift' },
  { id: 'dart', name: 'Dart', ext: '.dart' },
  { id: 'shell', name: 'Shell Script', ext: '.sh' },
  { id: 'yaml', name: 'YAML', ext: '.yaml' },
  { id: 'xml', name: 'XML', ext: '.xml' },
  { id: 'plaintext', name: 'Plain Text', ext: '.txt' },
];

const themeBgMap: Record<ThemeName, string> = {
  'codeforge': '#0c0d10',
  'vs-dark': '#0b0e12',
  'light': '#f8fafc',
  'dracula': '#282a36',
  'one-dark-pro': '#21252b',
  'monokai': '#272822',
  'synthwave-84': '#241b2f'
};

function App() {
  const [inIdeMode, setInIdeMode] = useState<boolean>(() => {
    return isNativeApp || window.location.search.includes('mode=ide') || window.location.hash === '#ide';
  });

  const [files, setFiles] = useState<FileItem[]>(() => {
    try {
      const saved = JSON.parse(safeGet('codeforge-files') || 'null');
      return Array.isArray(saved) && saved.length ? saved : defaultStarterFiles;
    } catch {
      return defaultStarterFiles;
    }
  });
  const [activeId, setActiveId] = useState('index');
  const [openTabs, setOpenTabs] = useState<string[]>(['index']);
  const [pinnedTabs, setPinnedTabs] = useState<string[]>([]);
  const [showTabActionsModal, setShowTabActionsModal] = useState(false);
  const [showTabMenu, setShowTabMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [showFileMenu, setShowFileMenu] = useState<FileItem | null>(null);
  const [workspaceExpanded, setWorkspaceExpanded] = useState(true);
  const [diffTarget, setDiffTarget] = useState<FileItem | null>(null);
  const [diffSideBySide, setDiffSideBySide] = useState(false);
  const [savedSnapshots, setSavedSnapshots] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    defaultStarterFiles.forEach(f => { map[f.id] = f.content; });
    return map;
  });
  const tabItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [sidebar, setSidebar] = useState(() => window.innerWidth >= 768);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('explorer');
  const [replaceSearch, setReplaceSearch] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [panel, setPanel] = useState(false);
  const [isPanelMaximized, setIsPanelMaximized] = useState(false);
  const [cmdHistory, setCmdHistory] = useState<string[]>(['help', 'ls']);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const terminalOutputRef = useRef<HTMLPreElement>(null);
  const [search, setSearch] = useState('');
  const [contentSearch, setContentSearch] = useState('');
  const [terminal, setTerminal] = useState('CodeForge Terminal\nType help to see the commands (files, pipes, python, node, g++, javac, git...).');
  const [command, setCommand] = useState('');
  const [view, setView] = useState<View>('editor');
  const [extensions, setExtensions] = useState<Extension[]>(() => {
    try {
      const saved = JSON.parse(safeGet('codeforge-extensions') || 'null');
      return Array.isArray(saved) && saved.length ? saved : defaultExtensions;
    } catch {
      return defaultExtensions;
    }
  });
  const [gitMessage, setGitMessage] = useState('Update workspace');
  const [gitHistory, setGitHistory] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(safeGet('codeforge-git') || 'null');
      return Array.isArray(saved) && saved.length ? saved : ['Initial workspace snapshot'];
    } catch {
      return ['Initial workspace snapshot'];
    }
  });
  const [branch, setBranch] = useState('main');
  const [previewKey, setPreviewKey] = useState(0);
  const [splitPreview, setSplitPreview] = useState(false);
  const [palette, setPalette] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [paletteSearchQuery, setPaletteSearchQuery] = useState('');
  const [paletteCategoryFilter, setPaletteCategoryFilter] = useState<'all' | 'file' | 'edit' | 'view' | 'preferences' | 'run' | 'git'>('all');
  const [paletteActiveIndex, setPaletteActiveIndex] = useState(0);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(() => {
    const n = Number(safeGet('codeforge-font') || 13);
    return Number.isFinite(n) && n > 0 ? n : 13;
  });
  const [wordWrap, setWordWrap] = useState(true);
  const [theme, setTheme] = useState<ThemeName>(() => {
    const stored = safeGet('codeforge-theme') as ThemeName | null;
    // One-time move from the old default (VS Dark) to the new CodeForge theme; later choices are respected
    if (!safeGet('codeforge-theme-v2')) {
      safeSet('codeforge-theme-v2', '1');
      if (!stored || stored === 'vs-dark') {
        safeSet('codeforge-theme', 'codeforge');
        return 'codeforge';
      }
    }
    return stored || 'codeforge';
  });
  const [diagnostics, setDiagnostics] = useState('No problems detected.');
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  // Landscape state & banner
  const [isLandscape, setIsLandscape] = useState<boolean>(() => window.innerWidth > window.innerHeight);
  const [showLandscapeBanner, setShowLandscapeBanner] = useState(true);

  // Pyodide Python Runner State
  const [pyRunning, setPyRunning] = useState(false);

  // GitHub Cloud Sync State
  const [ghToken, setGhToken] = useState(() => {
    try {
      localStorage.removeItem('codeforge-gh-token'); // Security: clear any persistent token
      return sessionStorage.getItem('codeforge-gh-token') || '';
    } catch {
      return '';
    }
  });
  const [ghRepoInput, setGhRepoInput] = useState(() => safeGet('codeforge-gh-repo') || 'khalidabdullahh/CodeForgeMobile');
  const [ghLoading, setGhLoading] = useState(false);
  const [ghStatusMsg, setGhStatusMsg] = useState('');

  // Voice to Code Dictation State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  // Live Share State
  const [liveShareId, setLiveShareId] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryRoom = urlParams.get('room');
      if (queryRoom) return queryRoom;
      return safeGet('codeforge-liveshare-id') || 'forge-room-101';
    } catch {
      return 'forge-room-101';
    }
  });
  const [liveShareConnected, setLiveShareConnected] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).has('room');
    } catch {
      return false;
    }
  });
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const liveChannelRef = useRef<BroadcastChannel | null>(null);
  const filesRef = useRef(files);
  filesRef.current = files;

  // AI State
  const [aiProvider, setAiProvider] = useState<AiProvider>(() => (safeGet('codeforge-ai-provider') as AiProvider) || 'gemini');
  const [aiApiKey, setAiApiKey] = useState(() => safeGet('codeforge-ai-key') || '');
  const [aiCustomEndpoint, setAiCustomEndpoint] = useState(() => safeGet('codeforge-ai-endpoint') || 'https://api.openai.com/v1');
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I am your CodeForge AI Assistant. Ask me anything about your code, or use the quick actions below to explain, fix bugs, or generate new features!"
    }
  ]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Find & Replace
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');

  // New File Modal
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileInputValue, setNewFileInputValue] = useState('');

  // Import Project Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const zipFileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);
  // Read the live editor text, but never trust an editor that has been unmounted/disposed
  // (its getValue() returns '' and would wipe the file when Run is pressed from another view).
  const readEditorValue = (fallback: string) => {
    try {
      const ed = editorRef.current;
      const model = ed?.getModel?.();
      if (ed && model && !(model.isDisposed && model.isDisposed())) return ed.getValue();
    } catch {
      /* fall through to the saved content */
    }
    return fallback;
  };
  const monacoRef = useRef<any>(null);

  // Sticky Scroll & Breadcrumbs
  const [stickyScroll, setStickyScroll] = useState<boolean>(() => {
    return safeGet('codeforge-sticky-scroll') !== 'false';
  });
  const [breadcrumbsEnabled, setBreadcrumbsEnabled] = useState<boolean>(() => {
    return safeGet('codeforge-breadcrumbs') !== 'false';
  });
  const [currentCursor, setCurrentCursor] = useState<{ line: number; column: number }>({ line: 1, column: 1 });
  const [currentSymbol, setCurrentSymbol] = useState<string | null>(null);
  const [showBreadcrumbsMenu, setShowBreadcrumbsMenu] = useState(false);

  // Mobile Toolbar Mode (Symbols vs Language Snippets)
  const [toolbarMode, setToolbarMode] = useState<'symbols' | 'snippets'>('symbols');

  // Matplotlib Python Plot Image State
  const [plotImage, setPlotImage] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<'terminal' | 'logs' | 'plot' | 'problems'>('terminal');

  // Diagnostics & Problems tracking
  const [editorMarkers, setEditorMarkers] = useState<any[]>([]);
  const errorCount = useMemo(() => editorMarkers.filter(m => m.severity === 8).length, [editorMarkers]);
  const warningCount = useMemo(() => editorMarkers.filter(m => m.severity === 4).length, [editorMarkers]);

  // Indentation Settings
  const [indentSettings, setIndentSettings] = useState<{ tabSize: number; insertSpaces: boolean }>(() => {
    const saved = safeGet('codeforge-indent');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Number.isFinite(parsed.tabSize) && typeof parsed.insertSpaces === 'boolean') return parsed;
      } catch {}
    }
    return { tabSize: 2, insertSpaces: true };
  });

  // Line Sequence Endings
  const [lineEnding, setLineEnding] = useState<'LF' | 'CRLF'>('LF');

  // Status Bar Pickers & Modals
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [langSearchQuery, setLangSearchQuery] = useState('');
  const [showIndentPicker, setShowIndentPicker] = useState(false);
  const [showGoToLine, setShowGoToLine] = useState(false);
  const [goToLineInput, setGoToLineInput] = useState('');

  // Instant Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Error detector for 1-Click AI Fixer
  const hasTerminalError = useMemo(() => {
    return /🔴|Traceback|SyntaxError|TypeError|ReferenceError|NameError|Error:|failed|Exception|cannot find/i.test(terminal);
  }, [terminal]);

  const active = files.find(f => f.id === activeId) || files[0];
  const filtered = useMemo(() => files.filter(f => `${f.path} ${f.name}`.toLowerCase().includes(search.toLowerCase())), [files, search]);
  const matches = useMemo(() => (contentSearch.trim() ? files.filter(f => f.content.toLowerCase().includes(contentSearch.toLowerCase())) : []), [files, contentSearch]);

  const searchResultsWithSnippets = useMemo(() => {
    if (!contentSearch.trim()) return [];
    const q = contentSearch;
    const isCase = matchCase;
    const isWhole = matchWholeWord;
    const qLower = q.toLowerCase();

    return files.map(file => {
      const lines = file.content.split('\n');
      const matchedLines: { lineNum: number; lineText: string }[] = [];

      lines.forEach((line, idx) => {
        let isMatch = false;
        if (isWhole) {
          const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const reg = new RegExp(`\\b${escaped}\\b`, isCase ? 'g' : 'gi');
          isMatch = reg.test(line);
        } else if (isCase) {
          isMatch = line.includes(q);
        } else {
          isMatch = line.toLowerCase().includes(qLower);
        }

        if (isMatch) {
          matchedLines.push({ lineNum: idx + 1, lineText: line.trim() });
        }
      });

      return {
        file,
        matchedLines
      };
    }).filter(res => res.matchedLines.length > 0);
  }, [files, contentSearch, matchCase, matchWholeWord]);

  const handleActivityBarClick = (tab: SidebarTab) => {
    if (sidebar && sidebarTab === tab) {
      setSidebar(false);
    } else {
      setSidebarTab(tab);
      setSidebar(true);
    }
  };

  const replaceAllAcrossFiles = () => {
    if (!contentSearch) return;
    let totalReplacements = 0;
    let filesUpdated = 0;
    setFiles(prev =>
      prev.map(file => {
        const regexFlags = matchCase ? 'g' : 'gi';
        const queryEscaped = contentSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = matchWholeWord ? `\\b${queryEscaped}\\b` : queryEscaped;
        const regex = new RegExp(pattern, regexFlags);
        const matchesCount = (file.content.match(regex) || []).length;
        if (matchesCount > 0) {
          totalReplacements += matchesCount;
          filesUpdated++;
          const newContent = file.content.replace(regex, replaceSearch);
          return { ...file, content: newContent, modified: true };
        }
        return file;
      })
    );
    setTerminal(prev => `${prev}\n✓ Replaced ${totalReplacements} occurrence(s) in ${filesUpdated} file(s)`);
  };

  useEffect(() => { safeSet('codeforge-files', JSON.stringify(files)); }, [files]);
  useEffect(() => { safeSet('codeforge-git', JSON.stringify(gitHistory)); }, [gitHistory]);
  useEffect(() => { safeSet('codeforge-extensions', JSON.stringify(extensions)); }, [extensions]);
  useEffect(() => { safeSet('codeforge-font', String(fontSize)); }, [fontSize]);
  useEffect(() => { safeSet('codeforge-theme', theme); }, [theme]);
  useEffect(() => { safeSet('codeforge-ai-provider', aiProvider); }, [aiProvider]);
  useEffect(() => { safeSet('codeforge-ai-key', aiApiKey); }, [aiApiKey]);
  useEffect(() => { safeSet('codeforge-ai-endpoint', aiCustomEndpoint); }, [aiCustomEndpoint]);
  useEffect(() => {
    try {
      sessionStorage.setItem('codeforge-gh-token', ghToken);
    } catch {}
  }, [ghToken]);
  useEffect(() => { safeSet('codeforge-gh-repo', ghRepoInput); }, [ghRepoInput]);
  useEffect(() => { safeSet('codeforge-sticky-scroll', String(stickyScroll)); }, [stickyScroll]);
  useEffect(() => { safeSet('codeforge-breadcrumbs', String(breadcrumbsEnabled)); }, [breadcrumbsEnabled]);

  const detectSymbolAtLine = (content: string, language: string, targetLine: number): string | null => {
    if (!content) return null;
    const lines = content.split('\n');
    const lineIndex = Math.min(Math.max(0, targetLine - 1), lines.length - 1);

    for (let i = lineIndex; i >= 0 && i >= lineIndex - 60; i--) {
      const line = lines[i].trim();
      if (!line) continue;

      if (language === 'python') {
        const defMatch = line.match(/^def\s+([a-zA-Z0-9_]+)\s*\(/);
        if (defMatch) return `def ${defMatch[1]}()`;
        const classMatch = line.match(/^class\s+([a-zA-Z0-9_]+)/);
        if (classMatch) return `class ${classMatch[1]}`;
      } else if (language === 'javascript' || language === 'typescript') {
        const fnMatch = line.match(/(?:function\s+([a-zA-Z0-9_]+)|(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>)/);
        if (fnMatch) return `${fnMatch[1] || fnMatch[2]}()`;
        const methodMatch = line.match(/^([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{/);
        if (methodMatch && !['if', 'for', 'while', 'switch', 'catch'].includes(methodMatch[1])) {
          return `${methodMatch[1]}()`;
        }
        const classMatch = line.match(/^class\s+([a-zA-Z0-9_]+)/);
        if (classMatch) return `class ${classMatch[1]}`;
      } else if (language === 'html') {
        const tagMatch = line.match(/<([a-zA-Z0-9\-]+)(?:\s+[^>]*class=["']([^"']+)["'])?[^>]*>/);
        if (tagMatch && !tagMatch[0].endsWith('/>') && !['meta', 'link', 'br', 'hr', 'img', 'input'].includes(tagMatch[1].toLowerCase())) {
          return tagMatch[2] ? `<${tagMatch[1]}.${tagMatch[2].split(' ')[0]}>` : `<${tagMatch[1]}>`;
        }
      } else if (language === 'css') {
        const selMatch = line.match(/^([.#a-zA-Z0-9_\-\s,>:+]+)\s*\{/);
        if (selMatch) return selMatch[1].trim();
      }
    }
    return null;
  };

  useEffect(() => {
    if (active) {
      const sym = detectSymbolAtLine(active.content, active.language, currentCursor.line);
      setCurrentSymbol(sym);
    }
  }, [active?.id, active?.content, currentCursor.line]);


  // Track orientation changes
  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Auto-load shared project from URL hash
  useEffect(() => {
    try {
      if (window.location.hash.startsWith('#share=')) {
        const raw = window.location.hash.replace('#share=', '');
        const decoded = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(raw)))));
        if (Array.isArray(decoded) && decoded.length) {
          setFiles(decoded);
          setActiveId(decoded[0]?.id || 'index');
          setTerminal(prev => `${prev}\n🎉 [Share Link]: Loaded project snapshot with ${decoded.length} files!`);
        }
      }
    } catch (e) {
      console.error('Failed to load shared project from hash', e);
    }
  }, []);

  const generateShareLink = () => {
    try {
      const payload = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(files)))));
      const shareUrl = `${window.location.origin}${window.location.pathname}#share=${payload}`;
      navigator.clipboard?.writeText(shareUrl).catch(() => {});
      setShowShareModal(true);
      setCopiedShare(true);
      setTerminal(prev => `${prev}\n🔗 Share URL generated and copied to clipboard!`);
    } catch {
      setShowShareModal(true);
    }
  };

  const getLanguageSnippets = (lang: string) => {
    switch (lang) {
      case 'python':
        return [
          { label: 'def', insert: 'def ():' },
          { label: 'class', insert: 'class :' },
          { label: 'print', insert: 'print()' },
          { label: 'import', insert: 'import ' },
          { label: 'for in', insert: 'for item in :' },
          { label: 'if/else', insert: 'if :\n    pass\nelse:\n    pass' },
          { label: 'return', insert: 'return ' },
          { label: 'try/except', insert: 'try:\n    pass\nexcept Exception as e:\n    print(e)' },
          { label: 'self.', insert: 'self.' },
          { label: 'lambda', insert: 'lambda x: ' }
        ];
      case 'javascript':
      case 'typescript':
        return [
          { label: 'const', insert: 'const ' },
          { label: 'let', insert: 'let ' },
          { label: 'function', insert: 'function () {\n  \n}' },
          { label: '=>', insert: '() => {\n  \n}' },
          { label: 'log', insert: 'console.log();' },
          { label: 'async', insert: 'async ' },
          { label: 'await', insert: 'await ' },
          { label: 'return', insert: 'return ' },
          { label: 'if/else', insert: 'if () {\n  \n} else {\n  \n}' },
          { label: 'try/catch', insert: 'try {\n  \n} catch (e) {\n  console.error(e);\n}' }
        ];
      case 'html':
        return [
          { label: 'div', insert: '<div></div>' },
          { label: 'button', insert: '<button></button>' },
          { label: 'class', insert: 'class=""' },
          { label: 'script', insert: '<script>\n  \n</script>' },
          { label: 'style', insert: '<style>\n  \n</style>' },
          { label: 'p', insert: '<p></p>' },
          { label: 'h1', insert: '<h1></h1>' },
          { label: 'span', insert: '<span></span>' }
        ];
      case 'css':
        return [
          { label: 'display: flex', insert: 'display: flex;' },
          { label: 'grid', insert: 'display: grid;' },
          { label: 'center', insert: 'place-items: center;' },
          { label: 'padding', insert: 'padding: 16px;' },
          { label: 'margin', insert: 'margin: 0 auto;' },
          { label: 'color', insert: 'color: #ffffff;' },
          { label: 'border', insert: 'border: 1px solid #334155;' },
          { label: 'radius', insert: 'border-radius: 8px;' }
        ];
      case 'cpp':
      case 'c':
        return [
          { label: '#include', insert: '#include <iostream>\n' },
          { label: 'cout', insert: 'std::cout <<  << std::endl;' },
          { label: 'int main', insert: 'int main() {\n    \n    return 0;\n}' },
          { label: 'printf', insert: 'printf("\\n");' },
          { label: 'for', insert: 'for (int i = 0; i < n; i++) {\n    \n}' },
          { label: 'return 0', insert: 'return 0;' }
        ];
      case 'java':
        return [
          { label: 'public class', insert: 'public class Main {\n    \n}' },
          { label: 'sysout', insert: 'System.out.println();' },
          { label: 'main', insert: 'public static void main(String[] args) {\n    \n}' },
          { label: 'return', insert: 'return;' }
        ];
      default:
        return [
          { label: 'function', insert: 'function' },
          { label: 'return', insert: 'return' },
          { label: 'if', insert: 'if' }
        ];
    }
  };

  // Handle Live Share BroadcastChannel (stable: does not recreate on every file edit)
  useEffect(() => {
    if (!liveShareConnected) {
      if (liveChannelRef.current) {
        liveChannelRef.current.close();
        liveChannelRef.current = null;
      }
      return;
    }
    const channel = new BroadcastChannel(`codeforge-${liveShareId}`);
    liveChannelRef.current = channel;
    channel.onmessage = (event) => {
      const { type, payload, sender } = event.data;
      if (type === 'sync-code' && payload) {
        setFiles(prev => prev.map(f => f.id === payload.fileId ? { ...f, content: payload.content, modified: true } : f));
      } else if (type === 'peer-joined') {
        setConnectedPeers(prev => Array.from(new Set([...prev, sender || 'Peer'])));
        setTerminal(prev => `${prev}\n👥 [Live Share] New peer joined room "${liveShareId}"!`);
        // Share current workspace snapshot to newly joined peer (use ref to avoid stale/deps issues)
        channel.postMessage({ type: 'sync-snapshot', payload: filesRef.current, sender: 'Host' });
      } else if (type === 'sync-snapshot' && Array.isArray(payload) && payload.length) {
        setFiles(payload);
        setTerminal(prev => `${prev}\n👥 [Live Share] Received synced workspace snapshot (${payload.length} files).`);
      }
    };
    channel.postMessage({ type: 'peer-joined', sender: 'Dev-' + Math.floor(Math.random() * 1000) });
    return () => {
      channel.close();
      liveChannelRef.current = null;
    };
  }, [liveShareConnected, liveShareId]);

  // Handle iframe console messages
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'codeforge-console') {
        const prefix = e.data.level === 'error' ? '🔴 [Error]' : e.data.level === 'warn' ? '🟡 [Warn]' : '🔵 [Log]';
        const msg = `${prefix} ${e.data.message}`;
        setConsoleLogs(prev => [...prev.slice(-49), msg]);
        setTerminal(prev => `${prev}\n${msg}`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Custom Monaco themes are registered before the editor mounts so the first paint already uses them
  const defineEditorThemes = (monaco: any) => {
    // Define custom themes
    monaco.editor.defineTheme('codeforge', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6f6b60', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'e0a46a' },
        { token: 'tag', foreground: 'e0a46a' },
        { token: 'string', foreground: 'a9c28a' },
        { token: 'attribute.value', foreground: 'a9c28a' },
        { token: 'number', foreground: 'd9a864' },
        { token: 'type', foreground: '8fb6c9' },
        { token: 'attribute.name', foreground: '8fb6c9' },
        { token: 'function', foreground: 'efe9da' },
        { token: 'variable', foreground: 'd6d1c3' },
        { token: 'delimiter', foreground: 'aaa595' }
      ],
      colors: {
        'editor.background': '#0c0d10',
        'editor.foreground': '#d6d1c3',
        'editor.lineHighlightBackground': '#efe9da0d',
        'editorCursor.foreground': '#d9a864',
        'editor.selectionBackground': '#d9a86433',
        'editorLineNumber.foreground': '#5d5a50',
        'editorLineNumber.activeForeground': '#d9a864',
        'editorGutter.background': '#0c0d10',
        'editorIndentGuide.background1': '#efe9da14',
        'editorWidget.background': '#131519',
        'editorSuggestWidget.background': '#131519',
        'editorSuggestWidget.selectedBackground': '#d9a86426',
        'scrollbarSlider.background': '#efe9da1f'
      }
    });

    monaco.editor.defineTheme('dracula', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff79c6' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'type', foreground: '8be9fd' },
        { token: 'function', foreground: '50fa7b' },
        { token: 'variable', foreground: 'f8f8f2' }
      ],
      colors: {
        'editor.background': '#282a36',
        'editor.foreground': '#f8f8f2',
        'editor.lineHighlightBackground': '#44475a44',
        'editorCursor.foreground': '#f8f8f0'
      }
    });

    monaco.editor.defineTheme('one-dark-pro', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c678dd' },
        { token: 'string', foreground: '98c379' },
        { token: 'number', foreground: 'd19a66' },
        { token: 'type', foreground: 'e5c07b' },
        { token: 'function', foreground: '61afef' },
        { token: 'variable', foreground: 'e06c75' }
      ],
      colors: {
        'editor.background': '#21252b',
        'editor.foreground': '#abb2bf',
        'editor.lineHighlightBackground': '#2c313a',
        'editorCursor.foreground': '#528bff'
      }
    });

    monaco.editor.defineTheme('monokai', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '75715e' },
        { token: 'keyword', foreground: 'f92672' },
        { token: 'string', foreground: 'e6db74' },
        { token: 'number', foreground: 'ae81ff' },
        { token: 'type', foreground: '66d9ef', fontStyle: 'italic' },
        { token: 'function', foreground: 'a6e22e' }
      ],
      colors: {
        'editor.background': '#272822',
        'editor.foreground': '#f8f8f2',
        'editor.lineHighlightBackground': '#3e3d32',
        'editorCursor.foreground': '#f8f8f0'
      }
    });

    monaco.editor.defineTheme('synthwave-84', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '848bbd', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'f92aad' },
        { token: 'string', foreground: 'ff8b39' },
        { token: 'number', foreground: 'f97e72' },
        { token: 'type', foreground: 'fe4450' },
        { token: 'function', foreground: '36f9f6' }
      ],
      colors: {
        'editor.background': '#241b2f',
        'editor.foreground': '#f92aad',
        'editor.lineHighlightBackground': '#352549',
        'editorCursor.foreground': '#f92aad'
      }
    });
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition((e: any) => {
      setCurrentCursor({ line: e.position.lineNumber, column: e.position.column });
      const sym = detectSymbolAtLine(editor.getValue(), active?.language || 'plaintext', e.position.lineNumber);
      setCurrentSymbol(sym);
    });

    defineEditorThemes(monaco);
    monaco.editor.setTheme(theme);
  };

  const openFile = (id: string) => {
    setActiveId(id);
    setOpenTabs(prev => (prev.includes(id) ? prev : [...prev, id]));
    if (view !== 'preview') setView('editor');
    if (window.innerWidth < 768) setSidebar(false);
  };

  const updateContent = (content: string) => {
    setFiles(prev => prev.map(f => (f.id === active.id ? { ...f, content, modified: true } : f)));
    if (liveShareConnected && liveChannelRef.current) {
      liveChannelRef.current.postMessage({
        type: 'sync-code',
        payload: { fileId: active.id, content }
      });
    }
  };

  const closeTab = (id: string) => {
    setPinnedTabs(prev => prev.filter(x => x !== id));
    const next = openTabs.filter(x => x !== id);
    setOpenTabs(next);
    if (activeId === id) setActiveId(next[next.length - 1] || '');
  };

  const togglePinTab = (id: string) => {
    setPinnedTabs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const closeOtherTabs = (id: string) => {
    const next = openTabs.filter(x => x === id || pinnedTabs.includes(x));
    setOpenTabs(next);
    setActiveId(id);
  };

  const closeTabsToTheRight = (id: string) => {
    const idx = openTabs.indexOf(id);
    if (idx === -1) return;
    const next = openTabs.filter((x, i) => i <= idx || pinnedTabs.includes(x));
    setOpenTabs(next);
    if (!next.includes(activeId)) setActiveId(id);
  };

  const closeSavedTabs = () => {
    const modifiedIds = new Set(files.filter(f => f.modified).map(f => f.id));
    const next = openTabs.filter(x => modifiedIds.has(x) || pinnedTabs.includes(x));
    if (next.length === 0 && files[0]) {
      setOpenTabs([files[0].id]);
      setActiveId(files[0].id);
    } else {
      setOpenTabs(next);
      if (!next.includes(activeId) && next[0]) setActiveId(next[0]);
    }
  };

  const closeAllTabs = () => {
    const next = openTabs.filter(x => pinnedTabs.includes(x));
    setOpenTabs(next);
    if (next.length === 0) {
      setActiveId('');
    } else if (!next.includes(activeId) && next[0]) {
      setActiveId(next[0]);
    }
  };

  const sortedTabs = useMemo(() => {
    const pinned = openTabs.filter(id => pinnedTabs.includes(id));
    const unpinned = openTabs.filter(id => !pinnedTabs.includes(id));
    return [...pinned, ...unpinned];
  }, [openTabs, pinnedTabs]);

  const renderFileIcon = (fileName: string, size = 13) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return <FileCode2 size={size} style={{ color: '#3178c6', flexShrink: 0 }} />;
      case 'js':
      case 'jsx':
        return <FileCode2 size={size} style={{ color: '#eab308', flexShrink: 0 }} />;
      case 'html':
        return <Code2 size={size} style={{ color: '#ea580c', flexShrink: 0 }} />;
      case 'css':
        return <Sparkles size={size} style={{ color: '#06b6d4', flexShrink: 0 }} />;
      case 'json':
        return <Package size={size} style={{ color: '#eab308', flexShrink: 0 }} />;
      case 'py':
        return <Terminal size={size} style={{ color: '#10b981', flexShrink: 0 }} />;
      case 'md':
        return <FileText size={size} style={{ color: '#818cf8', flexShrink: 0 }} />;
      default:
        return <FileText size={size} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />;
    }
  };

  useEffect(() => {
    if (activeId && tabItemRefs.current[activeId]) {
      try {
        tabItemRefs.current[activeId]?.scrollIntoView({
          behavior: 'smooth',
          inline: 'nearest',
          block: 'nearest'
        });
      } catch {
        // fallback
      }
    }
  }, [activeId]);

  const openCreateFileDialog = () => {
    setNewFileInputValue('');
    setShowNewFileModal(true);
  };

  const handleCreateFileSubmit = (customName?: string) => {
    let rawName = (customName || newFileInputValue).trim();
    if (!rawName) {
      rawName = `untitled-${files.length + 1}.js`;
    }

    // Auto-detect extension if none provided
    if (!rawName.includes('.')) {
      rawName = `${rawName}.js`;
    }

    const lang = languageFor(rawName);
    const baseName = rawName.split('/').pop() || rawName;
    const nameWithoutExt = baseName.replace(/\.[^/.]+$/, '');
    let initialContent = `// ${rawName}\n`;

    if (lang === 'python') {
      initialContent = `# ${rawName}\n\ndef main():\n    print("Hello from ${rawName}!")\n\nif __name__ == "__main__":\n    main()\n`;
    } else if (lang === 'html') {
      initialContent = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${baseName}</title>\n</head>\n<body>\n  <h1>${baseName}</h1>\n  <p>Created in CodeForge Mobile</p>\n</body>\n</html>\n`;
    } else if (lang === 'css') {
      initialContent = `/* ${rawName} */\nbody {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n`;
    } else if (lang === 'cpp') {
      initialContent = `// ${rawName}\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello from ${rawName}!" << endl;\n    return 0;\n}\n`;
    } else if (lang === 'c') {
      initialContent = `// ${rawName}\n#include <stdio.h>\n\nint main() {\n    printf("Hello from ${rawName}!\\n");\n    return 0;\n}\n`;
    } else if (lang === 'java') {
      const className = nameWithoutExt.charAt(0).toUpperCase() + nameWithoutExt.slice(1).replace(/[^a-zA-Z0-9]/g, '');
      initialContent = `// ${rawName}\npublic class ${className || 'Main'} {\n    public static void main(String[] args) {\n        System.out.println("Hello from ${rawName}!");\n    }\n}\n`;
    } else if (lang === 'json') {
      initialContent = `{\n  "name": "${baseName}"\n}\n`;
    } else if (lang === 'markdown') {
      initialContent = `# ${baseName}\n\nWelcome to your new document.\n`;
    } else if (lang === 'typescript') {
      initialContent = `// ${rawName}\nexport const message: string = "Hello from TypeScript!";\nconsole.log(message);\n`;
    }

    const file: FileItem = {
      id: crypto.randomUUID(),
      name: baseName,
      path: rawName,
      language: lang,
      content: initialContent
    };

    setFiles(prev => [...prev, file]);
    setShowNewFileModal(false);
    setNewFileInputValue('');
    openFile(file.id);
    setTerminal(prev => `${prev}\n✓ Created ${file.path} (${lang})`);
  };

  const deleteFile = (id: string) => {
    const target = files.find(f => f.id === id);
    if (!target || files.length <= 1) return;
    setFiles(prev => prev.filter(f => f.id !== id));
    closeTab(id);
    setTerminal(prev => `${prev}\n✓ Deleted ${target.path}`);
  };

  const renameFile = (id: string, value: string) => {
    const name = value.trim();
    if (!name) return;
    setFiles(prev => prev.map(f => (f.id === id ? { ...f, name, path: name, language: languageFor(name), modified: true } : f)));
    setRenameId(null);
  };

  // Quick Symbol Insertion
  const handleInsertSymbol = (item: { label: string; insert: string; wrap?: boolean }) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!model || !selection) return;

    const selectedText = model.getValueInRange(selection);

    if (item.insert === 'Tab') {
      editor.executeEdits('quick-symbol', [{ range: selection, text: '  ', forceMoveMarkers: true }]);
    } else if (item.wrap && item.insert.length === 2) {
      const left = item.insert[0];
      const right = item.insert[1];
      if (selectedText) {
        editor.executeEdits('quick-symbol', [{ range: selection, text: `${left}${selectedText}${right}`, forceMoveMarkers: true }]);
      } else {
        editor.executeEdits('quick-symbol', [{ range: selection, text: `${left}${right}`, forceMoveMarkers: true }]);
        const pos = editor.getPosition();
        if (pos) {
          editor.setPosition({ lineNumber: pos.lineNumber, column: pos.column - 1 });
        }
      }
    } else {
      editor.executeEdits('quick-symbol', [{ range: selection, text: item.insert, forceMoveMarkers: true }]);
    }
    editor.focus();
  };

  // Touch Cursor Navigation
  const handleCursorMove = (direction: 'left' | 'right' | 'up' | 'down' | 'home' | 'end') => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const commandMap: Record<string, string> = {
      left: 'cursorLeft',
      right: 'cursorRight',
      up: 'cursorUp',
      down: 'cursorDown',
      home: 'cursorHome',
      end: 'cursorEnd',
    };
    const cmd = commandMap[direction];
    if (cmd) {
      editor.trigger('touch-cursor', cmd, null);
      const pos = editor.getPosition();
      if (pos) {
        editor.revealPositionInCenterIfOutsideViewport(pos);
      }
    }
  };

  // VS Code Quick Editing Actions
  const handleTabAction = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    editor.trigger('touch-action', 'tab', null);
  };

  const handleOutdentAction = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    editor.trigger('touch-action', 'outdent', null);
  };

  const handleCommentToggle = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const action = editor.getAction('editor.action.commentLine');
    if (action) {
      action.run();
    }
  };

  const handleDuplicateLine = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const action = editor.getAction('editor.action.copyLinesDownAction');
    if (action) {
      action.run();
    }
  };

  const handleSelectExpand = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const action = editor.getAction('editor.action.smartSelect.expand') || editor.getAction('expandLineSelection');
    if (action) {
      action.run();
    } else {
      editor.trigger('touch-action', 'expandLineSelection', null);
    }
  };

  const handleUndo = () => {
    editorRef.current?.trigger('quick-symbol', 'undo', null);
    editorRef.current?.focus();
  };

  const handleRedo = () => {
    editorRef.current?.trigger('quick-symbol', 'redo', null);
    editorRef.current?.focus();
  };

  const applyIndentation = (tabSize: number, insertSpaces: boolean) => {
    const next = { tabSize, insertSpaces };
    setIndentSettings(next);
    safeSet('codeforge-indent', JSON.stringify(next));
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        model.updateOptions({ tabSize, insertSpaces });
      }
    }
    setShowIndentPicker(false);
    setTerminal(prev => `${prev}\n✓ Indentation set to: ${insertSpaces ? `Spaces: ${tabSize}` : `Tab Size: ${tabSize}`}`);
  };

  const toggleLineEnding = () => {
    const next = lineEnding === 'LF' ? 'CRLF' : 'LF';
    setLineEnding(next);
    if (editorRef.current && (window as any).monaco) {
      const model = editorRef.current.getModel();
      if (model) {
        const eol = next === 'LF'
          ? (window as any).monaco.editor.EndOfLineSequence.LF
          : (window as any).monaco.editor.EndOfLineSequence.CRLF;
        model.setEOL(eol);
      }
    }
    setTerminal(prev => `${prev}\n✓ Line endings set to: ${next}`);
  };

  const handleSetLanguageMode = (langId: string) => {
    if (!active) return;
    setFiles(prev => prev.map(f => (f.id === active.id ? { ...f, language: langId, modified: true } : f)));
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, langId);
      }
    }
    setShowLanguagePicker(false);
    setTerminal(prev => `${prev}\n✓ Language mode changed to: ${langId}`);
  };

  const handleGoToLineSubmit = () => {
    const line = parseInt(goToLineInput, 10);
    if (!isNaN(line) && line > 0 && editorRef.current) {
      editorRef.current.revealLineInCenter(line);
      editorRef.current.setPosition({ lineNumber: line, column: 1 });
      editorRef.current.focus();
    }
    setShowGoToLine(false);
    setGoToLineInput('');
  };

  const handleFormatDocument = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      const action = editorRef.current.getAction('editor.action.formatDocument');
      if (action) {
        action.run();
        setTerminal(prev => `${prev}\n✓ Document formatted`);
      }
    }
    setShowIndentPicker(false);
  };

  // Voice to Code Dictation
  const toggleVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice dictation is supported in modern browsers like Google Chrome.');
      return;
    }
    if (isRecordingVoice) {
      (window as any).currentRecognition?.stop();
      setIsRecordingVoice(false);
      return;
    }
    const recognition = new SpeechRecognition();
    (window as any).currentRecognition = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsRecordingVoice(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleInsertSymbol({ label: 'voice', insert: transcript });
      setTerminal(prev => `${prev}\n🎤 [Voice Transcribed]: "${transcript}"`);
    };
    recognition.onerror = (e: any) => {
      setIsRecordingVoice(false);
      setTerminal(prev => `${prev}\n🎤 Voice recognition error: ${e.error}`);
    };
    recognition.onend = () => setIsRecordingVoice(false);
    recognition.start();
  };

  // Pyodide Python Runner Engine
  const loadPyodideRuntime = async () => {
    if ((window as any).pyodideInstance) return (window as any).pyodideInstance;
    if ((window as any).pyodideLoadingPromise) return (window as any).pyodideLoadingPromise;

    (window as any).pyodideLoadingPromise = (async () => {
      if (!(window as any).loadPyodide) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Could not download the Python runtime. Check your internet connection and try again.'));
          document.head.appendChild(script);
        });
      }
      const pyodide = await (window as any).loadPyodide({
        stdout: (text: string) => {
          setTerminal(prev => `${prev}\n${text}`);
        },
        stderr: (text: string) => {
          setTerminal(prev => `${prev}\n🔴 [PyError] ${text}`);
        },
        stdin: () => {
          const val = window.prompt('Python input():');
          if (val !== null) {
            setTerminal(prev => `${prev}\n⌨️ Input: ${val}`);
            return val + '\n';
          }
          return '\n';
        }
      });

      try {
        pyodide.setStdin({
          error: false,
          stdin: () => {
            const val = window.prompt('Python input():');
            if (val !== null) {
              setTerminal(prev => `${prev}\n⌨️ Input: ${val}`);
              return val + '\n';
            }
            return '\n';
          }
        });
      } catch {}

      (window as any).pyodideInstance = pyodide;
      return pyodide;
    })();

    // a failed download must not be cached, otherwise Python stays broken until a page reload
    (window as any).pyodideLoadingPromise.catch(() => { (window as any).pyodideLoadingPromise = null; });
    return (window as any).pyodideLoadingPromise;
  };

  // Pre-warm Python Pyodide engine in the background
  useEffect(() => {
    const timer = setTimeout(() => {
      loadPyodideRuntime().catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const runPythonCode = async (code: string, fileName?: string) => {
    if (pyRunning) return;
    setPyRunning(true);
    setPanel(true);
    const targetName = fileName || active?.name || 'script.py';
    const isCached = !!(window as any).pyodideInstance;
    if (!isCached) {
      setTerminal(prev => `${prev}\n$ python ${targetName}\n⏳ Downloading Python 3.12 runtime (~6MB WebAssembly, 1st run only)...`);
    } else {
      setTerminal(prev => `${prev}\n$ python ${targetName}`);
    }
    try {
      const pyodide = await loadPyodideRuntime();

      // Ensure live stdout/stderr/stdin handlers are linked
      pyodide.setStdout({
        batched: (text: string) => {
          if (text.includes('__CODEFORGE_PLOT__:')) {
            const parts = text.split('__CODEFORGE_PLOT__:');
            const b64 = parts[1]?.trim();
            if (b64) {
              setPlotImage(`data:image/png;base64,${b64}`);
              setPanelTab('plot');
              setTerminal(prev => `${prev}\n📈 [Plot Generated]: Output sent to PLOTS tab.`);
              return;
            }
          }
          setTerminal(prev => `${prev}\n${text}`);
        }
      });
      pyodide.setStderr({
        batched: (text: string) => {
          setTerminal(prev => `${prev}\n🔴 ${text}`);
        }
      });
      pyodide.setStdin({
        error: false,
        stdin: () => {
          const val = window.prompt(`Python input() for ${targetName}:`);
          if (val !== null) {
            setTerminal(prev => `${prev}\n⌨️ Input: ${val}`);
            return val + '\n';
          }
          return '\n';
        }
      });

      // Synchronize workspace files into Pyodide's virtual filesystem
      try {
        files.forEach(f => {
          try {
            pyodide.FS.writeFile(f.name, f.content);
            if (f.path && f.path !== f.name) {
              const parts = f.path.split('/');
              let currentDir = '';
              for (let i = 0; i < parts.length - 1; i++) {
                currentDir = currentDir ? `${currentDir}/${parts[i]}` : parts[i];
                try {
                  pyodide.FS.mkdir(currentDir);
                } catch {}
              }
              pyodide.FS.writeFile(f.path, f.content);
            }
          } catch {}
        });
      } catch {}

      // Auto-load matplotlib if code imports it
      if (code.includes('matplotlib') || code.includes('plt.')) {
        try {
          if (!pyodide.loadedPackages?.matplotlib) {
            setTerminal(prev => `${prev}\n⏳ Loading matplotlib graphics package...`);
            await pyodide.loadPackage('matplotlib');
          }
        } catch {}
      }

      const result = await pyodide.runPythonAsync(code);

      // Check if a plot was created in matplotlib and capture it
      if (code.includes('matplotlib') || code.includes('plt.')) {
        try {
          await pyodide.runPythonAsync(`
import sys
if 'matplotlib.pyplot' in sys.modules:
    import matplotlib.pyplot as _plt
    import io, base64
    if _plt.get_fignums():
        _buf = io.BytesIO()
        _plt.savefig(_buf, format='png', bbox_inches='tight', facecolor='#0b111a', edgecolor='none')
        _buf.seek(0)
        _img_b64 = base64.b64encode(_buf.read()).decode('utf-8')
        _plt.close('all')
        print('__CODEFORGE_PLOT__:' + _img_b64)
`);
        } catch {}
      }

      if (result !== undefined && result !== null) {
        setTerminal(prev => `${prev}\n=> ${String(result)}`);
      }
      setTerminal(prev => `${prev}\n✓ Python process exited with code 0.`);
    } catch (err: any) {
      setTerminal(prev => `${prev}\n🔴 Traceback error: ${err.message || String(err)}`);
    } finally {
      setPyRunning(false);
    }
  };

  const runJavaScriptCode = async (code: string, fileName?: string): Promise<number> => {
    setPanel(true);
    const targetName = fileName || active?.name || 'script.js';
    const isTs = /\.tsx?$/i.test(targetName);
    setTerminal(prev => `${prev}\n$ ${isTs ? 'ts-node' : 'node'} ${targetName}\n⏳ Executing ${isTs ? 'TypeScript' : 'JavaScript'}...`);

    const fmt = (a: any): string => {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.stack || a.message;
      if (typeof a === 'undefined') return 'undefined';
      if (typeof a === 'function') return String(a);
      if (typeof a === 'object' && a !== null) {
        try { return JSON.stringify(a, null, 2); } catch { return String(a); }
      }
      return String(a);
    };
    const line = (prefix: string) => (...args: any[]) => setTerminal(prev => `${prev}\n${prefix}${args.map(fmt).join(' ')}`);
    const customConsole = {
      log: line(''),
      debug: line(''),
      warn: line('⚠️ '),
      error: line('🔴 '),
      info: line('ℹ️ '),
      table: (data: any) => setTerminal(prev => `${prev}\n${fmt(data)}`)
    };

    try {
      let source = code;
      if (isTs) source = tsToJs(source);
      else source = jsModulesToCjs(source);
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const exportsObj: Record<string, unknown> = {};
      const moduleObj = { exports: exportsObj };
      const requireStub = (name: string) => {
        throw new Error(`require('${name}') is not available in the browser runner`);
      };
      const runner = new AsyncFunction('console', 'prompt', 'alert', 'exports', 'module', 'require', source);
      await runner(customConsole, window.prompt.bind(window), window.alert.bind(window), exportsObj, moduleObj, requireStub);
      setTerminal(prev => `${prev}\n✓ Process completed.`);
      return 0;
    } catch (err: any) {
      setTerminal(prev => `${prev}\n🔴 ${err && err.name && err.name !== 'Error' ? err.name + ': ' : ''}${err && err.message ? err.message : String(err)}\n🔴 Process exited with code 1`);
      return 1;
    }
  };

  const termPrint = (text: string) => setTerminal(prev => `${prev}\n${text}`);

  // Compile & run C / C++ / Java on a real remote compiler (needs internet)
  const runNativeProgram = async (
    lang: NativeLang,
    source: string,
    opts: { compileOnly?: boolean; stdin?: string; hasStdin?: boolean }
  ): Promise<number> => {
    let stdin = opts.stdin ?? '';
    if (!opts.compileOnly && !opts.hasStdin && needsInput(lang, source)) {
      const typed = window.prompt('Program input (stdin). Type \\n between lines, or leave empty for none:', '');
      if (typed === null) {
        termPrint('✗ Cancelled');
        return 1;
      }
      stdin = typed.replace(/\\n/g, '\n') + (typed ? '\n' : '');
      if (typed) termPrint(`⌨️ Input: ${typed}`);
    }
    termPrint(`⏳ ${opts.compileOnly ? 'Compiling' : 'Compiling and running'} on a remote compiler (needs internet)...`);
    try {
      const r = await runNative({ lang, source, stdin });
      if (r.note) termPrint(`ℹ️ ${r.note}`);
      if (r.compileError) {
        termPrint(`🔴 Compilation failed:\n${r.compileError.trimEnd()}`);
        return 1;
      }
      if (opts.compileOnly) {
        termPrint('✓ Compiled successfully');
        return 0;
      }
      if (r.stdout) termPrint(r.stdout.replace(/\n$/, ''));
      if (r.stderr) termPrint(`🔴 ${r.stderr.trimEnd()}`);
      const code = r.exitCode ?? (r.ok ? 0 : 1);
      termPrint(`${code === 0 ? '✓' : '🔴'} Process exited with code ${code} (${r.provider}${r.timeSec !== undefined ? `, ${r.timeSec}s` : ''})`);
      return code;
    } catch (e: any) {
      termPrint(`🔴 ${e && e.message ? e.message : String(e)}`);
      return 1;
    }
  };

  const handleRunCurrentCode = () => {
    if (!active) return;
    const lang = active.language || languageFor(active.name);
    const name = active.name.toLowerCase();
    const liveCode = readEditorValue(active.content);

    // Immediately sync and auto-save
    setFiles(prev => prev.map(f => (f.id === active.id ? { ...f, content: liveCode, modified: false } : f)));

    if (lang === 'python' || name.endsWith('.py')) {
      runPythonCode(liveCode, active.name);
    } else if (lang === 'javascript' || lang === 'typescript' || name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.mjs')) {
      runJavaScriptCode(liveCode, active.name);
    } else if (lang === 'html' || name.endsWith('.html') || name.endsWith('.htm')) {
      setView('preview');
      setPreviewKey(k => k + 1);
      setTerminal(prev => `${prev}\n✓ Live Preview updated for ${active.name}`);
    } else if (lang === 'css' || name.endsWith('.css')) {
      setView('preview');
      setPreviewKey(k => k + 1);
      setTerminal(prev => `${prev}\n✓ Stylesheet applied to Live Preview`);
    } else if (lang === 'c' || lang === 'cpp' || name.endsWith('.c') || name.endsWith('.cpp') || name.endsWith('.cc')) {
      const nativeLang: NativeLang = lang === 'c' || name.endsWith('.c') ? 'c' : 'cpp';
      const base = active.name.replace(/\.[^.]+$/, '');
      setPanel(true);
      setPanelTab('terminal');
      termPrint(`$ ${nativeLang === 'c' ? 'gcc' : 'g++'} ${active.name} -o ${base} && ./${base}`);
      runNativeProgram(nativeLang, liveCode, {});
    } else if (lang === 'java' || name.endsWith('.java')) {
      const base = active.name.replace(/\.java$/i, '');
      setPanel(true);
      setPanelTab('terminal');
      termPrint(`$ javac ${active.name} && java ${base}`);
      runNativeProgram('java', liveCode, {});
    } else if (lang === 'json' || name.endsWith('.json')) {
      setPanel(true);
      try {
        const parsed = JSON.parse(liveCode);
        setTerminal(prev => `${prev}\n$ validate ${active.name}\n✓ Valid JSON (${parsed !== null && typeof parsed === 'object' ? Object.keys(parsed).length : 0} keys)\n${JSON.stringify(parsed, null, 2)}`);
      } catch (e: any) {
        setTerminal(prev => `${prev}\n$ validate ${active.name}\n🔴 Invalid JSON: ${e.message}`);
      }
    } else {
      setView('preview');
      setPreviewKey(k => k + 1);
    }
  };

  // Switch to landscape mode helper
  const requestLandscapeOrientation = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      if ('orientation' in screen && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock('landscape');
      }
    } catch (err) {
      alert('Please rotate your device to landscape mode for the complete VS Code experience!');
    }
  };

  const handleHistoryUp = () => {
    if (cmdHistory.length === 0) return;
    const nextIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
    setHistoryIdx(nextIdx);
    setCommand(cmdHistory[nextIdx]);
  };

  const handleHistoryDown = () => {
    if (historyIdx <= 0) {
      setHistoryIdx(-1);
      setCommand('');
      return;
    }
    const nextIdx = historyIdx - 1;
    setHistoryIdx(nextIdx);
    setCommand(cmdHistory[nextIdx]);
  };

  const handleInsertTerminalSymbol = (sym: string) => {
    setCommand(prev => prev + sym);
  };

  useEffect(() => {
    if (panelTab === 'terminal' || panelTab === 'logs') {
      try {
        if (terminalOutputRef.current) {
          terminalOutputRef.current.scrollTop = terminalOutputRef.current.scrollHeight;
        }
      } catch {
        // ignore
      }
    }
  }, [terminal, panelTab]);

  // ---- Terminal: a real shell over the project files (see utils/shell.ts)
  const shellSessionRef = useRef<ShellSession>({ cwd: '', binaries: {}, lastCode: 0 });
  const [shellCwd, setShellCwd] = useState('');
  const [shellBusy, setShellBusy] = useState(false);

  const runCommand = async (cmd: string) => {
    const clean = cmd.trim();
    if (!clean || shellBusy) return;
    setCmdHistory(prev => [clean, ...prev.filter(x => x !== clean)]);
    setHistoryIdx(-1);
    setCommand('');
    setPanel(true);
    setPanelTab('terminal');
    setShellBusy(true);
    termPrint(`${shellSessionRef.current.cwd ? '~/' + shellSessionRef.current.cwd : '~'} $ ${clean}`);

    const startFiles = files;
    const inputMap = new Map<string, string>(startFiles.map(f => [f.path, f.content] as [string, string]));
    const snapshots: Record<string, string> = {};
    startFiles.forEach(f => {
      if (savedSnapshots[f.id] !== undefined) snapshots[f.path] = savedSnapshots[f.id];
    });
    const deferred: (() => void)[] = [];
    let openPath: string | null = null;

    const host: ShellHost = {
      print: termPrint,
      run: async (a: ShellAction) => {
        switch (a.type) {
          case 'clear':
            setTerminal('CodeForge Terminal');
            return 0;
          case 'preview':
            deferred.push(() => {
              setView('preview');
              setPreviewKey(k => k + 1);
            });
            return 0;
          case 'open':
            openPath = a.path;
            return 0;
          case 'run-python':
            await runPythonCode(a.content, a.name);
            return 0;
          case 'run-node':
            return runJavaScriptCode(a.content, a.name);
          case 'native-compile':
            return runNativeProgram(a.lang, a.content, { compileOnly: true });
          case 'native-run':
            return runNativeProgram(a.lang, a.content, { stdin: a.stdin, hasStdin: a.hasStdin });
          case 'git-commit':
            deferred.push(() => commitWithMessage(a.message));
            return 0;
          case 'git-branch':
            setBranch(a.name);
            termPrint(`✓ Switched to branch '${a.name}' (branch names are labels in this workspace; history is shared)`);
            return 0;
          default:
            return 1;
        }
      }
    };

    try {
      const result = await runShell(
        clean,
        {
          files: inputMap,
          session: shellSessionRef.current,
          git: { branch, modified: startFiles.filter(f => f.modified).map(f => f.path), log: gitHistory, snapshots },
          history: cmdHistory
        },
        host
      );
      setShellCwd(shellSessionRef.current.cwd);

      // Apply only what the command changed, on top of the latest state
      const baseName = (p: string) => p.slice(p.lastIndexOf('/') + 1);
      const moved = new Map(result.moves);
      const removedPaths = [...inputMap.keys()].filter(p => !result.files.has(p) && !moved.has(p));
      const removedIds = startFiles.filter(f => removedPaths.includes(f.path)).map(f => f.id);
      const created: FileItem[] = [];
      for (const [path, content] of result.files) {
        const isMoveTarget = [...moved.values()].includes(path);
        if (!inputMap.has(path) && !isMoveTarget) {
          created.push({ id: crypto.randomUUID(), name: baseName(path), path, language: languageFor(baseName(path)), content, modified: true });
        }
      }
      const changed = new Map<string, string>();
      for (const [path, content] of result.files) {
        if (inputMap.has(path) && inputMap.get(path) !== content) changed.set(path, content);
      }
      if (result.moves.length || removedPaths.length || created.length || changed.size) {
        setFiles(prev => {
          let next = prev.slice();
          for (const [from, to] of result.moves) {
            next = next.filter(f => f.path !== to);
            next = next.map(f => (f.path === from ? { ...f, path: to, name: baseName(to), language: languageFor(baseName(to)) } : f));
          }
          next = next.filter(f => !removedPaths.includes(f.path));
          next = next.map(f => (changed.has(f.path) ? { ...f, content: changed.get(f.path) as string, modified: true } : f));
          return [...next, ...created];
        });
        removedIds.forEach(id => closeTab(id));
      }
      const target = openPath
        ? created.find(f => f.path === openPath) || startFiles.find(f => f.path === (moved.get(openPath as string) ?? openPath))
        : null;
      if (target) openFile(target.id);
      deferred.forEach(fn => fn());
    } catch (e: any) {
      termPrint(`🔴 terminal error: ${e && e.message ? e.message : String(e)}`);
    } finally {
      setShellBusy(false);
    }
  };

  const discardFileChanges = (fileId: string) => {
    const original = savedSnapshots[fileId];
    if (original !== undefined) {
      setFiles(prev => prev.map(f => (f.id === fileId ? { ...f, content: original, modified: false } : f)));
      setTerminal(prev => `${prev}\n✓ Discarded uncommitted changes for file`);
    } else {
      setFiles(prev => prev.map(f => (f.id === fileId ? { ...f, modified: false } : f)));
    }
  };

  const discardAllChanges = () => {
    setFiles(prev => prev.map(f => ({ ...f, content: savedSnapshots[f.id] ?? f.content, modified: false })));
    setTerminal(prev => `${prev}\n✓ Discarded all uncommitted changes in workspace`);
  };

  const commitWithMessage = (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message) return;
    setGitHistory(prev => [message, ...prev]);
    setSavedSnapshots(prev => {
      const next = { ...prev };
      files.forEach(f => { next[f.id] = f.content; });
      return next;
    });
    setFiles(prev => prev.map(f => ({ ...f, modified: false })));
    setTerminal(prev => `${prev}\n✓ [${branch}] committed: ${message}`);
  };

  const commit = () => {
    commitWithMessage(gitMessage);
    setGitMessage('');
  };

  const checkout = (next: string) => {
    setBranch(next);
    setTerminal(prev => `${prev}\n✓ Switched to branch ${next}`);
  };

  // Real GitHub Cloud Sync (PAT)
  const pushFileToGitHub = async () => {
    if (!ghToken.trim()) {
      setGhStatusMsg('⚠️ Please enter your GitHub Personal Access Token.');
      return;
    }
    const [owner, repo] = ghRepoInput.split('/');
    if (!owner || !repo) {
      setGhStatusMsg('⚠️ Please specify repository in format owner/repo (e.g. username/repo).');
      return;
    }
    setGhLoading(true);
    setGhStatusMsg('⏳ Pushing files directly to GitHub...');
    try {
      let sha: string | undefined;
      const encodedOwner = encodeURIComponent(owner.trim());
      const encodedRepo = encodeURIComponent(repo.trim());
      const encodedPath = active.path.split('/').map(encodeURIComponent).join('/');
      const encodedBranch = encodeURIComponent(branch.trim());

      // Check existing SHA
      const getRes = await fetch(`https://api.github.com/repos/${encodedOwner}/${encodedRepo}/contents/${encodedPath}?ref=${encodedBranch}`, {
        headers: {
          Authorization: `token ${ghToken.trim()}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha;
      }
      // Put content
      const putRes = await fetch(`https://api.github.com/repos/${encodedOwner}/${encodedRepo}/contents/${encodedPath}`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${ghToken.trim()}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: gitMessage || `Update ${active.path} via CodeForge Mobile`,
          content: btoa(unescape(encodeURIComponent(active.content))),
          branch: branch.trim(),
          sha
        })
      });
      if (!putRes.ok) {
        const err = await putRes.json();
        throw new Error(err.message || 'GitHub API rejected commit');
      }
      setGhStatusMsg(`✅ Successfully pushed ${active.path} to GitHub (${owner}/${repo})!`);
      setTerminal(prev => `${prev}\n✓ Pushed ${active.path} to GitHub (${owner}/${repo}) on branch ${branch}`);
    } catch (err: any) {
      setGhStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setGhLoading(false);
    }
  };

  // Push entire workspace (sequential content API – good for small projects)
  const pushAllToGitHub = async () => {
    if (!ghToken.trim()) {
      setGhStatusMsg('⚠️ Please enter your GitHub Personal Access Token.');
      return;
    }
    const [owner, repo] = ghRepoInput.split('/');
    if (!owner || !repo) {
      setGhStatusMsg('⚠️ Please specify repository in format owner/repo.');
      return;
    }
    setGhLoading(true);
    setGhStatusMsg(`⏳ Pushing all ${files.length} files to GitHub...`);
    const encodedOwner = encodeURIComponent(owner.trim());
    const encodedRepo = encodeURIComponent(repo.trim());
    let success = 0;
    let failed = 0;
    try {
      for (const file of files) {
        try {
          let sha: string | undefined;
          const encodedPath = file.path.split('/').map(encodeURIComponent).join('/');
          const getRes = await fetch(`https://api.github.com/repos/${encodedOwner}/${encodedRepo}/contents/${encodedPath}?ref=${encodeURIComponent(branch.trim())}`, {
            headers: { Authorization: `token ${ghToken.trim()}`, Accept: 'application/vnd.github.v3+json' }
          });
          if (getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
          }
          const putRes = await fetch(`https://api.github.com/repos/${encodedOwner}/${encodedRepo}/contents/${encodedPath}`, {
            method: 'PUT',
            headers: {
              Authorization: `token ${ghToken.trim()}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: gitMessage || `Update ${file.path} via CodeForge Mobile`,
              content: btoa(unescape(encodeURIComponent(file.content))),
              branch: branch.trim(),
              sha
            })
          });
          if (putRes.ok) success++;
          else failed++;
        } catch {
          failed++;
        }
      }
      setGhStatusMsg(`✅ Pushed ${success}/${files.length} files${failed ? ` (${failed} failed)` : ''} to ${owner}/${repo}`);
      setTerminal(prev => `${prev}\n✓ GitHub push-all: ${success} ok, ${failed} failed`);
      setFiles(prev => prev.map(f => ({ ...f, modified: false })));
    } catch (err: any) {
      setGhStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setGhLoading(false);
    }
  };

  // Pull files from GitHub repository (flat listing of root + common files)
  const pullFromGitHub = async () => {
    if (!ghToken.trim()) {
      setGhStatusMsg('⚠️ Please enter your GitHub Personal Access Token.');
      return;
    }
    const [owner, repo] = ghRepoInput.split('/');
    if (!owner || !repo) {
      setGhStatusMsg('⚠️ Please specify repository in format owner/repo.');
      return;
    }
    setGhLoading(true);
    setGhStatusMsg('⏳ Pulling repository contents from GitHub...');
    try {
      const encodedOwner = encodeURIComponent(owner.trim());
      const encodedRepo = encodeURIComponent(repo.trim());
      const res = await fetch(`https://api.github.com/repos/${encodedOwner}/${encodedRepo}/git/trees/${encodeURIComponent(branch.trim())}?recursive=1`, {
        headers: { Authorization: `token ${ghToken.trim()}`, Accept: 'application/vnd.github.v3+json' }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to list tree');
      }
      const tree = await res.json();
      const blobs = (tree.tree || []).filter((t: any) => t.type === 'blob' && t.path && !t.path.startsWith('.') && t.size < 500000);
      if (!blobs.length) throw new Error('No files found in repository');
      const normalized: FileItem[] = [];
      // Limit to first 40 files to avoid rate limits / memory
      for (const blob of blobs.slice(0, 40)) {
        const contentRes = await fetch(`https://api.github.com/repos/${encodedOwner}/${encodedRepo}/contents/${blob.path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch.trim())}`, {
          headers: { Authorization: `token ${ghToken.trim()}`, Accept: 'application/vnd.github.v3+json' }
        });
        if (!contentRes.ok) continue;
        const data = await contentRes.json();
        if (data.encoding === 'base64' && data.content) {
          const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
          const name = blob.path.split('/').pop() || blob.path;
          normalized.push({
            id: crypto.randomUUID(),
            name,
            path: blob.path,
            language: languageFor(name),
            content
          });
        }
      }
      if (!normalized.length) throw new Error('Could not decode any files');
      setFiles(normalized);
      setOpenTabs([normalized[0].id]);
      setActiveId(normalized[0].id);
      setGhStatusMsg(`✅ Pulled ${normalized.length} files from ${owner}/${repo}`);
      setTerminal(prev => `${prev}\n✓ GitHub pull: loaded ${normalized.length} files`);
    } catch (err: any) {
      setGhStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setGhLoading(false);
    }
  };

  // Starter Template Apply
  const applyTemplate = (template: ProjectTemplate) => {
    setFiles(template.files);
    setActiveId(template.files[0].id);
    setOpenTabs([template.files[0].id]);
    setView('editor');
    setTerminal(prev => `${prev}\n✓ Loaded starter template: ${template.name}`);
  };

  // ZIP Project Export
  const exportProjectZip = async () => {
    try {
      const zip = new JSZip();
      files.forEach(f => zip.file(f.path, f.content));
      const blob = await zip.generateAsync({ type: 'blob' });
      await saveFile(blob, 'codeforge-project.zip', 'application/zip');
      setTerminal(prev => `${prev}\n✓ Exported ZIP archive with ${files.length} files`);
    } catch (err) {
      setTerminal(prev => `${prev}\n✗ Failed to create ZIP archive`);
    }
  };

  const processImportedFiles = (items: FileItem[], sourceName?: string) => {
    if (!items.length) {
      setTerminal(prev => `${prev}\n⚠ No readable files found in import.`);
      return;
    }
    setFiles(prev => {
      const incomingPaths = new Set(items.map(f => f.path));
      const kept = prev.filter(f => !incomingPaths.has(f.path));
      return [...kept, ...items];
    });
    setOpenTabs(prev => Array.from(new Set([...prev, items[0].id])));
    setActiveId(items[0].id);
    setView('editor');
    setShowImportModal(false);
    setTerminal(prev => `${prev}\n✓ Successfully imported ${items.length} file(s)${sourceName ? ` from ${sourceName}` : ''}`);
  };

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || !fileList.length) return;

    setTerminal(prev => `${prev}\n⏳ Reading folder contents...`);
    const newItems: FileItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const relPath = file.webkitRelativePath || file.name;

      if (
        relPath.includes('/.git/') ||
        relPath.includes('/node_modules/') ||
        relPath.includes('/.DS_Store') ||
        relPath.includes('__MACOSX') ||
        relPath.endsWith('.DS_Store')
      ) {
        continue;
      }

      try {
        const text = await file.text();
        const fileName = file.name || relPath.split('/').pop() || relPath;
        newItems.push({
          id: crypto.randomUUID(),
          name: fileName,
          path: relPath,
          language: languageFor(fileName),
          content: text
        });
      } catch (e) {
        console.warn('Could not read file:', relPath, e);
      }
    }

    const folderName = fileList[0]?.webkitRelativePath?.split('/')[0] || 'folder';
    processImportedFiles(newItems, `folder "${folderName}"`);
    event.target.value = '';
  };

  const handleMultiFilesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || !fileList.length) return;

    setTerminal(prev => `${prev}\n⏳ Reading selected files...`);
    const newItems: FileItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip')) {
        try {
          const zip = await JSZip.loadAsync(file);
          const entries = Object.keys(zip.files).filter(p => !zip.files[p].dir && !p.startsWith('__MACOSX') && !p.includes('/.') && !p.endsWith('.DS_Store'));
          for (const path of entries) {
            const content = await zip.files[path].async('string');
            const name = path.split('/').pop() || path;
            newItems.push({
              id: crypto.randomUUID(),
              name,
              path,
              language: languageFor(name),
              content
            });
          }
        } catch (err: any) {
          setTerminal(prev => `${prev}\n✗ Failed to parse ${file.name}: ${err.message}`);
        }
        continue;
      }

      if (file.name.toLowerCase().endsWith('.json') || file.name.toLowerCase().endsWith('.codeforge')) {
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed.files) && parsed.files.length) {
            parsed.files.forEach((f: any, idx: number) => {
              newItems.push({
                id: f.id || crypto.randomUUID(),
                name: f.name || `file-${idx + 1}.txt`,
                path: f.path || f.name || `file-${idx + 1}.txt`,
                language: f.language || languageFor(f.name || ''),
                content: f.content || ''
              });
            });
            continue;
          }
        } catch {}
      }

      try {
        const text = await file.text();
        const fileName = file.name;
        newItems.push({
          id: crypto.randomUUID(),
          name: fileName,
          path: fileName,
          language: languageFor(fileName),
          content: text
        });
      } catch (e) {
        console.warn('Could not read file:', file.name, e);
      }
    }

    processImportedFiles(newItems, `${fileList.length} files`);
    event.target.value = '';
  };

  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target.files?.[0];
    if (!input) return;
    try {
      setTerminal(prev => `${prev}\n⏳ Extracting ZIP archive...`);
      const zip = await JSZip.loadAsync(input);
      const normalized: FileItem[] = [];
      const entries = Object.keys(zip.files).filter(p => !zip.files[p].dir && !p.startsWith('__MACOSX') && !p.includes('/.') && !p.endsWith('.DS_Store'));
      for (const path of entries) {
        const content = await zip.files[path].async('string');
        const name = path.split('/').pop() || path;
        normalized.push({
          id: crypto.randomUUID(),
          name,
          path,
          language: languageFor(name),
          content
        });
      }
      if (!normalized.length) throw new Error('No readable files found in archive');
      processImportedFiles(normalized, `ZIP "${input.name}"`);
    } catch (err: any) {
      setTerminal(prev => `${prev}\n✗ Failed to import ZIP: ${err.message || 'invalid archive'}`);
    }
    event.target.value = '';
  };

  const exportAndroidPackage = () => {
    const cap = JSON.stringify(
      {
        appId: 'ai.codeforge.mobile',
        appName: 'CodeForge Mobile',
        webDir: 'dist',
        server: { androidScheme: 'https' },
        android: { minSdk: 24, targetSdk: 35, note: 'Capacitor Android native container.' }
      },
      null,
      2
    );
    const readme = '# CodeForge Mobile Android Build\n\n1. Run `npm run build`\n2. Open Android Studio via Capacitor\n3. Build APK/AAB.';
    (async () => {
      for (const [name, body] of [['capacitor.config.json', cap], ['ANDROID-BUILD.md', readme]]) {
        await saveFile(body, name);
      }
    })();
    setTerminal(prev => `${prev}\n✓ Android packaging files exported`);
  };

  const formatFile = () => {
    if (!active) return;
    const content = readEditorValue(active.content);
    const lang = active.language;
    let formatted = content;

    try {
      if (lang === 'json') {
        formatted = JSON.stringify(JSON.parse(content), null, 2);
      } else if (lang === 'javascript' || lang === 'typescript') {
        // Standardize indentation and trim lines
        let indent = 0;
        formatted = content
          .split('\n')
          .map((line: string) => {
            const trimmed = line.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
              indent = Math.max(0, indent - 1);
            }
            const res = '  '.repeat(indent) + trimmed;
            if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) {
              indent++;
            }
            return res;
          })
          .join('\n');
      } else if (lang === 'html') {
        // Clean tag indents
        let indent = 0;
        formatted = content
          .split('\n')
          .map((line: string) => {
            const trimmed = line.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('</') || trimmed.startsWith('-->')) {
              indent = Math.max(0, indent - 1);
            }
            const res = '  '.repeat(indent) + trimmed;
            if (
              trimmed.startsWith('<') &&
              !trimmed.startsWith('</') &&
              !trimmed.startsWith('<!') &&
              !trimmed.endsWith('/>') &&
              !trimmed.includes('</') &&
              !trimmed.startsWith('<meta') &&
              !trimmed.startsWith('<link') &&
              !trimmed.startsWith('<input') &&
              !trimmed.startsWith('<br') &&
              !trimmed.startsWith('<hr') &&
              !trimmed.startsWith('<img')
            ) {
              indent++;
            }
            return res;
          })
          .join('\n');
      } else {
        formatted = content
          .split('\n')
          .map((line: string) => line.trimEnd())
          .join('\n');
      }
    } catch {
      formatted = content.split('\n').map((line: string) => line.trimEnd()).join('\n');
    }

    updateContent(formatted);
    setTerminal(prev => `${prev}\n✓ Formatter applied to ${active.name}`);
  };

  const doFindReplace = (replaceAll = false) => {
    if (!active || !findQuery) return;
    const editor = editorRef.current;
    if (editor && !replaceAll) {
      // Find next in Monaco
      const model = editor.getModel();
      if (model) {
        const matches = model.findMatches(findQuery, true, false, false, null, true);
        if (matches.length) {
          editor.setSelection(matches[0].range);
          editor.revealRangeInCenter(matches[0].range);
        } else {
          setTerminal(prev => `${prev}\n🔍 No matches for "${findQuery}"`);
        }
      }
      return;
    }
    // Replace all
    if (replaceAll && findQuery) {
      const newContent = active.content.split(findQuery).join(replaceQuery);
      const count = active.content.split(findQuery).length - 1;
      updateContent(newContent);
      setTerminal(prev => `${prev}\n✓ Replaced ${count} occurrence(s) of "${findQuery}"`);
      setShowFindReplace(false);
    }
  };

  // VS Code Command Palette Registry
  const commandsList = useMemo(() => {
    return [
      // File Category
      {
        id: 'file.new',
        category: 'File' as const,
        title: 'File: New File...',
        shortcut: '⌘N',
        icon: FilePlus2,
        action: () => openCreateFileDialog()
      },
      {
        id: 'file.save',
        category: 'File' as const,
        title: 'File: Save Current File',
        shortcut: '⌘S',
        icon: Save,
        action: () => {
          setFiles(prev => prev.map(f => (f.id === active.id ? { ...f, modified: false } : f)));
          setTerminal(prev => `${prev}\n✓ Saved ${active.name}`);
        }
      },
      {
        id: 'file.import',
        category: 'File' as const,
        title: 'File: Import Project / Files...',
        shortcut: '⌘O',
        icon: Upload,
        action: () => setShowImportModal(true)
      },
      {
        id: 'file.exportZip',
        category: 'File' as const,
        title: 'File: Export Workspace as ZIP',
        icon: Download,
        action: () => exportProjectZip()
      },
      {
        id: 'file.exportAndroid',
        category: 'File' as const,
        title: 'File: Export Android Package (APK Config)',
        icon: Smartphone,
        action: () => exportAndroidPackage()
      },
      {
        id: 'file.close',
        category: 'File' as const,
        title: 'File: Close Active Tab',
        shortcut: '⌘W',
        icon: X,
        action: () => closeTab(active.id)
      },
      {
        id: 'file.delete',
        category: 'File' as const,
        title: 'File: Delete Active File',
        icon: Trash2,
        action: () => deleteFile(active.id)
      },

      // Edit Category
      {
        id: 'edit.format',
        category: 'Edit' as const,
        title: 'Format: Format Document',
        shortcut: '⌥⇧F',
        icon: Wand2,
        action: () => handleFormatDocument()
      },
      {
        id: 'edit.find',
        category: 'Edit' as const,
        title: 'Edit: Find & Replace',
        shortcut: '⌘F',
        icon: Search,
        action: () => setShowFindReplace(true)
      },
      {
        id: 'edit.gotoLine',
        category: 'Edit' as const,
        title: 'Edit: Go to Line...',
        shortcut: '⌃G',
        icon: ArrowRightToLine,
        action: () => setShowGoToLine(true)
      },
      {
        id: 'edit.comment',
        category: 'Edit' as const,
        title: 'Edit: Toggle Line Comment',
        shortcut: '⌘/',
        icon: Slash,
        action: () => handleCommentToggle()
      },
      {
        id: 'edit.duplicate',
        category: 'Edit' as const,
        title: 'Edit: Duplicate Line Down',
        shortcut: '⌥⇧↓',
        icon: CopyPlus,
        action: () => handleDuplicateLine()
      },
      {
        id: 'edit.selectWord',
        category: 'Edit' as const,
        title: 'Edit: Expand Selection / Smart Select',
        icon: Check,
        action: () => handleSelectExpand()
      },
      {
        id: 'edit.undo',
        category: 'Edit' as const,
        title: 'Edit: Undo',
        shortcut: '⌘Z',
        icon: Undo2,
        action: () => handleUndo()
      },
      {
        id: 'edit.redo',
        category: 'Edit' as const,
        title: 'Edit: Redo',
        shortcut: '⌘Y',
        icon: RotateCw,
        action: () => handleRedo()
      },

      // View Category
      {
        id: 'view.wordWrap',
        category: 'View' as const,
        title: `View: Toggle Word Wrap (${wordWrap ? 'On' : 'Off'})`,
        shortcut: '⌥Z',
        icon: Code2,
        action: () => setWordWrap(w => !w)
      },
      {
        id: 'view.stickyScroll',
        category: 'View' as const,
        title: `View: Toggle Sticky Scroll (${stickyScroll ? 'Enabled' : 'Disabled'})`,
        icon: Pin,
        action: () => setStickyScroll(s => !s)
      },
      {
        id: 'view.togglePanel',
        category: 'View' as const,
        title: `View: Toggle Terminal & Output Panel (${panel ? 'Open' : 'Closed'})`,
        shortcut: '⌃`',
        icon: Terminal,
        action: () => setPanel(p => !p)
      },
      {
        id: 'view.problems',
        category: 'View' as const,
        title: `View: Show Problems (${errorCount} errors, ${warningCount} warnings)`,
        icon: AlertCircle,
        action: () => {
          setPanelTab('problems');
          setPanel(true);
        }
      },
      {
        id: 'view.explorer',
        category: 'View' as const,
        title: 'View: Show File Explorer',
        shortcut: '⇧⌘E',
        icon: Files,
        action: () => {
          setView('editor');
          setSidebarTab('explorer');
          setSidebar(true);
        }
      },
      {
        id: 'view.search',
        category: 'View' as const,
        title: 'View: Show Search in Workspace',
        shortcut: '⇧⌘F',
        icon: Search,
        action: () => {
          setView('editor');
          setSidebarTab('search');
          setSidebar(true);
        }
      },
      {
        id: 'view.git',
        category: 'View' as const,
        title: 'View: Show Source Control (Git)',
        shortcut: '⌃⇧G',
        icon: GitBranch,
        action: () => {
          setView('editor');
          setSidebarTab('git');
          setSidebar(true);
        }
      },
      {
        id: 'view.ai',
        category: 'View' as const,
        title: 'View: Show CodeForge AI Copilot',
        icon: Sparkles,
        action: () => setView('ai')
      },
      {
        id: 'view.extensions',
        category: 'View' as const,
        title: 'View: Show Extensions Marketplace',
        shortcut: '⇧⌘X',
        icon: Package,
        action: () => setView('extensions')
      },
      {
        id: 'view.templates',
        category: 'View' as const,
        title: 'View: Starter Project Templates',
        icon: Layers,
        action: () => setView('templates')
      },
      {
        id: 'view.stykanime',
        category: 'View' as const,
        title: 'View: Open StykAnime 2D Animation Studio',
        icon: Film,
        action: () => setView('stykanime')
      },
      {
        id: 'view.preview',
        category: 'View' as const,
        title: 'View: Open Fullscreen Runtime Preview',
        icon: Play,
        action: () => {
          setView('preview');
          setPreviewKey(k => k + 1);
        }
      },
      {
        id: 'view.splitPreview',
        category: 'View' as const,
        title: `View: Toggle Split Live Preview (${splitPreview ? 'Open' : 'Closed'})`,
        icon: Columns,
        action: () => setSplitPreview(s => !s)
      },

      // Preferences Category
      {
        id: 'pref.theme',
        category: 'Preferences' as const,
        title: `Preferences: Color Theme (Current: ${theme})`,
        icon: Sparkles,
        action: () => setView('settings')
      },
      {
        id: 'pref.language',
        category: 'Preferences' as const,
        title: `Preferences: Select Language Mode (${active?.language || 'plaintext'})`,
        icon: Code2,
        action: () => setShowLanguagePicker(true)
      },
      {
        id: 'pref.indent',
        category: 'Preferences' as const,
        title: `Preferences: Indentation (${indentSettings.insertSpaces ? `Spaces: ${indentSettings.tabSize}` : `Tab: ${indentSettings.tabSize}`})`,
        icon: Indent,
        action: () => setShowIndentPicker(true)
      },
      {
        id: 'pref.lineEnding',
        category: 'Preferences' as const,
        title: `Preferences: Toggle Line Endings (Current: ${lineEnding})`,
        icon: Check,
        action: () => toggleLineEnding()
      },
      {
        id: 'pref.settings',
        category: 'Preferences' as const,
        title: 'Preferences: Open Settings',
        shortcut: '⌘,',
        icon: Settings,
        action: () => setView('settings')
      },

      // Run Category
      {
        id: 'run.code',
        category: 'Run' as const,
        title: `Run: Run Current File (${active?.name})`,
        shortcut: 'F5',
        icon: Play,
        action: () => handleRunCurrentCode()
      },
      {
        id: 'run.python',
        category: 'Run' as const,
        title: 'Run: Execute Python in Pyodide Runtime',
        icon: Play,
        action: () => {
          if (active.language === 'python' || active.name.endsWith('.py')) runPythonCode(active.content);
          else runPythonCode(files.find(f => f.name.endsWith('.py'))?.content || 'print("Hello from Python!")');
        }
      },
      {
        id: 'run.clear',
        category: 'Run' as const,
        title: 'Terminal: Clear Terminal Output',
        icon: Trash2,
        action: () => setTerminal('$ clear\n')
      },

      // Git Category
      {
        id: 'git.cloud',
        category: 'Git' as const,
        title: 'Git: GitHub Cloud Push & Pull',
        icon: Cloud,
        action: () => setView('github-sync')
      },
      {
        id: 'git.liveshare',
        category: 'Git' as const,
        title: 'Live Share: Realtime Peer Collaboration Room',
        icon: Users,
        action: () => setView('liveshare')
      },
      {
        id: 'view.pinTab',
        category: 'View' as const,
        title: `View: ${pinnedTabs.includes(active.id) ? 'Unpin Active Tab' : 'Pin Active Tab'}`,
        icon: Pin,
        action: () => togglePinTab(active.id)
      },
      {
        id: 'view.closeOtherTabs',
        category: 'View' as const,
        title: 'View: Close Other Tabs in Workspace',
        icon: Files,
        action: () => closeOtherTabs(active.id)
      },
      {
        id: 'view.closeSavedTabs',
        category: 'View' as const,
        title: 'View: Close Saved Tabs in Workspace',
        icon: CheckCircle2,
        action: closeSavedTabs
      },
      {
        id: 'view.closeAllTabs',
        category: 'View' as const,
        title: 'View: Close All Tabs',
        icon: Trash2,
        action: closeAllTabs
      },
      {
        id: 'nav.landing',
        category: 'View' as const,
        title: 'CodeForge: Return to Landing Page',
        icon: Home,
        action: () => setInIdeMode(false)
      }
    ];
  }, [active, files, wordWrap, stickyScroll, panel, errorCount, warningCount, splitPreview, theme, indentSettings, lineEnding, pinnedTabs]);

  const filteredPaletteCommands = useMemo(() => {
    let list = commandsList;
    if (paletteCategoryFilter !== 'all') {
      list = list.filter(c => c.category.toLowerCase() === paletteCategoryFilter);
    }
    const q = paletteSearchQuery.trim().toLowerCase().replace(/^>\s*/, '');
    if (!q) return list;
    return list.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  }, [commandsList, paletteCategoryFilter, paletteSearchQuery]);

  useEffect(() => {
    if (palette) {
      setPaletteSearchQuery('');
      setPaletteCategoryFilter('all');
      setPaletteActiveIndex(0);
    }
  }, [palette]);

  const executeCommandItem = (cmd: typeof commandsList[0]) => {
    setPalette(false);
    setPaletteSearchQuery('');
    cmd.action();
  };

  const handlePaletteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPaletteActiveIndex(prev => (prev + 1) % (filteredPaletteCommands.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPaletteActiveIndex(prev => (prev - 1 + filteredPaletteCommands.length) % (filteredPaletteCommands.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredPaletteCommands[paletteActiveIndex]) {
        executeCommandItem(filteredPaletteCommands[paletteActiveIndex]);
      }
    } else if (e.key === 'Escape') {
      setPalette(false);
    }
  };

  const executePalette = (action: string) => {
    setPalette(false);
    if (action === 'new') openCreateFileDialog();
    if (action === 'terminal') setPanel(v => !v);
    if (action === 'find') setShowFindReplace(true);
    if (action === 'preview') {
      setView('preview');
      setPreviewKey(k => k + 1);
    }
    if (action === 'python') {
      if (active.language === 'python' || active.name.endsWith('.py')) runPythonCode(active.content);
      else runPythonCode(files.find(f => f.name.endsWith('.py'))?.content || 'print("Hello from Python!")');
    }
    if (action === 'templates') setView('templates');
    if (action === 'github-sync') setView('github-sync');
    if (action === 'liveshare') setView('liveshare');
    if (action === 'extensions') setView('extensions');
    if (action === 'git') setView('git');
    if (action === 'ai') setView('ai');
    if (action === 'settings') setView('settings');
    if (action === 'format') handleFormatDocument();
    if (action === 'zip') exportProjectZip();
    if (action === 'landing') setInIdeMode(false);
    if (action === 'save') {
      setFiles(prev => prev.map(f => (f.id === active.id ? { ...f, modified: false } : f)));
      setTerminal(prev => `${prev}\n✓ Saved ${active.name}`);
    }
  };

  // AI Service Call
  const sendAiRequest = async (userPrompt: string, customSystemContext?: string) => {
    if (!userPrompt.trim()) return;

    if (!aiApiKey.trim()) {
      setAiMessages(prev => [
        ...prev,
        { role: 'user', content: userPrompt },
        {
          role: 'assistant',
          content: '⚠️ Please enter your API Key in Settings (or below) to enable CodeForge AI Assistant. You can get a free Gemini API key from Google AI Studio.'
        }
      ]);
      return;
    }

    const currentFileContext = `Current active file: ${active.name} (${active.language})\n\`\`\`${active.language}\n${active.content}\n\`\`\``;
    const systemPrompt = customSystemContext || `You are CodeForge AI Assistant, an expert mobile coding copilot. Help the user understand, fix, optimize, or write code. When writing or suggesting code, write clean, production-ready code. Context:\n${currentFileContext}`;

    setAiMessages(prev => [...prev, { role: 'user', content: userPrompt }]);
    setAiPrompt('');
    setAiLoading(true);

    try {
      if (aiProvider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${aiApiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nUser Question/Instruction:\n${userPrompt}` }]
              }
            ]
          })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error.message || 'Gemini API error');

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';
        setAiMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      } else {
        const endpoint = aiCustomEndpoint.replace(/\/+$/, '') + '/chat/completions';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ]
          })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error.message || 'API error');

        const reply = data.choices?.[0]?.message?.content || 'No response received.';
        setAiMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      }
    } catch (err: any) {
      setAiMessages(prev => [
        ...prev,
        { role: 'assistant', content: `❌ Error: ${err.message || 'Failed to connect to AI API. Please check your key and network.'}` }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        // Inline save to avoid stale closure / missing deps
        setFiles(prev => prev.map(f => (f.id === activeId ? { ...f, modified: false } : f)));
        setTerminal(prev => `${prev}\n✓ Saved (⌘S)`);
      } else if (mod && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPalette(true);
      } else if (mod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowFindReplace(true);
      } else if (mod && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setShowGoToLine(true);
      } else if (e.key === 'Escape') {
        setPalette(false);
        setShowFindReplace(false);
        setShowLanguagePicker(false);
        setShowIndentPicker(false);
        setShowGoToLine(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeId]);

  // Android back button: close menus first, then return to the editor, then minimise (never lose work)
  const backStateRef = useRef({ palette: false, more: false, view: 'editor' as string });
  backStateRef.current = { palette, more: showMoreMenu, view };
  useEffect(() => {
    if (!isNativeApp) return;
    let remove: (() => void) | undefined;
    CapacitorApp.addListener('backButton', () => {
      const st = backStateRef.current;
      if (st.palette) setPalette(false);
      else if (st.more) setShowMoreMenu(false);
      else if (st.view !== 'editor') setView('editor');
      else CapacitorApp.minimizeApp().catch(() => {});
    })
      .then(handle => {
        remove = () => handle.remove();
      })
      .catch(() => {});
    return () => remove?.();
  }, []);

  // Always show the desktop IDE layout, even on a phone in portrait:
  // lay the page out ~820px wide and let the browser scale it to fit the screen.
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    const original = meta.getAttribute('content') || 'width=device-width, initial-scale=1.0';
    const apply = () => {
      const deviceWidth = window.screen.width || window.innerWidth;
      const next = inIdeMode ? (deviceWidth < 820 ? 'width=820, user-scalable=no' : `${original}, maximum-scale=1.0, user-scalable=no`) : original;
      if (meta.getAttribute('content') !== next) meta.setAttribute('content', next);
    };
    apply();
    window.addEventListener('orientationchange', apply);
    window.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('orientationchange', apply);
      window.removeEventListener('resize', apply);
      meta.setAttribute('content', original);
    };
  }, [inIdeMode]);

  // If user is on landing page view
  if (!inIdeMode) {
    return (
      <LandingPage
        onLaunchIde={() => setInIdeMode(true)}
        onDownloadZip={exportProjectZip}
        onExportAndroid={exportAndroidPackage}
      />
    );
  }

  const activeIsHtml = active?.language === 'html' || active?.name.endsWith('.html') || active?.name.endsWith('.htm');
  const htmlFile = activeIsHtml
    ? active
    : (files.find(f => f.name === 'index.html' || f.path.endsWith('index.html')) || files.find(f => f.language === 'html' || f.name.endsWith('.html')));
  const rawHtml = htmlFile ? htmlFile.content : '<h1>No HTML file selected</h1><p>Open or create an .html file to preview.</p>';

  const PREVIEW_CONSOLE_BRIDGE = "(function(){var _l=console.log,_w=console.warn,_e=console.error;function send(t,a){try{var m=Array.from(a).map(function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(_){return String(x)}}).join(' ');window.parent.postMessage({type:'codeforge-console',level:t,message:m},'*')}catch(e){}}console.log=function(){send('log',arguments);_l.apply(console,arguments)};console.warn=function(){send('warn',arguments);_w.apply(console,arguments)};console.error=function(){send('error',arguments);_e.apply(console,arguments)};window.addEventListener('error',function(ev){send('error',[(ev.message||'Error')+(ev.lineno?' (line '+ev.lineno+')':'')])});window.addEventListener('unhandledrejection',function(ev){send('error',['Unhandled promise rejection: '+(ev.reason&&ev.reason.message||ev.reason)])})})();";
  const preview = buildPreviewHtml(rawHtml, files, PREVIEW_CONSOLE_BRIDGE);

  return (
    <div className={`app-shell theme-${theme}`} style={{ background: themeBgMap[theme] }}>
      {/* Landscape Helper Banner for Mobile Portrait Viewers */}
      {!isLandscape && showLandscapeBanner && (
        <div className="landscape-banner">
          <div className="landscape-banner-content">
            <Smartphone className="rotate-icon" size={16} />
            <span>Rotate to Landscape for full desktop VS Code power!</span>
          </div>
          <div className="landscape-banner-actions">
            <button className="banner-rotate-btn" onClick={requestLandscapeOrientation}>
              Rotate Now
            </button>
            <button className="banner-close-btn" onClick={() => setShowLandscapeBanner(false)}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="topbar-left">
          {!isNativeApp && (
            <button className="icon-btn" title="Back to Home / Landing Page" onClick={() => setInIdeMode(false)}>
              <Home size={17} />
            </button>
          )}
          <button className="icon-btn" aria-label="Open explorer" onClick={() => setSidebar(v => !v)}>
            <Menu size={19} />
          </button>
          <div className="brand">
            <span>CodeForge</span>
            <small>Mobile IDE</small>
          </div>
        </div>

        <div className="top-actions">
          <button className="command-btn" onClick={() => setPalette(true)}>
            <Search size={14} />
            <span>Command Palette</span>
            <kbd>⌘P</kbd>
          </button>

          <button className="icon-btn templates-top-btn top-secondary" title="Starter Templates" onClick={() => setView('templates')}>
            <Layers size={17} />
          </button>

          <button
            className="action-btn"
            title={`Run ${active?.name || 'File'}`}
            onClick={handleRunCurrentCode}
          >
            <Play size={15} />
            <span>
              {pyRunning
                ? 'Running...'
                : (view === 'preview'
                    ? 'Editor'
                    : 'Run')}
              {!pyRunning && view !== 'preview' && active?.name && (
                <em className="run-file hide-on-mobile">({active.name})</em>
              )}
            </span>
          </button>

          <button className="icon-btn ai-badge-btn" title="AI Copilot" onClick={() => setView('ai')}>
            <Bot size={17} />
          </button>
          <button className="icon-btn top-secondary" title="Save" onClick={() => executePalette('save')}>
            <Save size={17} />
          </button>
          <button className="icon-btn top-secondary" title="Export ZIP" onClick={exportProjectZip}>
            <Download size={18} />
          </button>
          <button className="icon-btn top-secondary" title="Share Project / Code URL" onClick={generateShareLink}>
            <Share2 size={17} />
          </button>
          <button className="icon-btn top-secondary" title="Import Project / Files" onClick={() => setShowImportModal(true)}>
            <Upload size={18} />
          </button>
          <button
            className="icon-btn more-btn"
            aria-label="More actions"
            aria-expanded={showMoreMenu}
            onClick={() => setShowMoreMenu(v => !v)}
          >
            <MoreVertical size={19} />
          </button>
          <input
            ref={folderInputRef}
            type="file"
            multiple
            {...({ webkitdirectory: '', directory: '' } as any)}
            hidden
            onChange={handleFolderUpload}
          />
          <input
            ref={multiFileInputRef}
            type="file"
            multiple
            accept="*/*"
            hidden
            onChange={handleMultiFilesUpload}
          />
          <input
            ref={zipFileInputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            hidden
            onChange={handleZipUpload}
          />
        </div>
      
        {showMoreMenu && (
          <>
            <div className="more-backdrop" onClick={() => setShowMoreMenu(false)} />
            <div className="more-menu" role="menu">
              <button className="more-item" onClick={() => { setShowMoreMenu(false); formatFile(); }}>
                <Wand2 size={18} /> Format code
              </button>
              <button className="more-item" onClick={() => { setShowMoreMenu(false); setSplitPreview(v => !v); }}>
                <Columns size={18} /> Split preview
              </button>
              <button className="more-item" onClick={() => { setShowMoreMenu(false); setView('templates'); }}>
                <Layers size={18} /> Starter templates
              </button>
              <button className="more-item" onClick={() => { setShowMoreMenu(false); setView('stykanime'); }}>
                <Film size={18} /> StykAnime 2D studio
              </button>
              <button className="more-item" onClick={() => { setShowMoreMenu(false); executePalette('save'); }}>
                <Save size={18} /> Save
              </button>
              <button className="more-item" onClick={() => { setShowMoreMenu(false); exportProjectZip(); }}>
                <Download size={18} /> Export project (.zip)
              </button>
              <button className="more-item" onClick={() => { setShowMoreMenu(false); generateShareLink(); }}>
                <Share2 size={18} /> Share project link
              </button>
              <button className="more-item" onClick={() => { setShowMoreMenu(false); setShowImportModal(true); }}>
                <Upload size={18} /> Import files
              </button>
            </div>
          </>
        )}
      </header>

      {/* Main Workspace Area */}
      <div className="workspace">
        {/* VS Code Left Activity Bar */}
        <nav className="activity-bar" aria-label="Activity Bar">
          <div className="activity-top">
            <button
              className={`activity-btn ${sidebar && sidebarTab === 'explorer' ? 'active' : ''}`}
              title="Explorer (Files)"
              onClick={() => handleActivityBarClick('explorer')}
            >
              <Files size={18} />
            </button>
            <button
              className={`activity-btn ${sidebar && sidebarTab === 'search' ? 'active' : ''}`}
              title="Search & Replace"
              onClick={() => handleActivityBarClick('search')}
            >
              <Search size={18} />
              {contentSearch && matches.length > 0 && <span className="activity-badge" />}
            </button>
            <button
              className={`activity-btn ${sidebar && sidebarTab === 'git' ? 'active' : ''}`}
              title="Source Control (Git)"
              onClick={() => handleActivityBarClick('git')}
            >
              <GitBranch size={18} />
              {files.filter(f => f.modified).length > 0 && (
                <span className="activity-badge" style={{ background: '#eab308' }} />
              )}
            </button>
            <button
              className={`activity-btn ${sidebar && sidebarTab === 'debug' ? 'active' : ''}`}
              title="Run & Debug"
              onClick={() => handleActivityBarClick('debug')}
            >
              <Play size={18} />
            </button>
            <button
              className={`activity-btn ${sidebar && sidebarTab === 'ai' ? 'active' : ''}`}
              title="AI Copilot"
              onClick={() => handleActivityBarClick('ai')}
            >
              <Sparkles size={18} />
              <span className="activity-badge-ai">AI</span>
            </button>
            <button
              className={`activity-btn ${sidebar && sidebarTab === 'extensions' ? 'active' : ''}`}
              title="Extensions"
              onClick={() => handleActivityBarClick('extensions')}
            >
              <Package size={18} />
            </button>
          </div>
          <div className="activity-bottom">
            <button
              className={`activity-btn ${sidebar && sidebarTab === 'settings' ? 'active' : ''}`}
              title="Settings"
              onClick={() => handleActivityBarClick('settings')}
            >
              <Settings size={18} />
            </button>
            <button
              className={`activity-btn ${view === 'stykanime' ? 'active' : ''}`}
              title="StykAnime Studio (2D Stick Animation)"
              onClick={() => {
                setView('stykanime');
                if (window.innerWidth < 768) setSidebar(false);
              }}
            >
              <Film size={18} />
            </button>
            <button
              className="activity-btn"
              title="Starter Templates"
              onClick={() => setView('templates')}
            >
              <Layers size={18} />
            </button>
          </div>
        </nav>

        {/* Mobile Backdrop Overlay */}
        {sidebar && <div className="sidebar-backdrop" onClick={() => setSidebar(false)} />}

        {/* Multi-Pane Sidebar */}
        {sidebar && (
          <aside className="sidebar">
            {/* 1. EXPLORER PANE */}
            {sidebarTab === 'explorer' && (
              <div className="sidebar-pane">
                <div className="sidebar-head">
                  <span>EXPLORER</span>
                  <div className="explorer-actions">
                    <button className="mini-btn" title="New file" onClick={openCreateFileDialog}>
                      <FilePlus2 size={15} />
                    </button>
                    <button
                      className="mini-btn"
                      title="New folder / file"
                      onClick={openCreateFileDialog}
                    >
                      <FolderPlus size={15} />
                    </button>
                    <button className="mini-btn" title="Close sidebar" onClick={() => setSidebar(false)}>
                      <X size={15} />
                    </button>
                  </div>
                </div>

                <div className="search">
                  <Search size={15} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter files..." />
                </div>

                <div
                  className="tree-root"
                  onClick={() => setWorkspaceExpanded(prev => !prev)}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  {workspaceExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  <FolderOpen size={16} />
                  <b>codeforge-workspace</b>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
                    {files.length} file{files.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {workspaceExpanded && (
                  <div className="tree">
                    {filtered.map(file => (
                      <div
                        key={file.id}
                        className={`tree-file ${active?.id === file.id ? 'selected' : ''}`}
                        onContextMenu={e => {
                          e.preventDefault();
                          setShowFileMenu(file);
                        }}
                      >
                        <button onClick={() => openFile(file.id)}>
                          {renderFileIcon(file.name, 16)}
                          <span>
                            {renameId === file.id ? (
                              <input
                                autoFocus
                                defaultValue={file.name}
                                onBlur={e => renameFile(file.id, e.currentTarget.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') renameFile(file.id, e.currentTarget.value);
                                }}
                              />
                            ) : (
                              <>
                                {file.path}
                                {file.modified ? ' •' : ''}
                              </>
                            )}
                          </span>
                        </button>
                        <div className="file-actions">
                          <button
                            title="Download File"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveFile(file.content, file.name);
                              setTerminal(prev => `${prev}\n✓ Downloaded file: ${file.name}`);
                            }}
                          >
                            <Download size={12} />
                          </button>
                          <button
                            title="Rename"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenameId(file.id);
                            }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            title="Duplicate"
                            onClick={(e) => {
                              e.stopPropagation();
                              const copy = { ...file, id: crypto.randomUUID(), name: `${file.name}.copy`, path: `${file.path}.copy`, modified: true };
                              setFiles(prev => [...prev, copy]);
                              openFile(copy.id);
                            }}
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            title="More options"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowFileMenu(file);
                            }}
                          >
                            <MoreVertical size={12} />
                          </button>
                          <button
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFile(file.id);
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="side-tools">
                  <button onClick={() => { setView('templates'); if (window.innerWidth < 768) setSidebar(false); }}>
                    <Layers size={15} /> Starter Templates
                  </button>
                  <button onClick={() => { setView('github-sync'); if (window.innerWidth < 768) setSidebar(false); }}>
                    <Cloud size={15} /> GitHub Cloud Push & Pull
                  </button>
                  <button onClick={() => { setView('liveshare'); if (window.innerWidth < 768) setSidebar(false); }}>
                    <Users size={15} /> Live Share Collaboration
                  </button>
                  <button onClick={() => { setPanel(v => !v); if (window.innerWidth < 768) setSidebar(false); }}>
                    <Terminal size={15} /> Terminal & Console
                  </button>
                  <button onClick={exportProjectZip}>
                    <Archive size={15} /> Export as ZIP
                  </button>
                  <button onClick={() => { setShowImportModal(true); if (window.innerWidth < 768) setSidebar(false); }}>
                    <Upload size={15} /> Import Project
                  </button>
                  <button onClick={exportAndroidPackage}>
                    <Download size={15} /> Android Package Setup
                  </button>
                  <button onClick={() => setInIdeMode(false)}>
                    <Home size={15} /> Landing Page
                  </button>
                </div>
              </div>
            )}

            {/* 2. SEARCH & REPLACE PANE */}
            {sidebarTab === 'search' && (
              <div className="sidebar-pane">
                <div className="sidebar-head">
                  <span>SEARCH & REPLACE</span>
                  <button className="mini-btn" title="Close sidebar" onClick={() => setSidebar(false)}>
                    <X size={15} />
                  </button>
                </div>

                <div className="sidebar-search-group">
                  <div className="sidebar-search-input">
                    <Search size={13} className="text-muted" />
                    <input
                      value={contentSearch}
                      onChange={e => setContentSearch(e.target.value)}
                      placeholder="Search text across files..."
                    />
                  </div>
                  <div className="sidebar-search-input">
                    <RefreshCw size={13} className="text-muted" />
                    <input
                      value={replaceSearch}
                      onChange={e => setReplaceSearch(e.target.value)}
                      placeholder="Replace with..."
                    />
                  </div>
                  <div className="sidebar-search-actions">
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="sidebar-chip"
                        onClick={() => setMatchCase(v => !v)}
                        title="Match Case"
                        style={matchCase ? { borderColor: 'var(--cf-accent-mid, #3b82f6)', color: 'var(--cf-accent-text, #60a5fa)', background: 'rgba(var(--cf-rgb, 59, 130, 246), 0.15)' } : {}}
                      >
                        Aa
                      </button>
                      <button
                        className="sidebar-chip"
                        onClick={() => setMatchWholeWord(v => !v)}
                        title="Match Whole Word"
                        style={matchWholeWord ? { borderColor: 'var(--cf-accent-mid, #3b82f6)', color: 'var(--cf-accent-text, #60a5fa)', background: 'rgba(var(--cf-rgb, 59, 130, 246), 0.15)' } : {}}
                      >
                        \b
                      </button>
                    </div>
                    <button
                      className="sidebar-btn-secondary"
                      onClick={replaceAllAcrossFiles}
                      disabled={!contentSearch}
                      title="Replace all occurrences across all files"
                    >
                      Replace All
                    </button>
                  </div>
                </div>

                <div className="sidebar-pane-body">
                  {contentSearch ? (
                    <>
                      <div className="sidebar-section-title">
                        {searchResultsWithSnippets.length > 0
                          ? `${searchResultsWithSnippets.reduce((sum, r) => sum + r.matchedLines.length, 0)} results in ${searchResultsWithSnippets.length} files`
                          : 'No matches found'}
                      </div>
                      {searchResultsWithSnippets.map(res => (
                        <div key={res.file.id} className="sidebar-match-card">
                          <div
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', cursor: 'pointer' }}
                            onClick={() => openFile(res.file.id)}
                          >
                            <span style={{ fontWeight: 600, fontSize: '11px', color: 'var(--cf-accent-text, #60a5fa)' }}>{res.file.name}</span>
                            <span className="sidebar-badge active">{res.matchedLines.length}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {res.matchedLines.slice(0, 5).map(m => (
                              <div
                                key={m.lineNum}
                                style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                                onClick={() => {
                                  openFile(res.file.id);
                                  if (editorRef.current) {
                                    editorRef.current.revealLineInCenter(m.lineNum);
                                    editorRef.current.setPosition({ lineNumber: m.lineNum, column: 1 });
                                  }
                                }}
                              >
                                <span style={{ color: '#38bdf8', marginRight: '6px' }}>L{m.lineNum}:</span>
                                {m.lineText}
                              </div>
                            ))}
                            {res.matchedLines.length > 5 && (
                              <small style={{ color: 'var(--text-muted)', fontSize: '9px' }}>+{res.matchedLines.length - 5} more matches</small>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                      Type in the search box above to search code across all files
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. SOURCE CONTROL (GIT) PANE */}
            {sidebarTab === 'git' && (
              <div className="sidebar-pane">
                <div className="sidebar-head">
                  <span>SOURCE CONTROL</span>
                  <button className="mini-btn" title="Close sidebar" onClick={() => setSidebar(false)}>
                    <X size={15} />
                  </button>
                </div>

                <div className="sidebar-pane-body">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--cf-accent-text, #60a5fa)' }}>
                      <GitBranch size={14} />
                      <b>{branch}</b>
                    </div>
                    <button
                      className="sidebar-btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '10px' }}
                      onClick={() => { setView('github-sync'); if (window.innerWidth < 768) setSidebar(false); }}
                    >
                      <Cloud size={11} /> Cloud Sync
                    </button>
                  </div>

                  {/* Mobile Quick Commit Prefixes */}
                  <div className="git-quick-prefixes">
                    {['feat', 'fix', 'chore', 'docs', 'refactor'].map(prefix => (
                      <button
                        key={prefix}
                        type="button"
                        className="git-prefix-chip"
                        onClick={() => {
                          setGitMessage(prev => {
                            const trimmed = prev.replace(/^(feat|fix|chore|docs|refactor):\s*/i, '');
                            return `${prefix}: ${trimmed}`;
                          });
                        }}
                      >
                        {prefix}:
                      </button>
                    ))}
                  </div>

                  <textarea
                    className="sidebar-textarea"
                    rows={2}
                    value={gitMessage}
                    onChange={e => setGitMessage(e.target.value)}
                    placeholder="Commit message (e.g. feat: add screen)..."
                  />

                  <button className="sidebar-btn-primary" onClick={commit}>
                    <Check size={14} /> Commit to '{branch}'
                  </button>

                  <div className="sidebar-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>CHANGES ({files.filter(f => f.modified).length})</span>
                    {files.filter(f => f.modified).length > 0 && (
                      <button
                        type="button"
                        className="git-discard-all-btn"
                        title="Discard all changes"
                        onClick={discardAllChanges}
                      >
                        <Undo2 size={11} /> Discard All
                      </button>
                    )}
                  </div>

                  {files.filter(f => f.modified).length > 0 ? (
                    files.filter(f => f.modified).map(f => (
                      <div key={f.id} className="sidebar-item-row git-change-row">
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, overflow: 'hidden', cursor: 'pointer' }}
                          onClick={() => openFile(f.id)}
                        >
                          {renderFileIcon(f.name, 14)}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.name}
                          </span>
                        </div>
                        <div className="git-change-actions">
                          <button
                            type="button"
                            className="git-row-btn"
                            title="Open Visual Diff"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDiffTarget(f);
                            }}
                          >
                            <GitCompare size={12} />
                          </button>
                          <button
                            type="button"
                            className="git-row-btn danger"
                            title="Discard changes"
                            onClick={(e) => {
                              e.stopPropagation();
                              discardFileChanges(f.id);
                            }}
                          >
                            <Undo2 size={12} />
                          </button>
                          <span className="sidebar-badge modified">M</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '6px 10px' }}>
                      ✓ Working tree is clean
                    </div>
                  )}

                  <div className="sidebar-section-title">RECENT COMMITS</div>
                  {gitHistory.slice(0, 5).map((x, i) => (
                    <div key={`${x}-${i}`} style={{ padding: '6px 10px', fontSize: '11px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <GitCommit size={12} className="text-muted" />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x}</span>
                      <small style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{i === 0 ? 'latest' : `#${i + 1}`}</small>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. RUN & DEBUG PANE */}
            {sidebarTab === 'debug' && (
              <div className="sidebar-pane">
                <div className="sidebar-head">
                  <span>RUN & DEBUG</span>
                  <button className="mini-btn" title="Close sidebar" onClick={() => setSidebar(false)}>
                    <X size={15} />
                  </button>
                </div>

                <div className="sidebar-pane-body">
                  <button className="sidebar-btn-primary" onClick={handleRunCurrentCode}>
                    <Play size={14} /> Run {active?.name || 'File'}
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      className="sidebar-btn-secondary"
                      onClick={() => setSplitPreview(v => !v)}
                    >
                      <Columns size={12} /> {splitPreview ? 'Close Split' : 'Split Live'}
                    </button>
                    <button
                      className="sidebar-btn-secondary"
                      onClick={() => setPanel(v => !v)}
                    >
                      <Terminal size={12} /> Console Panel
                    </button>
                  </div>

                  <div className="sidebar-section-title">ACTIVE ENVIRONMENT</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-main)', padding: '8px 10px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div><b>Target:</b> {active?.name}</div>
                    <div style={{ marginTop: '3px', color: 'var(--text-muted)' }}><b>Runtime:</b> {active?.language === 'python' ? 'Pyodide (Wasm)' : 'Browser V8'}</div>
                    <div style={{ marginTop: '3px', color: hasTerminalError ? '#f87171' : '#4ade80' }}>
                      <b>Status:</b> {hasTerminalError ? 'Error Detected' : 'Ready'}
                    </div>
                  </div>

                  <div className="sidebar-section-title">CONSOLE OUTPUT PEEK</div>
                  <div style={{ background: '#05070a', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px', fontSize: '10px', fontFamily: 'monospace', color: '#94a3b8', maxHeight: '140px', overflowY: 'auto' }}>
                    {consoleLogs.length > 0 ? (
                      consoleLogs.slice(-6).map((log, i) => (
                        <div key={i} style={{ marginBottom: '3px', wordBreak: 'break-all' }}>{log}</div>
                      ))
                    ) : (
                      <div style={{ color: 'var(--text-muted)' }}>No console output yet. Tap Run above.</div>
                    )}
                  </div>
                  {consoleLogs.length > 0 && (
                    <button
                      className="sidebar-btn-secondary"
                      style={{ fontSize: '10px', alignSelf: 'flex-start' }}
                      onClick={() => setConsoleLogs([])}
                    >
                      Clear Console Logs
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 5. AI COPILOT PANE */}
            {sidebarTab === 'ai' && (
              <div className="sidebar-pane">
                <div className="sidebar-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} className="text-blue-400" />
                    <span>AI COPILOT</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="mini-btn" title="Full screen AI view" onClick={() => { setView('ai'); if (window.innerWidth < 768) setSidebar(false); }}>
                      <Bot size={13} />
                    </button>
                    <button className="mini-btn" title="Close sidebar" onClick={() => setSidebar(false)}>
                      <X size={15} />
                    </button>
                  </div>
                </div>

                <div className="sidebar-pane-body" style={{ flex: 1, minHeight: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    <button
                      className="sidebar-chip"
                      onClick={() => sendAiRequest(`Explain what ${active.name} does concisely.`)}
                    >
                      Explain file
                    </button>
                    <button
                      className="sidebar-chip"
                      onClick={() => sendAiRequest(`Check ${active.name} for bugs, edge cases, and performance issues.`)}
                    >
                      Find bugs
                    </button>
                    <button
                      className="sidebar-chip"
                      onClick={() => sendAiRequest(`Generate comprehensive unit tests for ${active.name}.`)}
                    >
                      Unit tests
                    </button>
                  </div>

                  <div className="sidebar-ai-messages">
                    {aiMessages.map((msg, idx) => (
                      <div key={idx} className={`sidebar-ai-bubble ${msg.role}`}>
                        {msg.content}
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="sidebar-ai-bubble assistant" style={{ fontStyle: 'italic', color: '#93c5fd' }}>
                        Thinking...
                      </div>
                    )}
                  </div>

                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      if (aiPrompt.trim() && !aiLoading) {
                        sendAiRequest(aiPrompt);
                      }
                    }}
                    style={{ display: 'flex', gap: '4px', marginTop: 'auto' }}
                  >
                    <input
                      className="sidebar-textarea"
                      style={{ height: '32px', padding: '6px 8px' }}
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      placeholder="Ask AI about code..."
                    />
                    <button
                      type="submit"
                      disabled={aiLoading || !aiPrompt.trim()}
                      className="sidebar-btn-primary"
                      style={{ width: '36px', height: '32px', padding: 0 }}
                      title="Send prompt"
                    >
                      <Send size={13} />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* 6. EXTENSIONS PANE */}
            {sidebarTab === 'extensions' && (
              <div className="sidebar-pane">
                <div className="sidebar-head">
                  <span>EXTENSIONS</span>
                  <button className="mini-btn" title="Close sidebar" onClick={() => setSidebar(false)}>
                    <X size={15} />
                  </button>
                </div>

                <div className="sidebar-pane-body">
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {extensions.filter(e => e.installed).length} installed
                  </div>
                  {extensions.map(ext => (
                    <div key={ext.id} className="sidebar-match-card" style={{ padding: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '11px', color: 'var(--text-main)' }}>{ext.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{ext.description}</div>
                        </div>
                        <button
                          className={ext.installed ? 'sidebar-btn-secondary' : 'sidebar-btn-primary'}
                          style={{ padding: '3px 8px', fontSize: '10px', width: 'auto' }}
                          onClick={() =>
                            setExtensions(prev =>
                              prev.map(e => (e.id === ext.id ? { ...e, installed: !e.installed } : e))
                            )
                          }
                        >
                          {ext.installed ? 'Enabled' : 'Install'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. SETTINGS PANE */}
            {sidebarTab === 'settings' && (
              <div className="sidebar-pane">
                <div className="sidebar-head">
                  <span>SETTINGS</span>
                  <button className="mini-btn" title="Close sidebar" onClick={() => setSidebar(false)}>
                    <X size={15} />
                  </button>
                </div>

                <div className="sidebar-pane-body">
                  <div className="sidebar-section-title">THEME & APPEARANCE</div>
                  <div className="sidebar-setting-row">
                    <span>Theme</span>
                    <select
                      className="select-dropdown"
                      style={{ padding: '3px 6px', fontSize: '11px' }}
                      value={theme}
                      onChange={e => setTheme(e.target.value as ThemeName)}
                    >
                      <option value="codeforge">CodeForge (default)</option>
                      <option value="vs-dark">VS Code Dark</option>
                      <option value="light">VS Code Light</option>
                      <option value="dracula">Dracula</option>
                      <option value="one-dark-pro">One Dark Pro</option>
                      <option value="monokai">Monokai</option>
                      <option value="synthwave-84">Synthwave '84</option>
                    </select>
                  </div>

                  <div className="sidebar-setting-row">
                    <span>Font Size</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button className="mini-btn" onClick={() => setFontSize(v => Math.max(11, v - 1))}>−</button>
                      <b style={{ fontSize: '11px' }}>{fontSize}px</b>
                      <button className="mini-btn" onClick={() => setFontSize(v => Math.min(22, v + 1))}>+</button>
                    </div>
                  </div>

                  <div className="sidebar-setting-row">
                    <span>Word Wrap</span>
                    <button
                      className="sidebar-btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '10px' }}
                      onClick={() => setWordWrap(v => !v)}
                    >
                      {wordWrap ? 'On' : 'Off'}
                    </button>
                  </div>

                  <div className="sidebar-setting-row">
                    <span>Sticky Scroll</span>
                    <button
                      className="sidebar-btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '10px' }}
                      onClick={() => setStickyScroll(v => !v)}
                    >
                      {stickyScroll ? 'On' : 'Off'}
                    </button>
                  </div>

                  <div className="sidebar-setting-row">
                    <span>Breadcrumbs</span>
                    <button
                      className="sidebar-btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '10px' }}
                      onClick={() => setBreadcrumbsEnabled(v => !v)}
                    >
                      {breadcrumbsEnabled ? 'On' : 'Off'}
                    </button>
                  </div>

                  <div className="sidebar-section-title">ADVANCED</div>
                  <button
                    className="sidebar-btn-secondary"
                    onClick={() => { setView('settings'); if (window.innerWidth < 768) setSidebar(false); }}
                  >
                    <Settings size={12} /> Open Full Settings
                  </button>
                </div>
              </div>
            )}

            {/* Persistent Sidebar Bottom Status */}
            <div className="sidebar-bottom">
              <button onClick={() => { setView('git'); if (window.innerWidth < 768) setSidebar(false); }}>
                <GitBranch size={14} /> {branch}
              </button>
              <span>
                <Zap size={14} /> Offline Ready
              </span>
            </div>
          </aside>
        )}

        {/* Center / Main Area */}
        <main className="main-area">
          {/* VS Code Editor Tabs Header */}
          <div className="tabs-header-bar">
            <div className="tabs-strip" role="tablist">
              {sortedTabs.map(id => {
                const file = files.find(f => f.id === id);
                if (!file) return null;
                const isPinned = pinnedTabs.includes(id);
                const isActive = id === activeId;
                return (
                  <button
                    key={id}
                    ref={el => { tabItemRefs.current[id] = el; }}
                    className={`tab ${isActive ? 'active' : ''} ${isPinned ? 'pinned' : ''}`}
                    onClick={() => openFile(id)}
                    onContextMenu={e => {
                      e.preventDefault();
                      setShowTabMenu({ id, x: e.clientX, y: e.clientY });
                    }}
                    title={`${file.name} (${file.path})`}
                    role="tab"
                    aria-selected={isActive}
                  >
                    <span className="tab-icon">{renderFileIcon(file.name, 13)}</span>
                    <span className="tab-label">{file.name}</span>
                    {isPinned ? (
                      <span
                        className="tab-pin-indicator"
                        title="Pinned tab (click to unpin)"
                        onClick={e => {
                          e.stopPropagation();
                          togglePinTab(id);
                        }}
                      >
                        <Pin size={11} className="tab-pin-icon" />
                      </span>
                    ) : (
                      <span
                        className={`tab-close-btn ${file.modified ? 'is-dirty' : ''}`}
                        title={file.modified ? 'Unsaved changes (click to close)' : 'Close'}
                        onClick={e => {
                          e.stopPropagation();
                          closeTab(id);
                        }}
                      >
                        {file.modified ? <span className="dirty-dot">●</span> : <X size={13} />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Action Toolbar on Right of Tabs */}
            <div className="tabs-actions-bar">
              <button
                className={`tab-action-btn ${splitPreview ? 'active' : ''}`}
                title={splitPreview ? 'Close Split Preview' : 'Split Editor Preview'}
                onClick={() => setSplitPreview(prev => !prev)}
              >
                <Columns size={14} />
              </button>
              <button
                className="tab-action-btn"
                title="New File"
                onClick={openCreateFileDialog}
              >
                <Plus size={15} />
              </button>
              <button
                className="tab-action-btn"
                title="Tab Actions Menu"
                onClick={() => setShowTabActionsModal(true)}
              >
                <MoreHorizontal size={15} />
              </button>
            </div>
          </div>

          {/* Code Editor View */}
          {view === 'editor' && (
            openTabs.length === 0 ? (
              <div className="empty-workspace-state">
                <div className="empty-workspace-card">
                  <Code2 size={48} className="empty-workspace-icon" />
                  <h3>No Open Editors</h3>
                  <p>Open a file from the explorer or create a new file to start coding.</p>
                  <div className="empty-workspace-actions">
                    <button className="primary-btn" onClick={openCreateFileDialog}>
                      <Plus size={15} /> New File
                    </button>
                    <button className="btn" onClick={() => { setSidebar(true); setSidebarTab('explorer'); }}>
                      <Files size={15} /> Open Explorer
                    </button>
                    <button className="btn" onClick={() => setPalette(true)}>
                      <Search size={15} /> Command Palette
                    </button>
                  </div>
                </div>
              </div>
            ) : (
            <div className="editor-wrap">
              <div className="editor-head">
                <span className="editor-head-path" title={active?.path}>
                  {active?.path || 'No file selected'} {active?.modified ? '• unsaved' : ''}
                </span>
                <span className="editor-head-meta">
                  {active?.language || 'plaintext'} · {fontSize}px
                </span>
              </div>

              {/* VS Code Breadcrumbs Bar */}
              {breadcrumbsEnabled && (
                <div className="editor-breadcrumbs">
                  <div className="breadcrumb-trail">
                    <span className="breadcrumb-item root" onClick={() => setSidebar(true)} title="Show Explorer">
                      <FolderOpen size={13} className="text-muted" />
                      <span>codeforge-workspace</span>
                    </span>
                    <ChevronRight size={12} className="breadcrumb-separator" />

                    <div className="breadcrumb-item file-item" onClick={() => setShowBreadcrumbsMenu(v => !v)}>
                      <FileCode2 size={13} className="text-blue-400" />
                      <span className="breadcrumb-name">{active?.name}</span>
                      <ChevronDown size={11} className="breadcrumb-dropdown-arrow" />

                      {showBreadcrumbsMenu && (
                        <div className="breadcrumb-dropdown" onClick={e => e.stopPropagation()}>
                          <div className="breadcrumb-dropdown-header">FILES IN WORKSPACE</div>
                          <div className="breadcrumb-dropdown-list">
                            {files.map(f => (
                              <div
                                key={f.id}
                                className={`breadcrumb-dropdown-row ${f.id === active?.id ? 'active' : ''}`}
                                onClick={() => {
                                  openFile(f.id);
                                  setShowBreadcrumbsMenu(false);
                                }}
                              >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <FileCode2 size={13} />
                                  <span>{f.path}</span>
                                </span>
                                {f.modified && <span className="sidebar-badge modified">M</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {currentSymbol && (
                      <>
                        <ChevronRight size={12} className="breadcrumb-separator" />
                        <span
                          className="breadcrumb-item symbol-item"
                          title="Current Function / Scope"
                          onClick={() => {
                            if (editorRef.current) {
                              editorRef.current.focus();
                            }
                          }}
                        >
                          <Code2 size={12} className="text-purple-400" />
                          <span className="breadcrumb-symbol">{currentSymbol}</span>
                        </span>
                      </>
                    )}
                  </div>

                  <div className="breadcrumb-actions">
                    <button
                      className={`breadcrumb-pill ${stickyScroll ? 'active' : ''}`}
                      title={stickyScroll ? 'Sticky Scroll Enabled' : 'Sticky Scroll Disabled'}
                      onClick={() => setStickyScroll(v => !v)}
                    >
                      <Pin size={10} />
                      <span>Sticky</span>
                    </button>
                    <span className="breadcrumb-pos">
                      Ln {currentCursor.line}, Col {currentCursor.column}
                    </span>
                  </div>
                </div>
              )}

              <div className={`editor-container ${splitPreview ? 'split-mode' : ''}`}>
                <div className="monaco-wrap">
                  <Editor
                    height="100%"
                    theme={theme}
                    beforeMount={defineEditorThemes}
                    language={active?.language || 'plaintext'}
                    value={active?.content || ''}
                    onMount={handleEditorDidMount}
                    onChange={(value: string | undefined) => updateContent(value ?? '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize,
                      automaticLayout: true,
                      wordWrap: wordWrap ? 'on' : 'off',
                      tabSize: indentSettings.tabSize,
                      insertSpaces: indentSettings.insertSpaces,
                      suggestOnTriggerCharacters: true,
                      quickSuggestions: true,
                      parameterHints: { enabled: true },
                      inlineSuggest: { enabled: true },
                      padding: { top: 8 },
                      smoothScrolling: true,
                      cursorBlinking: 'smooth',
                      bracketPairColorization: { enabled: true },
                      guides: {
                        bracketPairs: true,
                        bracketPairsHorizontal: true,
                        highlightActiveBracketPair: true,
                        indentation: true,
                        highlightActiveIndentation: true
                      },
                      folding: true,
                      foldingStrategy: 'auto',
                      showFoldingControls: 'always',
                      foldingHighlight: true,
                      unfoldOnClickAfterEndOfLine: true,
                      stickyScroll: {
                        enabled: stickyScroll,
                        maxLineCount: 5
                      },
                      renderLineHighlight: 'all',
                      renderLineHighlightOnlyWhenFocus: false,
                      glyphMargin: true,
                      lineNumbersMinChars: 3
                    }}
                    onValidate={(markers: any[]) => {
                      setEditorMarkers(markers || []);
                      setDiagnostics(markers && markers.length ? `${markers.length} diagnostic${markers.length > 1 ? 's' : ''} detected.` : 'No problems detected.');
                    }}
                  />
                </div>

                {splitPreview && (
                  <div className="split-preview-pane">
                    <div className="view-head">
                      <b>Live Split Preview</b>
                      <button className="pill-btn" onClick={() => setPreviewKey(k => k + 1)}>
                        <RefreshCw size={13} /> Refresh
                      </button>
                    </div>
                    <iframe key={`split-${previewKey}`} title="CodeForge Split Preview" sandbox="allow-scripts" srcDoc={preview} />
                  </div>
                )}
              </div>

              {/* Mobile Quick Symbol Access & Touch Navigation Toolbar */}
              <div className="quick-symbol-bar">
                {/* D-Pad Touch Cursor Navigation */}
                <div className="symbol-group nav-group" title="Touch Cursor Navigation">
                  <button
                    className="symbol-btn nav-btn"
                    title="Line Start (Home)"
                    onMouseDown={(e) => { e.preventDefault(); handleCursorMove('home'); }}
                  >
                    <ArrowLeftToLine size={13} />
                  </button>
                  <button
                    className="symbol-btn nav-btn"
                    title="Cursor Left (←)"
                    onMouseDown={(e) => { e.preventDefault(); handleCursorMove('left'); }}
                  >
                    <ArrowLeft size={13} />
                  </button>
                  <button
                    className="symbol-btn nav-btn"
                    title="Cursor Up (↑)"
                    onMouseDown={(e) => { e.preventDefault(); handleCursorMove('up'); }}
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    className="symbol-btn nav-btn"
                    title="Cursor Down (↓)"
                    onMouseDown={(e) => { e.preventDefault(); handleCursorMove('down'); }}
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    className="symbol-btn nav-btn"
                    title="Cursor Right (→)"
                    onMouseDown={(e) => { e.preventDefault(); handleCursorMove('right'); }}
                  >
                    <ArrowRight size={13} />
                  </button>
                  <button
                    className="symbol-btn nav-btn"
                    title="Line End (End)"
                    onMouseDown={(e) => { e.preventDefault(); handleCursorMove('end'); }}
                  >
                    <ArrowRightToLine size={13} />
                  </button>
                </div>

                <div className="symbol-divider" />

                {/* VS Code Quick Editing Actions */}
                <div className="symbol-group actions-group" title="VS Code Quick Actions">
                  <button
                    className="symbol-btn action-btn"
                    title="Tab Indent"
                    onMouseDown={(e) => { e.preventDefault(); handleTabAction(); }}
                  >
                    <Indent size={13} />
                    <span className="btn-label-text">Tab</span>
                  </button>
                  <button
                    className="symbol-btn action-btn"
                    title="Outdent (Shift+Tab)"
                    onMouseDown={(e) => { e.preventDefault(); handleOutdentAction(); }}
                  >
                    <Outdent size={13} />
                  </button>
                  <button
                    className="symbol-btn action-btn"
                    title="Toggle Comment (Ctrl+/)"
                    onMouseDown={(e) => { e.preventDefault(); handleCommentToggle(); }}
                  >
                    <Slash size={13} />
                  </button>
                  <button
                    className="symbol-btn action-btn"
                    title="Duplicate Line (Alt+Shift+Down)"
                    onMouseDown={(e) => { e.preventDefault(); handleDuplicateLine(); }}
                  >
                    <CopyPlus size={13} />
                  </button>
                  <button
                    className="symbol-btn action-btn"
                    title="Expand Selection / Select Word"
                    onMouseDown={(e) => { e.preventDefault(); handleSelectExpand(); }}
                  >
                    <span className="btn-label-text">Select</span>
                  </button>
                </div>

                <div className="symbol-divider" />

                {/* History & Voice Tools */}
                <button
                  className="symbol-btn undo-btn"
                  title="Undo (Ctrl+Z)"
                  onMouseDown={(e) => { e.preventDefault(); handleUndo(); }}
                >
                  <Undo2 size={13} />
                </button>
                <button
                  className="symbol-btn redo-btn"
                  title="Redo (Ctrl+Y)"
                  onMouseDown={(e) => { e.preventDefault(); handleRedo(); }}
                >
                  <RotateCw size={13} />
                </button>
                <button
                  className={`symbol-btn mic-btn ${isRecordingVoice ? 'recording' : ''}`}
                  title={isRecordingVoice ? 'Listening... Speak code' : 'Voice Dictation'}
                  onClick={toggleVoiceRecognition}
                >
                  {isRecordingVoice ? <MicOff size={13} className="text-red-400 animate-pulse" /> : <Mic size={13} />}
                </button>

                <div className="symbol-divider" />

                {/* Snippets / Symbols Switcher */}
                <button
                  className="symbol-mode-toggle"
                  title="Switch between General Symbols and Language Keywords/Snippets"
                  onClick={() => setToolbarMode(m => (m === 'symbols' ? 'snippets' : 'symbols'))}
                >
                  <Sparkles size={11} />
                  <span>{toolbarMode === 'symbols' ? 'Snippets' : 'Symbols'}</span>
                </button>

                <div className="symbol-divider" />

                {/* Symbols / Snippets Chips */}
                {(toolbarMode === 'symbols' ? quickSymbols : getLanguageSnippets(active?.language || 'plaintext')).map((s, idx) => (
                  <button
                    key={idx}
                    className="symbol-btn code-chip"
                    onMouseDown={(e) => { e.preventDefault(); handleInsertSymbol(s); }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            )
          )}

          {/* StykAnime 2D Animation Studio View */}
          {view === 'stykanime' && (
            <StykAnimeStudio
              onClose={() => setView('editor')}
              onExportToCode={(htmlContent, jsContent, cssContent) => {
                // Write to dedicated files so the user's own index.html is never overwritten
                const targets = [
                  { path: 'stykanime.html', fallbackId: 'stykanime-html', language: 'html', content: htmlContent },
                  { path: 'stykanime-animation.css', fallbackId: 'stykanime-css', language: 'css', content: cssContent },
                  { path: 'stykanime-animation.js', fallbackId: 'stykanime-js', language: 'javascript', content: jsContent }
                ].map(t => ({ ...t, id: files.find(f => f.path === t.path)?.id || t.fallbackId }));

                setFiles(prevFiles => {
                  const updated = [...prevFiles];
                  targets.forEach(t => {
                    const idx = updated.findIndex(f => f.path === t.path);
                    if (idx >= 0) {
                      updated[idx] = { ...updated[idx], content: t.content, modified: true };
                    } else {
                      updated.push({ id: t.id, name: t.path, path: t.path, language: t.language, content: t.content, modified: true });
                    }
                  });
                  return updated;
                });
                const htmlId = targets[0].id;
                setOpenTabs(prev => (prev.includes(htmlId) ? prev : [...prev, htmlId]));
                setActiveId(htmlId);
                setView('preview');
                setPreviewKey(k => k + 1);
              }}
            />
          )}

          {/* Starter Project Templates View */}
          {view === 'templates' && (
            <section className="full-view list-view">
              <div className="view-head">
                <b>Starter Project Templates</b>
                <button className="pill-btn" onClick={() => setView('editor')}>
                  <X size={14} /> Close
                </button>
              </div>
              <div className="templates-grid">
                {projectTemplates.map(tmpl => (
                  <div key={tmpl.id} className="template-card">
                    <div className="template-icon">{tmpl.icon}</div>
                    <div className="template-info">
                      <span className="template-category">{tmpl.category}</span>
                      <h4>{tmpl.name}</h4>
                      <p>{tmpl.description}</p>
                    </div>
                    <button className="primary-btn" onClick={() => applyTemplate(tmpl)}>
                      Load Template ({tmpl.files.length} files)
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* GitHub Cloud Sync View */}
          {view === 'github-sync' && (
            <section className="full-view list-view">
              <div className="view-head">
                <div className="flex items-center gap-2">
                  <Github size={16} />
                  <b>GitHub Direct Cloud Sync</b>
                </div>
                <button className="pill-btn" onClick={() => setView('editor')}>
                  <X size={14} />
                </button>
              </div>

              <div className="git-card">
                <Cloud size={20} className="text-blue-400" />
                <div>
                  <b>Push Current File to Remote</b>
                  <p>Commit and push the currently active file directly to your GitHub repository using a Personal Access Token.</p>
                </div>
              </div>

              <div className="setting-input-block">
                <label>GitHub Personal Access Token (repo scope)</label>
                <input
                  type="password"
                  value={ghToken}
                  onChange={e => setGhToken(e.target.value)}
                  placeholder="ghp_..."
                />
              </div>

              <div className="setting-input-block">
                <label>Target Repository (owner/repo)</label>
                <input
                  value={ghRepoInput}
                  onChange={e => setGhRepoInput(e.target.value)}
                  placeholder="khalidabdullahh/CodeForgeMobile"
                />
              </div>

              <div className="setting-input-block">
                <label>Branch Name</label>
                <input
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  placeholder="main"
                />
              </div>

              {ghStatusMsg && <div className="status-note" style={{ color: ghStatusMsg.startsWith('✅') ? '#4ade80' : ghStatusMsg.startsWith('⏳') ? '#60a5fa' : '#f87171' }}>{ghStatusMsg}</div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="primary-wide" disabled={ghLoading} onClick={pushFileToGitHub}>
                  <Cloud size={16} /> {ghLoading ? 'Working...' : `Push Current File (${active?.name || 'File'})`}
                </button>
                <button className="primary-wide secondary-theme-btn" disabled={ghLoading} onClick={pushAllToGitHub}>
                  <Upload size={16} /> Push All {files.length} Files
                </button>
                <button className="primary-wide secondary-theme-btn" disabled={ghLoading} onClick={pullFromGitHub}>
                  <Download size={16} /> Pull from GitHub (Load Repo)
                </button>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>
                Tip: Create a fine-grained PAT with Contents: Read & Write. Pull fetches up to 40 files (recursive tree).
              </p>
            </section>
          )}

          {/* Live Share View */}
          {view === 'liveshare' && (
            <section className="full-view list-view">
              <div className="view-head">
                <div className="flex items-center gap-2">
                  <Radio size={16} className={liveShareConnected ? 'text-green-400 animate-pulse' : 'text-slate-400'} />
                  <b>Live Share Peer Collaboration</b>
                </div>
                <button className="pill-btn" onClick={() => setView('editor')}>
                  <X size={14} />
                </button>
              </div>

              <div className="git-card">
                <Users size={20} className="text-green-400" />
                <div>
                  <b>Broadcast Collaboration Room</b>
                  <p>Share this Room ID with another browser tab or window to live-sync code edits and workspace snapshots!</p>
                </div>
              </div>

              <div className="setting-input-block">
                <label>Collaboration Room ID</label>
                <div className="flex gap-2">
                  <input
                    value={liveShareId}
                    onChange={e => setLiveShareId(e.target.value)}
                    placeholder="room-101"
                  />
                  <button
                    className="action-btn"
                    aria-label="Copy collaboration room invite link"
                    title="Copy invite link"
                    onClick={async () => {
                      const link = `${window.location.origin}/?mode=ide&room=${encodeURIComponent(liveShareId)}`;
                      try {
                        await navigator.clipboard.writeText(link);
                        alert('Room invite link copied to clipboard!');
                      } catch {
                        prompt('Copy this collaboration room link:', link);
                      }
                    }}
                  >
                    <Share2 size={15} />
                  </button>
                </div>
              </div>

              <button
                className="primary-wide"
                style={{ background: liveShareConnected ? '#ef4444' : '#10b981' }}
                onClick={() => setLiveShareConnected(v => !v)}
              >
                <Radio size={16} /> {liveShareConnected ? 'Disconnect from Room' : 'Connect & Start Live Share'}
              </button>

              <div className="status-note">
                Status: <strong>{liveShareConnected ? '🟢 Connected (Syncing Edits)' : '⚪ Disconnected'}</strong> · Peers: {connectedPeers.length}
              </div>
            </section>
          )}

          {/* Full Runtime Preview View */}
          {view === 'preview' && (
            <section className="full-view">
              <div className="view-head">
                <div className="flex items-center gap-2">
                  <b>Runtime Preview</b>
                  <span className="runtime-dot">● active</span>
                </div>
                <div className="view-actions">
                  <button onClick={() => setPreviewKey(k => k + 1)}>
                    <RefreshCw size={15} /> Refresh
                  </button>
                  <button onClick={() => setView('editor')}>
                    <Code2 size={15} /> Editor
                  </button>
                </div>
              </div>
              <iframe key={`full-${previewKey}`} title="CodeForge Full Preview" sandbox="allow-scripts" srcDoc={preview} />
            </section>
          )}

          {/* AI Copilot View */}
          {view === 'ai' && (
            <section className="full-view list-view ai-view">
              <div className="view-head">
                <div className="flex items-center gap-2">
                  <Bot size={17} className="text-blue-400" />
                  <b>CodeForge AI Copilot</b>
                </div>
                <div className="view-actions">
                  <button onClick={() => setView('settings')}>
                    <Settings size={14} /> API Key
                  </button>
                  <button onClick={() => setView('editor')}>
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Quick Prompt Cards */}
              <div className="ai-chips">
                <button
                  onClick={() =>
                    sendAiRequest(
                      `Explain what the code in ${active.name} does step-by-step. Keep it concise and clear.`
                    )
                  }
                >
                  <Sparkles size={13} /> Explain Active File
                </button>
                <button
                  onClick={() =>
                    sendAiRequest(
                      `Find any bugs, syntax errors, or improvements in ${active.name} and provide the fixed code.`
                    )
                  }
                >
                  <Wand2 size={13} /> Find & Fix Bugs
                </button>
                <button
                  onClick={() =>
                    sendAiRequest(
                      `Refactor and optimize ${active.name} for better performance, readability, and modern best practices.`
                    )
                  }
                >
                  <Zap size={13} /> Refactor & Optimize
                </button>
              </div>

              {/* Chat Message Thread */}
              <div className="ai-chat-thread">
                {aiMessages.map((msg, idx) => (
                  <div key={idx} className={`ai-message ${msg.role}`}>
                    <div className="ai-avatar">
                      {msg.role === 'assistant' ? <Bot size={15} /> : <Code2 size={15} />}
                    </div>
                    <div className="ai-bubble">
                      <pre>{msg.content}</pre>
                      {msg.role === 'assistant' && msg.content.includes('```') && (
                        <button
                          className="copy-btn"
                          onClick={() => {
                            const match = msg.content.match(/```(?:\w+)?\n([\s\S]*?)```/);
                            if (match && match[1]) {
                              updateContent(match[1]);
                              setTerminal(prev => `${prev}\n✓ Applied AI generated code to ${active.name}`);
                            }
                          }}
                        >
                          <Copy size={13} /> Apply to {active.name}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="ai-message assistant loading">
                    <div className="ai-avatar">
                      <Bot size={15} />
                    </div>
                    <div className="ai-bubble">Thinking and generating code...</div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <form
                className="ai-input-form"
                onSubmit={e => {
                  e.preventDefault();
                  sendAiRequest(aiPrompt);
                }}
              >
                <input
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder={`Ask AI about ${active.name} or prompt a new feature...`}
                />
                <button type="submit" disabled={aiLoading || !aiPrompt.trim()}>
                  <Send size={15} />
                </button>
              </form>
            </section>
          )}

          {/* Extensions View */}
          {view === 'extensions' && (
            <section className="full-view list-view">
              <div className="view-head">
                <b>Extensions Market</b>
                <span>{extensions.filter(e => e.installed).length} installed</span>
              </div>
              {extensions.map(ext => (
                <div className="extension" key={ext.id}>
                  <div>
                    <b>{ext.name}</b>
                    <p>{ext.description}</p>
                  </div>
                  <button
                    onClick={() =>
                      setExtensions(prev =>
                        prev.map(e => (e.id === ext.id ? { ...e, installed: !e.installed } : e))
                      )
                    }
                  >
                    {ext.installed ? (
                      <>
                        <Check size={14} /> Installed
                      </>
                    ) : (
                      'Install'
                    )}
                  </button>
                </div>
              ))}
            </section>
          )}

          {/* Source Control View */}
          {view === 'git' && (
            <section className="full-view list-view">
              <div className="view-head">
                <b>Source Control (Git)</b>
                <div className="branch-picker">
                  <GitBranch size={14} />
                  <button onClick={() => checkout(branch === 'main' ? 'dev' : 'main')}>
                    {branch}
                    <ChevronDown size={13} />
                  </button>
                </div>
              </div>
              <div className="git-card">
                <Github size={18} />
                <div>
                  <b>Local & Remote Git Workspace</b>
                  <p>Track branches and commits offline, or push to GitHub in 1 click.</p>
                </div>
              </div>
              <textarea
                value={gitMessage}
                onChange={e => setGitMessage(e.target.value)}
                placeholder="Commit message (e.g. feat: add responsive symbol toolbar)"
              />
              <button className="primary-wide" onClick={commit}>
                <GitCommit size={16} /> Commit Changes Locally
              </button>
              <button className="primary-wide secondary-theme-btn" onClick={() => setView('github-sync')}>
                <Cloud size={16} /> Direct Push to GitHub Remote
              </button>
              <div className="status-note">
                {files.some(f => f.modified) ? '● Changes ready to commit' : '✓ Working tree clean'}
              </div>
              <h4>COMMIT HISTORY</h4>
              {gitHistory.map((x, i) => (
                <div className="commit" key={`${x}-${i}`}>
                  <GitCommit size={14} />
                  <span>{x}</span>
                  <small>{i === 0 ? 'latest' : `commit ${i + 1}`}</small>
                </div>
              ))}
            </section>
          )}

          {/* Settings View */}
          {view === 'settings' && (
            <section className="full-view list-view">
              <div className="view-head">
                <b>Settings & Customization</b>
              </div>

              <div className="setting-section-title">THEME & APPEARANCE</div>
              <div className="setting-row">
                <span>Color Theme</span>
                <select
                  className="select-dropdown"
                  value={theme}
                  onChange={e => setTheme(e.target.value as ThemeName)}
                >
                  <option value="codeforge">CodeForge (default)</option>
                  <option value="vs-dark">VS Code Dark</option>
                  <option value="light">VS Code Light</option>
                  <option value="dracula">Dracula</option>
                  <option value="one-dark-pro">One Dark Pro</option>
                  <option value="monokai">Monokai</option>
                  <option value="synthwave-84">Synthwave '84</option>
                </select>
              </div>

              <div className="setting-row">
                <span>Font Size</span>
                <div className="stepper">
                  <button onClick={() => setFontSize(v => Math.max(11, v - 1))}>−</button>
                  <b>{fontSize}px</b>
                  <button onClick={() => setFontSize(v => Math.min(22, v + 1))}>+</button>
                </div>
              </div>

              <div className="setting-row">
                <span>Word Wrap</span>
                <button className={`toggle ${wordWrap ? 'on' : ''}`} onClick={() => setWordWrap(v => !v)}>
                  {wordWrap ? 'On' : 'Off'}
                </button>
              </div>

              <div className="setting-row">
                <span>Sticky Scroll</span>
                <button className={`toggle ${stickyScroll ? 'on' : ''}`} onClick={() => setStickyScroll(v => !v)}>
                  {stickyScroll ? 'On' : 'Off'}
                </button>
              </div>

              <div className="setting-row">
                <span>Breadcrumbs Navigation</span>
                <button className={`toggle ${breadcrumbsEnabled ? 'on' : ''}`} onClick={() => setBreadcrumbsEnabled(v => !v)}>
                  {breadcrumbsEnabled ? 'On' : 'Off'}
                </button>
              </div>

              <div className="setting-section-title">PYTHON & RUNTIME ENGINE</div>
              <div className="setting-row">
                <span>Python 3.12 Engine</span>
                <b>Pyodide (In-Browser)</b>
              </div>

              <div className="setting-section-title">AI ASSISTANT CONFIGURATION</div>
              <div className="setting-row">
                <span>AI Provider</span>
                <select
                  className="select-dropdown"
                  value={aiProvider}
                  onChange={e => setAiProvider(e.target.value as AiProvider)}
                >
                  <option value="gemini">Google Gemini (Free API)</option>
                  <option value="openai">OpenAI / DeepSeek Compatible</option>
                </select>
              </div>

              <div className="setting-input-block">
                <label>API Key (Stored locally in your browser)</label>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={e => setAiApiKey(e.target.value)}
                  placeholder="AIzaSy... / sk-..."
                />
              </div>

              {aiProvider === 'openai' && (
                <div className="setting-input-block">
                  <label>Base URL Endpoint</label>
                  <input
                    value={aiCustomEndpoint}
                    onChange={e => setAiCustomEndpoint(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
              )}

              <div className="setting-section-title">SYSTEM & RUNTIME</div>
              <div className="setting-row">
                <span>Editor Engine</span>
                <b>Monaco Editor (VS Code)</b>
              </div>
              <div className="setting-row">
                <span>Storage</span>
                <b>IndexedDB / Offline PWA</b>
              </div>
              <div className="setting-row">
                <span>Diagnostics</span>
                <b>{diagnostics}</b>
              </div>

              <div className="shortcut-card">
                <Keyboard size={17} />
                <div>
                  <b>Quick Shortcuts</b>
                  <p>⌘/Ctrl+P Palette · ⌘/Ctrl+S Save · Esc Close</p>
                </div>
              </div>
            </section>
          )}

          {/* Bottom Terminal & Diagnostics Panel */}
          {panel && (
            <section className={`bottom-panel ${isPanelMaximized ? 'maximized' : ''}`}>
              <div className="panel-tabs">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto' }}>
                  <button
                    className={panelTab === 'problems' ? 'panel-active' : ''}
                    onClick={() => setPanelTab('problems')}
                  >
                    PROBLEMS{' '}
                    <span className="problems-tab-badge">
                      {errorCount > 0 && <span className="tab-error-count"><AlertCircle size={10} />{errorCount}</span>}
                      {warningCount > 0 && <span className="tab-warn-count"><AlertTriangle size={10} />{warningCount}</span>}
                      {errorCount === 0 && warningCount === 0 && <em>0</em>}
                    </span>
                  </button>
                  <button
                    className={panelTab === 'terminal' ? 'panel-active' : ''}
                    onClick={() => setPanelTab('terminal')}
                  >
                    TERMINAL
                  </button>
                  <button
                    className={panelTab === 'logs' ? 'panel-active' : ''}
                    onClick={() => {
                      setPanelTab('logs');
                      setTerminal(prev => `${prev}\n$ console clear`);
                    }}
                  >
                    LOGS <em>{consoleLogs.length}</em>
                  </button>
                  {plotImage && (
                    <button
                      className={panelTab === 'plot' ? 'panel-active' : ''}
                      onClick={() => setPanelTab('plot')}
                    >
                      PLOTS 📈
                    </button>
                  )}
                  {hasTerminalError && (
                    <button
                      className="fix-with-ai-btn"
                      title="Analyze & fix this error with AI"
                      onClick={() => {
                        setView('ai');
                        sendAiRequest(
                          `I got the following runtime error in ${active?.name || 'my code'}:\n\n\`\`\`\n${terminal.slice(-800)}\n\`\`\`\n\nPlease diagnose the root cause and provide the complete fixed code for ${active?.name || 'the file'}.`
                        );
                      }}
                    >
                      <Sparkles size={12} />
                      <span>Fix with AI</span>
                    </button>
                  )}
                </div>

                <div className="panel-controls">
                  <button
                    className="panel-control-btn"
                    title="Clear Output"
                    onClick={() => {
                      if (panelTab === 'terminal') runCommand('clear');
                      else if (panelTab === 'logs') setConsoleLogs([]);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    className="panel-control-btn"
                    title={isPanelMaximized ? 'Restore Panel Size' : 'Maximize Panel'}
                    onClick={() => setIsPanelMaximized(prev => !prev)}
                  >
                    {isPanelMaximized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                  <button
                    className="panel-control-btn"
                    title="Close Panel"
                    onClick={() => setPanel(false)}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {panelTab === 'problems' ? (
                <div className="problems-list">
                  {editorMarkers.length === 0 ? (
                    <div className="problems-empty">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>No problems have been detected in {active?.name || 'the active file'}.</span>
                    </div>
                  ) : (
                    editorMarkers.map((m, idx) => (
                      <div
                        key={idx}
                        className="problem-item"
                        onClick={() => {
                          if (editorRef.current) {
                            editorRef.current.revealPositionInCenter({ lineNumber: m.startLineNumber, column: m.startColumn });
                            editorRef.current.setPosition({ lineNumber: m.startLineNumber, column: m.startColumn });
                            editorRef.current.focus();
                          }
                        }}
                      >
                        {m.severity === 8 ? (
                          <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
                        ) : (
                          <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
                        )}
                        <span className="problem-msg">{m.message}</span>
                        <span className="problem-loc">[{m.startLineNumber}, {m.startColumn}]</span>
                      </div>
                    ))
                  )}
                </div>
              ) : panelTab === 'plot' && plotImage ? (
                <div className="plot-output-view">
                  <img src={plotImage} alt="Python Matplotlib Graphic Output" className="plot-image-render" />
                  <a
                    href={plotImage}
                    download="codeforge-plot.png"
                    className="plot-save-btn"
                  >
                    <Download size={13} /> Save Chart PNG
                  </a>
                </div>
              ) : (
                <>
                  <pre ref={terminalOutputRef} className="terminal-output">{terminal}</pre>

                  {/* Mobile Quick Terminal Toolbar */}
                  <div className="terminal-quick-toolbar">
                    <button
                      type="button"
                      className="term-tool-btn danger"
                      title="Interrupt / Cancel"
                      onClick={() => {
                        setTerminal(prev => `${prev}\n^C`);
                        setCommand('');
                      }}
                    >
                      Ctrl+C
                    </button>
                    <button
                      type="button"
                      className="term-tool-btn"
                      title="Clear terminal"
                      onClick={() => runCommand('clear')}
                    >
                      clear
                    </button>
                    <button
                      type="button"
                      className="term-tool-btn"
                      title="List files"
                      onClick={() => runCommand('ls')}
                    >
                      ls
                    </button>
                    <button
                      type="button"
                      className="term-tool-btn highlight"
                      title={`Run ${active?.name}`}
                      onClick={() => {
                        if (active) runCommand(`run "${active.path}"`);
                      }}
                    >
                      run {active?.name?.split('.').pop() || 'code'}
                    </button>
                    <button
                      type="button"
                      className="term-tool-btn"
                      title="Git status"
                      onClick={() => runCommand('git status')}
                    >
                      git status
                    </button>
                    <button
                      type="button"
                      className="term-tool-btn"
                      title="History Prev"
                      onClick={handleHistoryUp}
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      className="term-tool-btn"
                      title="History Next"
                      onClick={handleHistoryDown}
                    >
                      <ArrowDown size={12} />
                    </button>
                    {['|', '&', '~', '/', '$', '-', '--'].map(sym => (
                      <button
                        key={sym}
                        type="button"
                        className="term-tool-btn sym"
                        onClick={() => handleInsertTerminalSymbol(` ${sym} `)}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>

                  <form
                    className="terminal-input"
                    onSubmit={e => {
                      e.preventDefault();
                      runCommand(command);
                    }}
                  >
                    <span>{shellCwd ? `~/${shellCwd} $` : '~ $'}</span>
                    <input
                      value={command}
                      onChange={e => setCommand(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          handleHistoryUp();
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          handleHistoryDown();
                        }
                      }}
                      placeholder="help, ls, cd, cat, grep, python x.py, g++ x.cpp -o x && ./x"
                      autoCapitalize="off"
                      autoCorrect="off"
                    />
                  </form>
                </>
              )}
            </section>
          )}
        </main>
      </div>

      {/* Footer Status Bar */}
      <footer className="statusbar">
        <div className="status-left">
          {/* Git Branch Pill */}
          <button
            className="status-btn"
            title="Git Branch - Click to view Source Control"
            onClick={() => {
              setView('editor');
              setSidebarTab('git');
              setSidebar(true);
            }}
          >
            <GitBranch size={11} />
            <span>{branch}</span>
            <RotateCw size={10} className="status-sync-icon" />
          </button>

          {/* Diagnostics Error / Warning Counter */}
          <button
            className={`status-btn diagnostics-btn ${errorCount > 0 ? 'has-errors' : ''}`}
            title={`${errorCount} error(s), ${warningCount} warning(s) - Click to view problems`}
            onClick={() => {
              setPanelTab('problems');
              setPanel(true);
            }}
          >
            <span className="diag-pill error-pill">
              <AlertCircle size={11} /> {errorCount}
            </span>
            <span className="diag-pill warn-pill">
              <AlertTriangle size={11} /> {warningCount}
            </span>
          </button>

          {/* File Saved / Modified Indicator */}
          <span className="status-text saved-indicator" title={active?.modified ? 'File has unsaved changes' : 'All changes saved'}>
            <Check size={11} className={active?.modified ? 'text-amber-400' : 'text-emerald-400'} />
            <span className="hide-on-tiny-screen">{active?.modified ? 'Unsaved' : 'Saved'}</span>
          </span>
        </div>

        <div className="status-right">
          {/* Line & Column Coordinates (Go to Line) */}
          <button
            className="status-btn"
            title="Go to Line (Ctrl+G)"
            onClick={() => setShowGoToLine(true)}
          >
            Ln {currentCursor.line}, Col {currentCursor.column}
          </button>

          {/* Indentation Picker */}
          <button
            className="status-btn"
            title="Indentation Settings - Click to change"
            onClick={() => setShowIndentPicker(true)}
          >
            {indentSettings.insertSpaces ? `Spaces: ${indentSettings.tabSize}` : `Tab Size: ${indentSettings.tabSize}`}
          </button>

          {/* Encoding */}
          <span className="status-text hide-on-mobile" title="File Encoding">
            UTF-8
          </span>

          {/* Line Sequence Endings */}
          <button
            className="status-btn hide-on-tiny-screen"
            title={`Line Endings: ${lineEnding} - Click to toggle LF / CRLF`}
            onClick={toggleLineEnding}
          >
            {lineEnding}
          </button>

          {/* Language Mode Selector */}
          <button
            className="status-btn lang-btn"
            title="Select Language Mode - Click to change"
            onClick={() => setShowLanguagePicker(true)}
          >
            {AVAILABLE_LANGUAGES.find(l => l.id === active?.language)?.name || active?.language || 'Plain Text'}
          </button>

          {/* Terminal & Problems Toggle */}
          <button
            className={`status-btn ${panel ? 'active-panel-btn' : ''}`}
            title="Toggle Bottom Terminal & Problems Panel"
            onClick={() => setPanel(v => !v)}
          >
            <Terminal size={11} />
          </button>

          {/* AI Copilot Quick Button */}
          <button
            className="status-btn ai-status-btn"
            title="Open CodeForge AI Assistant"
            onClick={() => setView('ai')}
          >
            <Sparkles size={11} />
            <span className="hide-on-mobile">AI</span>
          </button>
        </div>
      </footer>

      {/* Mobile Tab Actions Sheet / Context Menu */}
      {(showTabActionsModal || showTabMenu) && (
        <div
          className="palette-backdrop"
          onMouseDown={() => {
            setShowTabActionsModal(false);
            setShowTabMenu(null);
          }}
        >
          <div
            className="palette modal-panel tab-options-modal"
            onMouseDown={e => e.stopPropagation()}
            style={{ maxWidth: 360 }}
          >
            <div className="view-head" style={{ marginBottom: 8 }}>
              <b>Tab & Workspace Options</b>
              <button
                className="pill-btn"
                onClick={() => {
                  setShowTabActionsModal(false);
                  setShowTabMenu(null);
                }}
              >
                <X size={14} />
              </button>
            </div>

            <div className="tab-menu-list">
              <button
                className="tab-menu-item"
                onClick={() => {
                  const targetId = showTabMenu?.id || activeId;
                  togglePinTab(targetId);
                  setShowTabActionsModal(false);
                  setShowTabMenu(null);
                }}
              >
                <Pin size={14} />
                <span>{pinnedTabs.includes(showTabMenu?.id || activeId) ? 'Unpin Active Tab' : 'Pin Active Tab'}</span>
              </button>

              <button
                className="tab-menu-item"
                onClick={() => {
                  const targetId = showTabMenu?.id || activeId;
                  closeTab(targetId);
                  setShowTabActionsModal(false);
                  setShowTabMenu(null);
                }}
              >
                <X size={14} />
                <span>Close Active Tab</span>
              </button>

              <button
                className="tab-menu-item"
                onClick={() => {
                  const targetId = showTabMenu?.id || activeId;
                  closeOtherTabs(targetId);
                  setShowTabActionsModal(false);
                  setShowTabMenu(null);
                }}
              >
                <Files size={14} />
                <span>Close Other Tabs</span>
              </button>

              <button
                className="tab-menu-item"
                onClick={() => {
                  const targetId = showTabMenu?.id || activeId;
                  closeTabsToTheRight(targetId);
                  setShowTabActionsModal(false);
                  setShowTabMenu(null);
                }}
              >
                <ArrowRightToLine size={14} />
                <span>Close Tabs to the Right</span>
              </button>

              <button
                className="tab-menu-item"
                onClick={() => {
                  closeSavedTabs();
                  setShowTabActionsModal(false);
                  setShowTabMenu(null);
                }}
              >
                <CheckCircle2 size={14} />
                <span>Close Saved Tabs</span>
              </button>

              <button
                className="tab-menu-item text-red"
                onClick={() => {
                  closeAllTabs();
                  setShowTabActionsModal(false);
                  setShowTabMenu(null);
                }}
              >
                <Trash2 size={14} />
                <span>Close All Tabs</span>
              </button>

              <div className="tab-menu-divider" />

              <button
                className="tab-menu-item"
                onClick={() => {
                  setSplitPreview(prev => !prev);
                  setShowTabActionsModal(false);
                  setShowTabMenu(null);
                }}
              >
                <Columns size={14} />
                <span>{splitPreview ? 'Hide Split Preview' : 'Show Live Split Preview'}</span>
              </button>

              <button
                className="tab-menu-item"
                onClick={() => {
                  navigator.clipboard.writeText(active?.path || active?.name || '');
                  setTerminal(prev => `${prev}\n✓ Copied path: ${active?.path || active?.name}`);
                  setShowTabActionsModal(false);
                  setShowTabMenu(null);
                }}
              >
                <Copy size={14} />
                <span>Copy File Path</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile File Context Sheet / Action Menu */}
      {showFileMenu && (
        <div
          className="palette-backdrop"
          onMouseDown={() => setShowFileMenu(null)}
        >
          <div
            className="palette modal-panel file-options-modal"
            onMouseDown={e => e.stopPropagation()}
            style={{ maxWidth: 360 }}
          >
            <div className="view-head" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {renderFileIcon(showFileMenu.name, 16)}
                <b>{showFileMenu.name}</b>
              </div>
              <button className="pill-btn" onClick={() => setShowFileMenu(null)}>
                <X size={14} />
              </button>
            </div>

            <div className="tab-menu-list">
              <button
                className="tab-menu-item"
                onClick={() => {
                  openFile(showFileMenu.id);
                  setShowFileMenu(null);
                }}
              >
                <FileCode2 size={14} />
                <span>Open in Editor</span>
              </button>

              <button
                className="tab-menu-item"
                onClick={() => {
                  openFile(showFileMenu.id);
                  setSplitPreview(true);
                  setShowFileMenu(null);
                }}
              >
                <Columns size={14} />
                <span>Open with Live Split Preview</span>
              </button>

              <button
                className="tab-menu-item"
                onClick={() => {
                  setRenameId(showFileMenu.id);
                  setShowFileMenu(null);
                }}
              >
                <Pencil size={14} />
                <span>Rename File</span>
              </button>

              <button
                className="tab-menu-item"
                onClick={() => {
                  const copy = {
                    ...showFileMenu,
                    id: crypto.randomUUID(),
                    name: `${showFileMenu.name}.copy`,
                    path: `${showFileMenu.path}.copy`,
                    modified: true
                  };
                  setFiles(prev => [...prev, copy]);
                  openFile(copy.id);
                  setShowFileMenu(null);
                }}
              >
                <Copy size={14} />
                <span>Duplicate File</span>
              </button>

              <button
                className="tab-menu-item"
                onClick={() => {
                  saveFile(showFileMenu.content, showFileMenu.name);
                  setTerminal(prev => `${prev}\n✓ Downloaded file: ${showFileMenu.name}`);
                  setShowFileMenu(null);
                }}
              >
                <Download size={14} />
                <span>Download File</span>
              </button>

              <button
                className="tab-menu-item"
                onClick={() => {
                  navigator.clipboard.writeText(showFileMenu.path);
                  setTerminal(prev => `${prev}\n✓ Copied path: ${showFileMenu.path}`);
                  setShowFileMenu(null);
                }}
              >
                <Copy size={14} />
                <span>Copy Path ({showFileMenu.path})</span>
              </button>

              <div className="tab-menu-divider" />

              <button
                className="tab-menu-item text-red"
                onClick={() => {
                  const targetId = showFileMenu.id;
                  setShowFileMenu(null);
                  deleteFile(targetId);
                }}
              >
                <Trash2 size={14} />
                <span>Delete File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Diff Viewer Modal (Original vs Working Tree) */}
      {diffTarget && (
        <div className="palette-backdrop" onMouseDown={() => setDiffTarget(null)}>
          <div
            className="palette modal-panel diff-viewer-panel"
            onMouseDown={e => e.stopPropagation()}
            style={{ width: 'min(920px, calc(100vw - 16px))', height: '80vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="view-head" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color, #27313f)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <GitCompare size={15} className="text-blue-400 flex-shrink-0" />
                <b style={{ whiteSpace: 'nowrap' }}>Diff: {diffTarget.name}</b>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  (Saved ↔ Modified)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  className="pill-btn"
                  title="Toggle Inline / Side-by-side Diff"
                  onClick={() => setDiffSideBySide(prev => !prev)}
                >
                  <Columns size={12} />
                  <span>{diffSideBySide ? 'Inline Diff' : 'Side-by-Side'}</span>
                </button>
                <button
                  type="button"
                  className="pill-btn text-red"
                  title="Discard changes and revert to saved"
                  onClick={() => {
                    discardFileChanges(diffTarget.id);
                    setDiffTarget(null);
                  }}
                >
                  <Undo2 size={12} />
                  <span>Revert</span>
                </button>
                <button
                  type="button"
                  className="pill-btn"
                  onClick={() => setDiffTarget(null)}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <DiffEditor
                height="100%"
                theme={theme}
                beforeMount={defineEditorThemes}
                language={diffTarget.language}
                original={savedSnapshots[diffTarget.id] || ''}
                modified={diffTarget.content}
                options={{
                  renderSideBySide: diffSideBySide,
                  readOnly: false,
                  automaticLayout: true,
                  fontSize: 12,
                  lineNumbersMinChars: 3,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Find & Replace Modal */}
      {showFindReplace && (
        <div className="palette-backdrop" onMouseDown={() => setShowFindReplace(false)}>
          <div className="palette find-replace-panel" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="view-head" style={{ marginBottom: 12 }}>
              <b>Find & Replace</b>
              <button className="pill-btn" onClick={() => setShowFindReplace(false)}><X size={14} /></button>
            </div>
            <div className="setting-input-block">
              <label>Find</label>
              <input
                autoFocus
                value={findQuery}
                onChange={e => setFindQuery(e.target.value)}
                placeholder="Search text..."
                onKeyDown={e => e.key === 'Enter' && doFindReplace(false)}
              />
            </div>
            <div className="setting-input-block">
              <label>Replace with</label>
              <input
                value={replaceQuery}
                onChange={e => setReplaceQuery(e.target.value)}
                placeholder="Replacement text..."
                onKeyDown={e => e.key === 'Enter' && doFindReplace(true)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="primary-wide" onClick={() => doFindReplace(false)}>Find Next</button>
              <button className="primary-wide secondary-theme-btn" onClick={() => doFindReplace(true)}>Replace All</button>
            </div>
          </div>
        </div>
      )}

      {/* Select Language Mode Modal */}
      {showLanguagePicker && (
        <div className="palette-backdrop" onMouseDown={() => setShowLanguagePicker(false)}>
          <div className="palette modal-panel" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="view-head" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Code2 size={18} color="var(--cf-accent-mid, #3b82f6)" />
                <b>Select Language Mode</b>
              </div>
              <button className="pill-btn" onClick={() => setShowLanguagePicker(false)}><X size={14} /></button>
            </div>

            <div className="setting-input-block" style={{ marginBottom: 12 }}>
              <input
                autoFocus
                value={langSearchQuery}
                onChange={e => setLangSearchQuery(e.target.value)}
                placeholder="Search languages (e.g. python, typescript, html)..."
              />
            </div>

            <div className="language-list-scroll">
              {AVAILABLE_LANGUAGES.filter(l =>
                l.name.toLowerCase().includes(langSearchQuery.toLowerCase()) ||
                l.id.toLowerCase().includes(langSearchQuery.toLowerCase())
              ).map(lang => (
                <button
                  key={lang.id}
                  className={`language-select-item ${active?.language === lang.id ? 'active-lang' : ''}`}
                  onClick={() => handleSetLanguageMode(lang.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="lang-item-name">{lang.name}</span>
                    <span className="lang-item-ext">{lang.ext}</span>
                  </div>
                  {active?.language === lang.id && <Check size={14} className="text-blue-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Indentation Settings Modal */}
      {showIndentPicker && (
        <div className="palette-backdrop" onMouseDown={() => setShowIndentPicker(false)}>
          <div className="palette modal-panel" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="view-head" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Indent size={18} color="#8b5cf6" />
                <b>Indentation & Formatting</b>
              </div>
              <button className="pill-btn" onClick={() => setShowIndentPicker(false)}><X size={14} /></button>
            </div>

            <div className="indent-options-list">
              <button
                className={`language-select-item ${indentSettings.insertSpaces && indentSettings.tabSize === 2 ? 'active-lang' : ''}`}
                onClick={() => applyIndentation(2, true)}
              >
                <div>
                  <div className="lang-item-name">Indent Using Spaces (2)</div>
                  <small style={{ color: 'var(--text-muted)' }}>Standard for HTML, JavaScript, TypeScript, React</small>
                </div>
                {indentSettings.insertSpaces && indentSettings.tabSize === 2 && <Check size={14} className="text-blue-400" />}
              </button>

              <button
                className={`language-select-item ${indentSettings.insertSpaces && indentSettings.tabSize === 4 ? 'active-lang' : ''}`}
                onClick={() => applyIndentation(4, true)}
              >
                <div>
                  <div className="lang-item-name">Indent Using Spaces (4)</div>
                  <small style={{ color: 'var(--text-muted)' }}>Standard for Python, C++, Java, Rust</small>
                </div>
                {indentSettings.insertSpaces && indentSettings.tabSize === 4 && <Check size={14} className="text-blue-400" />}
              </button>

              <button
                className={`language-select-item ${!indentSettings.insertSpaces && indentSettings.tabSize === 2 ? 'active-lang' : ''}`}
                onClick={() => applyIndentation(2, false)}
              >
                <div>
                  <div className="lang-item-name">Indent Using Tabs (Tab Size: 2)</div>
                  <small style={{ color: 'var(--text-muted)' }}>Hard tab indentation</small>
                </div>
                {!indentSettings.insertSpaces && indentSettings.tabSize === 2 && <Check size={14} className="text-blue-400" />}
              </button>

              <button
                className={`language-select-item ${!indentSettings.insertSpaces && indentSettings.tabSize === 4 ? 'active-lang' : ''}`}
                onClick={() => applyIndentation(4, false)}
              >
                <div>
                  <div className="lang-item-name">Indent Using Tabs (Tab Size: 4)</div>
                  <small style={{ color: 'var(--text-muted)' }}>Hard tab indentation</small>
                </div>
                {!indentSettings.insertSpaces && indentSettings.tabSize === 4 && <Check size={14} className="text-blue-400" />}
              </button>

              <div className="symbol-divider" style={{ width: '100%', height: 1, margin: '8px 0' }} />

              <button
                className="language-select-item format-action-btn"
                onClick={handleFormatDocument}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={15} className="text-indigo-400" />
                  <span className="lang-item-name">Format Document</span>
                </div>
                <small style={{ color: 'var(--text-muted)' }}>Alt+Shift+F</small>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Go to Line Modal */}
      {showGoToLine && (
        <div className="palette-backdrop" onMouseDown={() => setShowGoToLine(false)}>
          <div className="palette modal-panel" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className="view-head" style={{ marginBottom: 12 }}>
              <b>Go to Line</b>
              <button className="pill-btn" onClick={() => setShowGoToLine(false)}><X size={14} /></button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleGoToLineSubmit();
              }}
            >
              <div className="setting-input-block" style={{ marginBottom: 12 }}>
                <label>Line Number</label>
                <input
                  autoFocus
                  type="number"
                  min="1"
                  value={goToLineInput}
                  onChange={e => setGoToLineInput(e.target.value)}
                  placeholder="e.g. 25"
                />
              </div>
              <button type="submit" className="primary-wide">
                Jump to Line
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create New File Modal */}
      {showNewFileModal && (
        <div className="palette-backdrop" onMouseDown={() => setShowNewFileModal(false)}>
          <div className="palette modal-panel" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="view-head" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FilePlus2 size={18} color="var(--cf-accent-mid, #3b82f6)" />
                <b>Create New File</b>
              </div>
              <button className="pill-btn" onClick={() => setShowNewFileModal(false)}><X size={14} /></button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleCreateFileSubmit();
              }}
            >
              <div className="setting-input-block" style={{ marginBottom: 12 }}>
                <label>File Name with Extension</label>
                <input
                  autoFocus
                  value={newFileInputValue}
                  onChange={e => setNewFileInputValue(e.target.value)}
                  placeholder="e.g. main.py, index.html, script.js, style.css, App.tsx"
                />
              </div>

              {/* Real-time Language Detection Preview */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Language Mode:</span>
                <span className="lang-preview-badge">
                  {newFileInputValue.trim() ? languageFor(newFileInputValue) : 'javascript (default)'}
                </span>
              </div>

              {/* Quick Extension Presets */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Quick Language Extensions:</div>
                <div className="quick-ext-chips">
                  {[
                    { ext: '.py', name: 'Python' },
                    { ext: '.js', name: 'JavaScript' },
                    { ext: '.ts', name: 'TypeScript' },
                    { ext: '.html', name: 'HTML5' },
                    { ext: '.css', name: 'CSS3' },
                    { ext: '.cpp', name: 'C++' },
                    { ext: '.c', name: 'C' },
                    { ext: '.java', name: 'Java' },
                    { ext: '.json', name: 'JSON' },
                    { ext: '.md', name: 'Markdown' },
                    { ext: '.sql', name: 'SQL' },
                  ].map(chip => (
                    <button
                      key={chip.ext}
                      type="button"
                      className="ext-chip"
                      onClick={() => {
                        const current = newFileInputValue.trim();
                        if (!current) {
                          setNewFileInputValue(`main${chip.ext}`);
                        } else if (current.includes('.')) {
                          const base = current.replace(/\.[^/.]+$/, '');
                          setNewFileInputValue(`${base}${chip.ext}`);
                        } else {
                          setNewFileInputValue(`${current}${chip.ext}`);
                        }
                      }}
                    >
                      {chip.ext} <small>({chip.name})</small>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  type="button"
                  className="pill-btn"
                  onClick={() => setShowNewFileModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-wide"
                  style={{ width: 'auto', padding: '8px 22px' }}
                >
                  Create File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Import Project & Files Modal */}
      {showImportModal && (
        <div className="palette-backdrop" onMouseDown={() => setShowImportModal(false)}>
          <div
            className="palette modal-panel"
            onMouseDown={e => e.stopPropagation()}
            style={{ maxWidth: 540 }}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={async e => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const fakeEvent = { target: { files: e.dataTransfer.files, value: '' } } as any;
                handleMultiFilesUpload(fakeEvent);
              }
            }}
          >
            <div className="view-head" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={18} color="#3b82f6" />
                <b>Import Project & Code Files</b>
              </div>
              <button className="pill-btn" onClick={() => setShowImportModal(false)}><X size={14} /></button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Choose how you want to load files or projects into your workspace:
            </p>

            <div className="import-grid">
              {/* Option 1: Folder / Directory */}
              <div
                className="import-card"
                onClick={() => folderInputRef.current?.click()}
              >
                <div className="import-icon-badge folder">
                  <FolderOpen size={22} />
                </div>
                <div className="import-card-text">
                  <h4>Import Entire Folder</h4>
                  <p>Upload a whole directory with all its files & folders (e.g. conditional_statement, react-app, etc.).</p>
                </div>
                <button className="pill-btn highlight-btn" type="button">Select Folder</button>
              </div>

              {/* Option 2: Multiple Files */}
              <div
                className="import-card"
                onClick={() => multiFileInputRef.current?.click()}
              >
                <div className="import-icon-badge file">
                  <FileCode2 size={22} />
                </div>
                <div className="import-card-text">
                  <h4>Import Code Files</h4>
                  <p>Select any code files (.py, .js, .cpp, .html, .css, .java, etc.) simultaneously.</p>
                </div>
                <button className="pill-btn highlight-btn" type="button">Select Files</button>
              </div>

              {/* Option 3: ZIP Archive */}
              <div
                className="import-card"
                onClick={() => zipFileInputRef.current?.click()}
              >
                <div className="import-icon-badge zip">
                  <Archive size={22} />
                </div>
                <div className="import-card-text">
                  <h4>Import .ZIP Archive</h4>
                  <p>Extract and unpack full repositories or zipped code packages directly.</p>
                </div>
                <button className="pill-btn highlight-btn" type="button">Select .ZIP</button>
              </div>
            </div>

            <div className={`dropzone-box ${isDragOver ? 'active' : ''}`}>
              <Upload size={16} />
              <span>Or Drag & Drop your code files, folders, or ZIP archives right here</span>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click Instant Share Project Modal */}
      {showShareModal && (
        <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal-card" onClick={e => e.stopPropagation()}>
            <div className="share-modal-head">
              <h3>
                <Share2 size={18} />
                <span>Share CodeForge Project</span>
              </h3>
              <button className="pill-btn" onClick={() => setShowShareModal(false)}>
                <X size={14} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              Anyone with this link can instantly open and run your {files.length} project files in their browser with 0 installation required!
            </p>
            <div className="share-url-box">
              <input
                readOnly
                value={`${window.location.origin}${window.location.pathname}#share=${encodeURIComponent(
                  btoa(unescape(encodeURIComponent(JSON.stringify(files))))
                )}`}
              />
              <button
                className="share-copy-btn"
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}#share=${encodeURIComponent(
                    btoa(unescape(encodeURIComponent(JSON.stringify(files))))
                  )}`;
                  navigator.clipboard?.writeText(url).catch(() => {});
                  setCopiedShare(true);
                  setTimeout(() => setCopiedShare(false), 2500);
                }}
              >
                {copiedShare ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedShare ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette Modal */}
      {palette && (
        <div className="palette-backdrop" onMouseDown={() => setPalette(false)}>
          <div className="palette vs-command-palette" onMouseDown={e => e.stopPropagation()}>
            <div className="palette-header">
              <span className="palette-prefix">&gt;</span>
              <input
                autoFocus
                value={paletteSearchQuery}
                placeholder="Type a command or filter by category..."
                onChange={e => {
                  setPaletteSearchQuery(e.target.value);
                  setPaletteActiveIndex(0);
                }}
                onKeyDown={handlePaletteKeyDown}
              />
              {paletteSearchQuery && (
                <button
                  type="button"
                  className="palette-clear-btn"
                  onClick={() => {
                    setPaletteSearchQuery('');
                    setPaletteActiveIndex(0);
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Mobile Category Filter Chips */}
            <div className="palette-filter-bar">
              {(['all', 'file', 'edit', 'view', 'preferences', 'run', 'git'] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`palette-cat-chip ${paletteCategoryFilter === cat ? 'active' : ''}`}
                  onClick={() => {
                    setPaletteCategoryFilter(cat);
                    setPaletteActiveIndex(0);
                  }}
                >
                  {cat === 'all' ? 'All Commands' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            {/* Filtered Command List */}
            <div className="palette-list" role="listbox">
              {filteredPaletteCommands.length === 0 ? (
                <div className="palette-empty">
                  <AlertCircle size={20} />
                  <span>No matching commands found</span>
                </div>
              ) : (
                filteredPaletteCommands.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const isSelected = idx === paletteActiveIndex;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      className={`palette-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => executeCommandItem(cmd)}
                      onMouseEnter={() => setPaletteActiveIndex(idx)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="palette-item-left">
                        <span className="palette-item-icon">
                          <Icon size={15} />
                        </span>
                        <span className="palette-item-category">{cmd.category}:</span>
                        <span className="palette-item-title">{cmd.title.replace(/^[^:]+:\s*/, '')}</span>
                      </div>
                      {cmd.shortcut && (
                        <kbd className="palette-item-kbd">{cmd.shortcut}</kbd>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
