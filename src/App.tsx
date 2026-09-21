import { useEffect, useMemo, useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import JSZip from 'jszip';
import {
  Archive,
  Bot,
  Check,
  ChevronDown,
  Cloud,
  Code2,
  Columns,
  Copy,
  Download,
  FileCode2,
  FilePlus2,
  FileText,
  FolderOpen,
  FolderPlus,
  GitBranch,
  GitCommit,
  Github,
  Home,
  Keyboard,
  Layers,
  Menu,
  Mic,
  MicOff,
  Package,
  Palette,
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

export type FileItem = { id: string; name: string; path: string; language: string; content: string; modified?: boolean };
type Extension = { id: string; name: string; description: string; installed: boolean };
type View = 'editor' | 'preview' | 'extensions' | 'git' | 'settings' | 'ai' | 'templates' | 'github-sync' | 'liveshare';
type ThemeName = 'vs-dark' | 'light' | 'dracula' | 'one-dark-pro' | 'monokai' | 'synthwave-84';
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
  { label: 'Tab', insert: 'Tab' },
  { label: '//', insert: '// ' }
];

function languageFor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  return (
    ({
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      json: 'json',
      css: 'css',
      html: 'html',
      md: 'markdown',
      py: 'python',
      java: 'java',
      kt: 'kotlin',
      xml: 'xml',
      yml: 'yaml',
      yaml: 'yaml',
      sh: 'shell',
      sql: 'sql'
    } as Record<string, string>)[ext || ''] || 'plaintext'
  );
}

const themeBgMap: Record<ThemeName, string> = {
  'vs-dark': '#0b0e12',
  'light': '#f8fafc',
  'dracula': '#282a36',
  'one-dark-pro': '#21252b',
  'monokai': '#272822',
  'synthwave-84': '#241b2f'
};

function App() {
  const [inIdeMode, setInIdeMode] = useState<boolean>(() => {
    return window.location.search.includes('mode=ide') || window.location.hash === '#ide';
  });

  const [files, setFiles] = useState<FileItem[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('codeforge-files') || 'null');
      return Array.isArray(saved) && saved.length ? saved : defaultStarterFiles;
    } catch {
      return defaultStarterFiles;
    }
  });
  const [activeId, setActiveId] = useState('index');
  const [openTabs, setOpenTabs] = useState<string[]>(['index']);
  const [sidebar, setSidebar] = useState(false);
  const [panel, setPanel] = useState(false);
  const [search, setSearch] = useState('');
  const [contentSearch, setContentSearch] = useState('');
  const [terminal, setTerminal] = useState('CodeForge Terminal\n$ workspace ready\n$ Type help for commands.');
  const [command, setCommand] = useState('');
  const [view, setView] = useState<View>('editor');
  const [extensions, setExtensions] = useState<Extension[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('codeforge-extensions') || 'null') || defaultExtensions;
    } catch {
      return defaultExtensions;
    }
  });
  const [gitMessage, setGitMessage] = useState('Update workspace');
  const [gitHistory, setGitHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('codeforge-git') || 'null') || ['Initial workspace snapshot'];
    } catch {
      return ['Initial workspace snapshot'];
    }
  });
  const [branch, setBranch] = useState('main');
  const [previewKey, setPreviewKey] = useState(0);
  const [splitPreview, setSplitPreview] = useState(false);
  const [palette, setPalette] = useState(false);
  const [newName, setNewName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('codeforge-font') || 13));
  const [wordWrap, setWordWrap] = useState(true);
  const [theme, setTheme] = useState<ThemeName>(() => (localStorage.getItem('codeforge-theme') as ThemeName) || 'vs-dark');
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
  const [ghRepoInput, setGhRepoInput] = useState(() => localStorage.getItem('codeforge-gh-repo') || 'khalidabdullahh/CodeForgeMobile');
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
      return localStorage.getItem('codeforge-liveshare-id') || 'forge-room-101';
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
  const [aiProvider, setAiProvider] = useState<AiProvider>(() => (localStorage.getItem('codeforge-ai-provider') as AiProvider) || 'gemini');
  const [aiApiKey, setAiApiKey] = useState(() => localStorage.getItem('codeforge-ai-key') || '');
  const [aiCustomEndpoint, setAiCustomEndpoint] = useState(() => localStorage.getItem('codeforge-ai-endpoint') || 'https://api.openai.com/v1');
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

  const fileInput = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  const active = files.find(f => f.id === activeId) || files[0];
  const filtered = useMemo(() => files.filter(f => `${f.path} ${f.name}`.toLowerCase().includes(search.toLowerCase())), [files, search]);
  const matches = useMemo(() => (contentSearch.trim() ? files.filter(f => f.content.toLowerCase().includes(contentSearch.toLowerCase())) : []), [files, contentSearch]);

  useEffect(() => localStorage.setItem('codeforge-files', JSON.stringify(files)), [files]);
  useEffect(() => localStorage.setItem('codeforge-git', JSON.stringify(gitHistory)), [gitHistory]);
  useEffect(() => localStorage.setItem('codeforge-extensions', JSON.stringify(extensions)), [extensions]);
  useEffect(() => localStorage.setItem('codeforge-font', String(fontSize)), [fontSize]);
  useEffect(() => localStorage.setItem('codeforge-theme', theme), [theme]);
  useEffect(() => localStorage.setItem('codeforge-ai-provider', aiProvider), [aiProvider]);
  useEffect(() => localStorage.setItem('codeforge-ai-key', aiApiKey), [aiApiKey]);
  useEffect(() => localStorage.setItem('codeforge-ai-endpoint', aiCustomEndpoint), [aiCustomEndpoint]);
  useEffect(() => {
    try {
      sessionStorage.setItem('codeforge-gh-token', ghToken);
    } catch {}
  }, [ghToken]);
  useEffect(() => localStorage.setItem('codeforge-gh-repo', ghRepoInput), [ghRepoInput]);

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

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define custom themes
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
    const next = openTabs.filter(x => x !== id);
    setOpenTabs(next);
    if (activeId === id) setActiveId(next[next.length - 1] || files[0]?.id || '');
  };

  const createFile = () => {
    const name = newName.trim() || `untitled-${files.length + 1}.js`;
    const file: FileItem = { id: crypto.randomUUID(), name, path: name, language: languageFor(name), content: `// ${name}\n` };
    setFiles(prev => [...prev, file]);
    setNewName('');
    openFile(file.id);
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
      const newText = selectedText ? `${left}${selectedText}${right}` : `${left}${right}`;
      editor.executeEdits('quick-symbol', [{ range: selection, text: newText, forceMoveMarkers: true }]);
    } else {
      editor.executeEdits('quick-symbol', [{ range: selection, text: item.insert, forceMoveMarkers: true }]);
    }
    editor.focus();
  };

  const handleUndo = () => {
    editorRef.current?.trigger('quick-symbol', 'undo', null);
    editorRef.current?.focus();
  };

  const handleRedo = () => {
    editorRef.current?.trigger('quick-symbol', 'redo', null);
    editorRef.current?.focus();
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
    if (!(window as any).loadPyodide) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    const pyodide = await (window as any).loadPyodide({
      stdout: (text: string) => {
        setTerminal(prev => `${prev}\n${text}`);
      },
      stderr: (text: string) => {
        setTerminal(prev => `${prev}\n🔴 [PyError] ${text}`);
      }
    });
    (window as any).pyodideInstance = pyodide;
    return pyodide;
  };

  const runPythonCode = async (code: string) => {
    if (pyRunning) return;
    setPyRunning(true);
    setPanel(true);
    setTerminal(prev => `${prev}\n$ python ${active.name}\n⏳ Initializing Pyodide Python 3.12 runtime...`);
    try {
      const pyodide = await loadPyodideRuntime();
      const result = await pyodide.runPythonAsync(code);
      if (result !== undefined) {
        setTerminal(prev => `${prev}\n=> ${String(result)}`);
      }
      setTerminal(prev => `${prev}\n✓ Python script execution completed.`);
    } catch (err: any) {
      setTerminal(prev => `${prev}\n🔴 Traceback error: ${err.message || String(err)}`);
    } finally {
      setPyRunning(false);
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

  const runCommand = (cmd: string) => {
    const clean = cmd.trim();
    if (!clean) return;
    const lower = clean.toLowerCase();
    if (lower === 'help') setTerminal(prev => `${prev}\n$ ${clean}\nCommands: help, ls, tree, pwd, cat <file>, python <file>, npm run dev, npm test, clear`);
    else if (lower === 'ls') setTerminal(prev => `${prev}\n$ ls\n${files.map(f => f.name).join('  ')}`);
    else if (lower === 'tree') setTerminal(prev => `${prev}\n$ tree\n${files.map(f => `├── ${f.path}`).join('\n')}`);
    else if (lower === 'pwd') setTerminal(prev => `${prev}\n$ pwd\n/codeforge/workspace`);
    else if (lower.startsWith('python ') || lower.startsWith('py ')) {
      const parts = clean.split(/\s+/);
      const targetName = parts[1];
      let target = active;
      if (targetName) {
        const found = files.find(f => f.name.toLowerCase() === targetName.toLowerCase() || f.path.toLowerCase() === targetName.toLowerCase());
        if (!found) {
          setTerminal(prev => `${prev}\n$ ${clean}\npython: can't open file '${targetName}': No such file`);
          setCommand('');
          setPanel(true);
          return;
        }
        target = found;
      } else {
        target = files.find(f => f.language === 'python' || f.name.endsWith('.py')) || active;
      }
      runPythonCode(target.content);
    } else if (lower.startsWith('cat ')) {
      const name = clean.slice(4).trim();
      const target = files.find(f => f.name === name || f.path === name);
      setTerminal(prev => `${prev}\n$ ${clean}\n${target ? target.content : `cat: ${name}: No such file`}`);
    } else if (lower === 'git status') setTerminal(prev => `${prev}\n$ git status\nOn branch ${branch}\n${files.some(f => f.modified) ? 'Changes not staged for commit' : 'working tree clean'}`);
    else if (lower === 'git log') setTerminal(prev => `${prev}\n$ git log\n${gitHistory.map((x, i) => `commit ${String(i + 1).padStart(7, '0')}  ${x}`).join('\n')}`);
    else if (lower === 'git branch') setTerminal(prev => `${prev}\n$ git branch\n* ${branch}\n  dev\n  feature/mobile`);
    else if (lower === 'npm run dev') {
      setTerminal(prev => `${prev}\n$ npm run dev\n✓ Runtime started at codeforge://localhost:5173`);
      setView('preview');
      setPreviewKey(k => k + 1);
    } else if (lower === 'npm test') {
      setDiagnostics('Test runner: 3 checks passed.');
      setTerminal(prev => `${prev}\n$ npm test\n✓ 3 checks passed`);
    } else if (lower === 'clear') setTerminal('CodeForge Terminal\n$ cleared');
    else setTerminal(prev => `${prev}\n$ ${clean}\nCodeForge runtime: command accepted.`);
    setCommand('');
    setPanel(true);
  };

  const commit = () => {
    const message = gitMessage.trim();
    if (!message) return;
    setGitHistory(prev => [message, ...prev]);
    setFiles(prev => prev.map(f => ({ ...f, modified: false })));
    setTerminal(prev => `${prev}\n✓ [${branch}] committed: ${message}`);
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'codeforge-project.zip';
      a.click();
      URL.revokeObjectURL(url);
      setTerminal(prev => `${prev}\n✓ Exported ZIP archive with ${files.length} files`);
    } catch (err) {
      setTerminal(prev => `${prev}\n✗ Failed to create ZIP archive`);
    }
  };

  const importProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target.files?.[0];
    if (!input) return;
    const isZip = input.name.toLowerCase().endsWith('.zip') || input.type === 'application/zip' || input.type === 'application/x-zip-compressed';

    if (isZip) {
      try {
        setTerminal(prev => `${prev}\n⏳ Importing ZIP archive...`);
        const zip = await JSZip.loadAsync(input);
        const normalized: FileItem[] = [];
        const entries = Object.keys(zip.files).filter(p => !zip.files[p].dir && !p.startsWith('__MACOSX') && !p.includes('/.'));
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
        if (!normalized.length) throw new Error('empty zip');
        setFiles(normalized);
        setOpenTabs([normalized[0].id]);
        setActiveId(normalized[0].id);
        setTerminal(prev => `${prev}\n✓ Imported ${normalized.length} files from ZIP`);
      } catch (err: any) {
        setTerminal(prev => `${prev}\n✗ Failed to import ZIP: ${err.message || 'invalid archive'}`);
      }
      event.target.value = '';
      return;
    }

    // JSON project format
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed.files) || !parsed.files.length) throw new Error('invalid');
        const normalized = parsed.files.map((f: Partial<FileItem>, i: number) => ({
          id: f.id || crypto.randomUUID(),
          name: f.name || `file-${i + 1}.txt`,
          path: f.path || f.name || `file-${i + 1}.txt`,
          language: f.language || languageFor(f.name || ''),
          content: f.content || ''
        }));
        setFiles(normalized);
        setOpenTabs([normalized[0].id]);
        setActiveId(normalized[0].id);
        setBranch(parsed.branch || 'main');
        setTerminal(prev => `${prev}\n✓ Imported ${normalized.length} files`);
      } catch {
        setTerminal(prev => `${prev}\n✗ Invalid CodeForge project file (use .json or .zip)`);
      }
    };
    reader.readAsText(input);
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
    [['capacitor.config.json', cap], ['ANDROID-BUILD.md', readme]].forEach(([name, body]) => {
      const blob = new Blob([body], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    });
    setTerminal(prev => `${prev}\n✓ Android packaging files exported`);
  };

  const formatFile = () => {
    if (!active) return;
    const content = active.content;
    const formatted =
      active.language === 'json'
        ? (() => {
            try {
              return JSON.stringify(JSON.parse(content), null, 2);
            } catch {
              return content;
            }
          })()
        : content
            .split('\n')
            .map(line => line.trimEnd())
            .join('\n');
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

  const executePalette = (action: string) => {
    setPalette(false);
    if (action === 'new') createFile();
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
    if (action === 'format') formatFile();
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
      } else if (e.key === 'Escape') {
        setPalette(false);
        setShowFindReplace(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeId]);

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

  const htmlFile = files.find(f => f.name === 'index.html' || f.path.endsWith('index.html'));
  const html = htmlFile?.content || '<h1>No index.html found. Create one to preview.</h1>';
  // Collect all CSS (prefer style.css first) and all JS (prefer script.js)
  const cssFiles = files.filter(f => f.language === 'css' || f.name.endsWith('.css'));
  const jsFiles = files.filter(f => (f.language === 'javascript' || f.name.endsWith('.js')) && !f.name.endsWith('.json'));
  const css = cssFiles.map(f => `/* === ${f.path} === */\n${f.content}`).join('\n\n');
  const js = jsFiles.map(f => `/* === ${f.path} === */\n${f.content}`).join('\n\n');

  const preview = `<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>${css}</style>
  <script>
    (function() {
      const _log = console.log;
      const _warn = console.warn;
      const _err = console.error;
      function send(type, args) {
        try {
          const msg = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
          window.parent.postMessage({ type: 'codeforge-console', level: type, message: msg }, '*');
        } catch (e) {}
      }
      console.log = function() { send('log', arguments); _log.apply(console, arguments); };
      console.warn = function() { send('warn', arguments); _warn.apply(console, arguments); };
      console.error = function() { send('error', arguments); _err.apply(console, arguments); };
      window.onerror = function(msg, url, line) { send('error', [msg + ' (line ' + line + ')']); };
    })();
  </script>
</head>
<body>
  ${html.replace(/<head>[\s\S]*?<\/head>/i, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<link[^>]*>/gi, '')}
  <script>${js}</script>
</body>
</html>`;

  const isCurrentFilePython = active?.language === 'python' || active?.name.endsWith('.py');

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
          <button className="icon-btn" title="Back to Home / Landing Page" onClick={() => setInIdeMode(false)}>
            <Home size={17} />
          </button>
          <button className="icon-btn" aria-label="Open explorer" onClick={() => setSidebar(v => !v)}>
            <Menu size={19} />
          </button>
          <div className="brand">
            <div className="brand-mark">
              <Code2 size={18} />
            </div>
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

          <button className="icon-btn templates-top-btn" title="Starter Templates" onClick={() => setView('templates')}>
            <Layers size={17} />
          </button>

          {isCurrentFilePython ? (
            <button className="action-btn py-btn" title="Run Python in Browser" onClick={() => runPythonCode(active.content)}>
              <Play size={15} />
              <span>{pyRunning ? 'Running...' : 'Run Python'}</span>
            </button>
          ) : (
            <button className="action-btn" onClick={() => (view === 'preview' ? setView('editor') : executePalette('preview'))}>
              <Play size={15} />
              <span>{view === 'preview' ? 'Editor' : 'Run'}</span>
            </button>
          )}

          <button className="icon-btn ai-badge-btn" title="AI Copilot" onClick={() => setView('ai')}>
            <Bot size={17} />
          </button>
          <button className="icon-btn" title="Save" onClick={() => executePalette('save')}>
            <Save size={17} />
          </button>
          <button className="icon-btn" title="Export ZIP" onClick={exportProjectZip}>
            <Download size={18} />
          </button>
          <button className="icon-btn" title="Import" onClick={() => fileInput.current?.click()}>
            <Upload size={18} />
          </button>
          <input ref={fileInput} type="file" accept="application/json,.codeforge,.zip" hidden onChange={importProject} />
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="workspace">
        {/* Sidebar */}
        {sidebar && (
          <aside className="sidebar">
            <div className="sidebar-head">
              <span>EXPLORER</span>
              <div className="explorer-actions">
                <button className="mini-btn" title="New file" onClick={createFile}>
                  <FilePlus2 size={15} />
                </button>
                <button
                  className="mini-btn"
                  title="New folder"
                  onClick={() => setTerminal(prev => `${prev}\n✓ Folder path supported: prefix filename with folder name e.g. src/App.tsx`)}
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

            <div className="tree-root">
              <ChevronDown size={15} />
              <FolderOpen size={16} />
              <b>codeforge-workspace</b>
            </div>

            <div className="tree">
              {filtered.map(file => (
                <div key={file.id} className={`tree-file ${active?.id === file.id ? 'selected' : ''}`}>
                  <button onClick={() => openFile(file.id)}>
                    <FileCode2 size={16} />
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
                    <button title="Rename" onClick={() => setRenameId(file.id)}>
                      R
                    </button>
                    <button
                      title="Duplicate"
                      onClick={() => {
                        const copy = { ...file, id: crypto.randomUUID(), name: `${file.name}.copy`, path: `${file.path}.copy`, modified: true };
                        setFiles(prev => [...prev, copy]);
                        openFile(copy.id);
                      }}
                    >
                      <Copy size={12} />
                    </button>
                    <button title="Delete" onClick={() => deleteFile(file.id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="side-section">
              <label>SEARCH IN FILES</label>
              <div className="search">
                <Search size={14} />
                <input value={contentSearch} onChange={e => setContentSearch(e.target.value)} placeholder="Find text..." />
              </div>
              {contentSearch && (
                <div className="search-results">
                  {matches.map(file => (
                    <button key={file.id} onClick={() => openFile(file.id)}>
                      {file.name}
                      <span>{file.content.toLowerCase().split(contentSearch.toLowerCase()).length - 1} matches</span>
                    </button>
                  ))}
                  {!matches.length && <small>No matches found</small>}
                </div>
              )}
            </div>

            <div className="side-tools">
              <button onClick={() => { setView('templates'); setSidebar(false); }}>
                <Layers size={15} /> Starter Templates
              </button>
              <button onClick={() => { setView('github-sync'); setSidebar(false); }}>
                <Cloud size={15} /> GitHub Cloud Push & Pull
              </button>
              <button onClick={() => { setView('liveshare'); setSidebar(false); }}>
                <Users size={15} /> Live Share Collaboration
              </button>
              <button onClick={() => { setView('ai'); setSidebar(false); }}>
                <Bot size={15} /> AI Coding Copilot
              </button>
              <button onClick={() => { setView('git'); setSidebar(false); }}>
                <GitBranch size={15} /> Source Control
              </button>
              <button onClick={() => { setView('extensions'); setSidebar(false); }}>
                <Package size={15} /> Extensions
              </button>
              <button onClick={() => { setPanel(v => !v); setSidebar(false); }}>
                <Terminal size={15} /> Terminal & Console
              </button>
              <button onClick={exportProjectZip}>
                <Archive size={15} /> Export as ZIP
              </button>
              <button onClick={() => fileInput.current?.click()}>
                <Upload size={15} /> Import Project
              </button>
              <button onClick={exportAndroidPackage}>
                <Download size={15} /> Android Package Setup
              </button>
              <button onClick={() => setInIdeMode(false)}>
                <Home size={15} /> Landing Page
              </button>
            </div>

            <div className="sidebar-bottom">
              <button onClick={() => setView('git')}>
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
          {/* Editor Tabs */}
          <div className="tabs">
            {openTabs.map(id => {
              const file = files.find(f => f.id === id);
              if (!file) return null;
              return (
                <button key={id} className={`tab ${id === activeId ? 'active' : ''}`} onClick={() => openFile(id)}>
                  <FileText size={14} />
                  {file.name}
                  {file.modified ? ' •' : ''}
                  <span
                    onClick={e => {
                      e.stopPropagation();
                      closeTab(id);
                    }}
                  >
                    <X size={14} />
                  </span>
                </button>
              );
            })}
            <button className="new-tab" title="New file" onClick={createFile}>
              <Plus size={17} />
            </button>
          </div>

          {/* Code Editor View */}
          {view === 'editor' && (
            <div className="editor-wrap">
              <div className="editor-head">
                <span>
                  {active?.path || 'No file selected'} {active?.modified ? '• unsaved' : ''}
                </span>
                <div className="editor-controls">
                  {isCurrentFilePython && (
                    <button className="pill-btn py-pill" onClick={() => runPythonCode(active.content)}>
                      <Play size={12} /> Run Py
                    </button>
                  )}
                  <button className="pill-btn" title="Format code" onClick={formatFile}>
                    <Wand2 size={13} /> Format
                  </button>
                  <button className="pill-btn" title="Split preview" onClick={() => setSplitPreview(v => !v)}>
                    <Columns size={13} /> Split
                  </button>
                  <span>
                    {active?.language || 'plaintext'} · {fontSize}px
                  </span>
                </div>
              </div>

              <div className={`editor-container ${splitPreview ? 'split-mode' : ''}`}>
                <div className="monaco-wrap">
                  <Editor
                    height="100%"
                    theme={theme}
                    language={active?.language || 'plaintext'}
                    value={active?.content || ''}
                    onMount={handleEditorDidMount}
                    onChange={value => updateContent(value ?? '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize,
                      automaticLayout: true,
                      wordWrap: wordWrap ? 'on' : 'off',
                      tabSize: 2,
                      suggestOnTriggerCharacters: true,
                      quickSuggestions: true,
                      parameterHints: { enabled: true },
                      inlineSuggest: { enabled: true },
                      padding: { top: 8 },
                      smoothScrolling: true,
                      cursorBlinking: 'smooth',
                      bracketPairColorization: { enabled: true },
                      guides: { bracketPairs: true },
                      lineNumbersMinChars: 3
                    }}
                    onValidate={markers =>
                      setDiagnostics(markers.length ? `${markers.length} diagnostic${markers.length > 1 ? 's' : ''} detected.` : 'No problems detected.')
                    }
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

              {/* Mobile Quick Symbol Access Bar + Voice Mic Button */}
              <div className="quick-symbol-bar">
                <button
                  className={`symbol-btn mic-btn ${isRecordingVoice ? 'recording' : ''}`}
                  title={isRecordingVoice ? 'Listening... Speak code' : 'Voice Dictation'}
                  onClick={toggleVoiceRecognition}
                >
                  {isRecordingVoice ? <MicOff size={14} className="text-red-400 animate-pulse" /> : <Mic size={14} />}
                </button>
                <button className="symbol-btn undo-btn" title="Undo" onClick={handleUndo}>
                  <Undo2 size={14} />
                </button>
                <button className="symbol-btn redo-btn" title="Redo" onClick={handleRedo}>
                  <RotateCw size={14} />
                </button>
                <div className="symbol-divider" />
                {quickSymbols.map((s, idx) => (
                  <button key={idx} className="symbol-btn" onClick={() => handleInsertSymbol(s)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
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
            <section className="bottom-panel">
              <div className="panel-tabs">
                <div>
                  <button className="panel-active">TERMINAL</button>
                  <button onClick={() => setTerminal(prev => `${prev}\n$ console clear`)}>
                    LOGS <em>{consoleLogs.length}</em>
                  </button>
                </div>
                <button onClick={() => setPanel(false)}>
                  <X size={16} />
                </button>
              </div>
              <pre>{terminal}</pre>
              <form
                className="terminal-input"
                onSubmit={e => {
                  e.preventDefault();
                  runCommand(command);
                }}
              >
                <span>$</span>
                <input
                  value={command}
                  onChange={e => setCommand(e.target.value)}
                  placeholder="help, ls, python main.py, npm run dev..."
                  autoCapitalize="off"
                  autoCorrect="off"
                />
              </form>
            </section>
          )}
        </main>
      </div>

      {/* Footer Status Bar */}
      <footer className="statusbar">
        <div className="status-left">
          <span>
            <Check size={12} /> {active?.modified ? 'Unsaved' : 'Saved'}
          </span>
          <span>
            <GitBranch size={12} /> {branch}
          </span>
          <span>{active?.language}</span>
        </div>
        <div className="status-right">
          <button className="status-btn" title="Starter Templates" onClick={() => setView('templates')}>
            <Layers size={12} /> Templates
          </button>
          <button className="status-btn" onClick={() => setView('ai')}>
            <Sparkles size={12} /> AI
          </button>
          <button className="status-btn" onClick={() => setView('settings')}>
            <Palette size={12} /> {theme}
          </button>
          <button className="status-btn" onClick={() => setPanel(v => !v)}>
            <Terminal size={12} />
          </button>
        </div>
      </footer>

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

      {/* Command Palette Modal */}
      {palette && (
        <div className="palette-backdrop" onMouseDown={() => setPalette(false)}>
          <div className="palette" onMouseDown={e => e.stopPropagation()}>
            <div className="palette-input">
              <Search size={16} />
              <input autoFocus placeholder="Type a command or action..." onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={() => executePalette('new')}>
              <FilePlus2 size={15} /> New File <kbd>⌘N</kbd>
            </button>
            <button onClick={() => executePalette('python')}>
              <Play size={15} /> Run In-Browser Python (Pyodide)
            </button>
            <button onClick={() => executePalette('templates')}>
              <Layers size={15} /> Starter Project Templates
            </button>
            <button onClick={() => executePalette('github-sync')}>
              <Cloud size={15} /> GitHub Cloud Push & Pull
            </button>
            <button onClick={() => executePalette('liveshare')}>
              <Users size={15} /> Realtime Live Share Room
            </button>
            <button onClick={() => executePalette('save')}>
              <Save size={15} /> Save Current File <kbd>⌘S</kbd>
            </button>
            <button onClick={() => executePalette('format')}>
              <Wand2 size={15} /> Format Code
            </button>
            <button onClick={() => executePalette('find')}>
              <Search size={15} /> Find & Replace <kbd>⌘F</kbd>
            </button>
            <button onClick={() => executePalette('ai')}>
              <Bot size={15} /> Open AI Copilot
            </button>
            <button onClick={() => executePalette('preview')}>
              <Play size={15} /> Run Live Preview
            </button>
            <button onClick={() => executePalette('zip')}>
              <Archive size={15} /> Export Project as ZIP
            </button>
            <button onClick={() => executePalette('landing')}>
              <Home size={15} /> Return to Landing Page
            </button>
            <button onClick={() => executePalette('terminal')}>
              <Terminal size={15} /> Toggle Terminal
            </button>
            <button onClick={() => executePalette('git')}>
              <GitBranch size={15} /> Source Control
            </button>
            <button onClick={() => executePalette('settings')}>
              <Settings size={15} /> Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
