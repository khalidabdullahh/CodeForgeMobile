// A small but real shell for the CodeForge workspace: pipes, redirects, globs, quoting,
// variables, && / || / ; and the usual file commands working on the virtual project files.
// It is a pure module (no React) so it can be tested on its own.
import type { NativeLang } from './remoteRunner';

export interface GitInfo {
  branch: string;
  /** every local branch name */
  branches: string[];
  /** paths of files changed since the last commit */
  modified: string[];
  /** commit messages, newest first */
  log: string[];
  /** file contents at the last commit */
  snapshots: Record<string, string>;
}

export type ShellAction =
  | { type: 'run-python'; name: string; content: string }
  | { type: 'run-node'; name: string; content: string }
  | { type: 'native-compile'; lang: NativeLang; name: string; content: string; out: string }
  | { type: 'native-run'; lang: NativeLang; name: string; content: string; stdin?: string; hasStdin: boolean }
  | { type: 'preview' }
  | { type: 'open'; path: string }
  | { type: 'git-commit'; message: string }
  | { type: 'git-branch'; name: string; create?: boolean; stay?: boolean }
  | { type: 'clear' };

export interface ShellHost {
  print(text: string): void;
  /** perform an action that needs the app (running code, git, ...); resolves to an exit code */
  run(action: ShellAction): Promise<number>;
}

export interface Binary {
  lang: NativeLang;
  name: string;
  content: string;
}

export interface ShellSession {
  /** current directory relative to the workspace root ('' = root) */
  cwd: string;
  /** programs "compiled" by g++/gcc/javac in this session, keyed by output / class name */
  binaries: Record<string, Binary>;
  lastCode: number;
}

export interface ShellResult {
  files: Map<string, string>;
  /** renames done by mv, so the app can keep the same file (and tab) */
  moves: [string, string][];
}

export const SHELL_HELP = `Files:     ls [-a -l] cd pwd tree find cat head tail wc grep sort uniq
Edit:      touch mkdir [-p] rm [-r] mv cp [-r] echo (> and >>) code <file>
Run:       python file.py | node file.js | g++ file.cpp -o out && ./out | javac F.java && java F
           run [file] (by extension) | npm run dev | open [file]
Git:       git status | git diff | git add | git commit -m "msg" | git log | git branch | git restore <file>
Other:     history clear date whoami uname echo $VAR   (use | pipes, && ; and * globs)`;

// ------------------------------------------------------------ paths --------
function normalize(parts: string[]): string {
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

export function resolvePath(cwd: string, p: string): string {
  if (p === '~' || p.startsWith('~/')) return normalize(p.slice(1).split('/'));
  if (p.startsWith('/')) return normalize(p.split('/'));
  return normalize((cwd ? cwd.split('/') : []).concat(p.split('/')));
}

function relativeTo(cwd: string, p: string): string {
  if (!cwd) return p;
  if (p === cwd) return '.';
  if (p.startsWith(cwd + '/')) return p.slice(cwd.length + 1);
  return '/' + p;
}

const baseName = (p: string) => p.slice(p.lastIndexOf('/') + 1);
const dirName = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');

function dirsOf(files: Map<string, string>): Set<string> {
  const dirs = new Set<string>();
  for (const p of files.keys()) {
    const parts = p.split('/');
    for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
  }
  return dirs;
}

const isDir = (files: Map<string, string>, p: string) => p === '' || dirsOf(files).has(p);

// ------------------------------------------------------------ tokenizer ----
interface Token {
  text: string;
  quoted: boolean;
  op?: '|' | '&&' | '||' | ';' | '>' | '>>' | '<';
}

function tokenize(line: string, vars: Record<string, string>): Token[] {
  const tokens: Token[] = [];
  let cur = '';
  let has = false;
  let quoted = false;
  const push = () => {
    if (has) tokens.push({ text: cur, quoted });
    cur = '';
    has = false;
    quoted = false;
  };
  const expandVar = (i: number): [string, number] => {
    // line[i] === '$'
    const rest = line.slice(i + 1);
    let m = rest.match(/^\{(\w+)\}/);
    if (m) return [vars[m[1]] ?? '', 1 + m[0].length];
    m = rest.match(/^(\w+|\?)/);
    if (m) return [vars[m[1]] ?? '', 1 + m[0].length];
    return ['$', 1];
  };

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'") {
      const end = line.indexOf("'", i + 1);
      if (end < 0) throw new Error("unexpected EOF while looking for matching `''");
      cur += line.slice(i + 1, end);
      has = quoted = true;
      i = end;
    } else if (c === '"') {
      let j = i + 1;
      let closed = false;
      for (; j < line.length; j++) {
        if (line[j] === '\\' && j + 1 < line.length && '"\\$'.includes(line[j + 1])) {
          cur += line[j + 1];
          j++;
        } else if (line[j] === '$') {
          const [val, used] = expandVar(j);
          cur += val;
          j += used - 1;
        } else if (line[j] === '"') {
          closed = true;
          break;
        } else cur += line[j];
      }
      if (!closed) throw new Error('unexpected EOF while looking for matching `"\'');
      has = quoted = true;
      i = j;
    } else if (c === '\\' && i + 1 < line.length) {
      cur += line[i + 1];
      has = true;
      i++;
    } else if (c === '$') {
      const [val, used] = expandVar(i);
      cur += val;
      has = true;
      i += used - 1;
    } else if (c === ' ' || c === '\t') {
      push();
    } else if (c === '#' && !has) {
      break; // comment
    } else if (c === '|' || c === '&' || c === ';' || c === '>' || c === '<') {
      const two = line.slice(i, i + 2);
      let op: Token['op'] | undefined;
      if (two === '&&' || two === '||' || two === '>>') op = two;
      else if (c === '|' || c === ';' || c === '>' || c === '<') op = c as Token['op'];
      if (!op) {
        cur += c; // a lone & is kept as text
        has = true;
        continue;
      }
      push();
      tokens.push({ text: op, quoted: false, op });
      i += op.length - 1;
    } else if (c === '~' && !has && (i + 1 >= line.length || line[i + 1] === '/' || line[i + 1] === ' ')) {
      cur += '~';
      has = true;
    } else {
      cur += c;
      has = true;
    }
  }
  push();
  return tokens;
}

interface Segment {
  argv: Token[];
  out?: { path: string; append: boolean };
  input?: string;
}

// ------------------------------------------------------------ glob ---------
function globToRegExp(pattern: string): RegExp {
  let re = '^';
  for (const ch of pattern) {
    if (ch === '*') re += '[^/]*';
    else if (ch === '?') re += '[^/]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(re + '$');
}

function expandGlobs(argv: Token[], cwd: string, files: Map<string, string>): string[] {
  const out: string[] = [];
  const candidates = [...files.keys(), ...dirsOf(files)];
  for (const t of argv) {
    if (!t.quoted && /[*?]/.test(t.text)) {
      const abs = resolvePath(cwd, t.text);
      const re = globToRegExp(abs);
      const hits = candidates.filter(c => re.test(c)).sort((a, b) => a.localeCompare(b));
      if (hits.length) {
        out.push(...hits.map(h => relativeTo(cwd, h)));
        continue;
      }
    }
    out.push(t.text);
  }
  return out;
}

// ------------------------------------------------------------ diff ---------
function lineDiffStat(before: string, after: string): { added: number; removed: number } {
  const count = (text: string) => {
    const m = new Map<string, number>();
    if (text === '') return m;
    for (const l of text.split('\n')) m.set(l, (m.get(l) || 0) + 1);
    return m;
  };
  const a = count(before);
  const b = count(after);
  let added = 0;
  let removed = 0;
  for (const [l, n] of b) added += Math.max(0, n - (a.get(l) || 0));
  for (const [l, n] of a) removed += Math.max(0, n - (b.get(l) || 0));
  return { added, removed };
}

// ------------------------------------------------------------ shell --------
interface Ctx {
  files: Map<string, string>;
  moves: [string, string][];
  session: ShellSession;
  git: GitInfo;
  history: string[];
  host: ShellHost;
}

interface CmdResult {
  out: string;
  err?: string;
  code: number;
}

const ok = (out = ''): CmdResult => ({ out, code: 0 });
const fail = (err: string, code = 1): CmdResult => ({ out: '', err, code });

function splitFlags(args: string[]): { flags: Set<string>; rest: string[]; values: string[] } {
  const flags = new Set<string>();
  const rest: string[] = [];
  let endOfFlags = false;
  for (const a of args) {
    if (!endOfFlags && a === '--') endOfFlags = true;
    else if (!endOfFlags && /^-[A-Za-z]+$/.test(a)) for (const ch of a.slice(1)) flags.add(ch);
    else rest.push(a);
  }
  return { flags, rest, values: rest };
}

function listDir(ctx: Ctx, dir: string, showHidden: boolean): { name: string; isDir: boolean; size: number }[] {
  const entries = new Map<string, { isDir: boolean; size: number }>();
  const prefix = dir ? dir + '/' : '';
  for (const [p, content] of ctx.files) {
    if (!p.startsWith(prefix)) continue;
    const rest = p.slice(prefix.length);
    const slash = rest.indexOf('/');
    if (slash >= 0) entries.set(rest.slice(0, slash), { isDir: true, size: 0 });
    else entries.set(rest, { isDir: false, size: new TextEncoder().encode(content).length });
  }
  return [...entries.entries()]
    .filter(([name]) => showHidden || !name.startsWith('.'))
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function readInput(ctx: Ctx, args: string[], stdin: string | undefined, cmd: string): { text?: string; err?: string; names: string[] } {
  if (args.length === 0) return stdin !== undefined ? { text: stdin, names: [] } : { err: `${cmd}: missing file operand`, names: [] };
  const parts: string[] = [];
  const errs: string[] = [];
  for (const a of args) {
    const p = resolvePath(ctx.session.cwd, a);
    if (ctx.files.has(p)) parts.push(ctx.files.get(p) as string);
    else if (isDir(ctx.files, p)) errs.push(`${cmd}: ${a}: Is a directory`);
    else errs.push(`${cmd}: ${a}: No such file or directory`);
  }
  return { text: parts.join(''), err: errs.length ? errs.join('\n') : undefined, names: args };
}

function treeLines(ctx: Ctx, dir: string): string[] {
  const lines: string[] = [];
  const walk = (d: string, prefix: string) => {
    const entries = listDir(ctx, d, false);
    entries.forEach((e, i) => {
      const last = i === entries.length - 1;
      lines.push(`${prefix}${last ? '└── ' : '├── '}${e.name}${e.isDir ? '/' : ''}`);
      if (e.isDir) walk(d ? `${d}/${e.name}` : e.name, prefix + (last ? '    ' : '│   '));
    });
  };
  walk(dir, '');
  return lines;
}

async function execCommand(argv: string[], stdin: string | undefined, hasStdin: boolean, ctx: Ctx): Promise<CmdResult> {
  const [cmd, ...args] = argv;
  const cwd = ctx.session.cwd;
  const R = (p: string) => resolvePath(cwd, p);

  switch (cmd) {
    case 'help':
      return ok(SHELL_HELP);
    case 'pwd':
      return ok('/codeforge/workspace' + (cwd ? '/' + cwd : ''));
    case 'clear':
      await ctx.host.run({ type: 'clear' });
      return ok();
    case 'true':
      return ok();
    case 'false':
      return { out: '', code: 1 };
    case 'whoami':
      return ok('user');
    case 'date':
      return ok(new Date().toString());
    case 'uname':
      return ok(args.includes('-a') ? 'CodeForge 1.0 browser-shell wasm' : 'CodeForge');
    case 'history':
      return ok(ctx.history.slice().reverse().map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join('\n'));
    case 'exit':
      return ok('(this terminal stays open - close the panel instead)');

    case 'echo': {
      const { flags, rest } = splitFlags(args);
      let text = rest.join(' ');
      if (flags.has('e')) text = text.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      return ok(flags.has('n') ? text : text + '\n');
    }

    case 'cd': {
      const target = args[0] === undefined || args[0] === '~' ? '' : R(args[0]);
      if (!isDir(ctx.files, target)) return fail(`cd: ${args[0]}: No such file or directory`);
      ctx.session.cwd = target;
      return ok();
    }

    case 'ls': {
      const { flags, rest } = splitFlags(args);
      const targets = rest.length ? rest : ['.'];
      const blocks: string[] = [];
      let code = 0;
      let err = '';
      for (const t of targets) {
        const p = R(t);
        if (ctx.files.has(p)) {
          blocks.push(flags.has('l') ? `-rw-r--r-- ${String(new TextEncoder().encode(ctx.files.get(p) as string).length).padStart(7)} ${t}` : t);
          continue;
        }
        if (!isDir(ctx.files, p)) {
          err += `ls: cannot access '${t}': No such file or directory\n`;
          code = 2;
          continue;
        }
        const entries = listDir(ctx, p, flags.has('a'));
        const body = flags.has('l')
          ? entries.map(e => `${e.isDir ? 'drwxr-xr-x' : '-rw-r--r--'} ${String(e.size).padStart(7)} ${e.name}${e.isDir ? '/' : ''}`).join('\n')
          : entries.map(e => e.name + (e.isDir ? '/' : '')).join('  ');
        blocks.push(targets.length > 1 ? `${t}:\n${body}` : body);
      }
      return { out: blocks.join('\n'), err: err.trimEnd() || undefined, code };
    }

    case 'tree': {
      const p = R(args[0] || '.');
      if (!isDir(ctx.files, p)) return fail(`tree: ${args[0]}: No such directory`);
      return ok([args[0] || '.', ...treeLines(ctx, p)].join('\n'));
    }

    case 'find': {
      const start = args[0] && !args[0].startsWith('-') ? args[0] : '.';
      let pattern: RegExp | null = null;
      let type = '';
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-name' && args[i + 1]) pattern = globToRegExp(args[++i]);
        else if (args[i] === '-type' && args[i + 1]) type = args[++i];
      }
      const base = R(start);
      if (!isDir(ctx.files, base) && !ctx.files.has(base)) return fail(`find: '${start}': No such file or directory`);
      const found: string[] = [];
      const consider = (path: string, dir: boolean) => {
        if (base && path !== base && !path.startsWith(base + '/')) return;
        if (type === 'f' && dir) return;
        if (type === 'd' && !dir) return;
        if (pattern && !pattern.test(baseName(path))) return;
        found.push(path === base ? start : (start === '.' ? './' : start.replace(/\/$/, '') + '/') + path.slice(base ? base.length + 1 : 0));
      };
      if (isDir(ctx.files, base)) consider(base, true);
      for (const d of [...dirsOf(ctx.files)].sort()) if (d !== base) consider(d, true);
      for (const f of [...ctx.files.keys()].sort()) consider(f, false);
      return ok(found.join('\n'));
    }

    case 'cat': {
      const r = readInput(ctx, args, stdin, 'cat');
      return { out: r.text ?? '', err: r.err, code: r.err ? 1 : 0 };
    }

    case 'head':
    case 'tail': {
      let n = 10;
      const files: string[] = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-n' && args[i + 1]) n = parseInt(args[++i], 10);
        else if (/^-\d+$/.test(args[i])) n = parseInt(args[i].slice(1), 10);
        else files.push(args[i]);
      }
      if (!Number.isFinite(n) || n < 0) return fail(`${cmd}: invalid number of lines`);
      const r = readInput(ctx, files, stdin, cmd);
      if (r.text === undefined) return fail(r.err as string);
      const text = r.text.replace(/\n$/, '');
      const lines = text === '' ? [] : text.split('\n');
      const picked = cmd === 'head' ? lines.slice(0, n) : n === 0 ? [] : lines.slice(-n);
      return { out: picked.length ? picked.join('\n') + '\n' : '', err: r.err, code: r.err ? 1 : 0 };
    }

    case 'wc': {
      const { flags, rest } = splitFlags(args);
      const r = readInput(ctx, rest, stdin, 'wc');
      if (r.text === undefined) return fail(r.err as string);
      const t = r.text;
      const lines = (t.match(/\n/g) || []).length;
      const words = t.trim() === '' ? 0 : t.trim().split(/\s+/).length;
      const bytes = new TextEncoder().encode(t).length;
      const cols: number[] = [];
      if (flags.has('l')) cols.push(lines);
      if (flags.has('w')) cols.push(words);
      if (flags.has('c')) cols.push(bytes);
      if (!cols.length) cols.push(lines, words, bytes);
      return ok(cols.join(' ') + (rest.length === 1 ? ' ' + rest[0] : '') + '\n');
    }

    case 'sort': {
      const { flags, rest } = splitFlags(args);
      const r = readInput(ctx, rest, stdin, 'sort');
      if (r.text === undefined) return fail(r.err as string);
      const lines = r.text.replace(/\n$/, '').split('\n').filter((l, _i, a) => !(a.length === 1 && l === ''));
      lines.sort(flags.has('n') ? (a, b) => parseFloat(a) - parseFloat(b) : (a, b) => (a < b ? -1 : a > b ? 1 : 0));
      if (flags.has('r')) lines.reverse();
      return ok(lines.length ? lines.join('\n') + '\n' : '');
    }

    case 'uniq': {
      const r = readInput(ctx, args.filter(a => !a.startsWith('-')), stdin, 'uniq');
      if (r.text === undefined) return fail(r.err as string);
      const lines = r.text.replace(/\n$/, '').split('\n');
      const out = lines.filter((l, i) => i === 0 || l !== lines[i - 1]);
      return ok(r.text === '' ? '' : out.join('\n') + '\n');
    }

    case 'grep': {
      const { flags, rest } = splitFlags(args);
      const pattern = rest.shift();
      if (pattern === undefined) return fail('usage: grep [-inrvcl] pattern [file...]', 2);
      let re: RegExp;
      try {
        re = new RegExp(pattern, flags.has('i') ? 'i' : '');
      } catch {
        re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags.has('i') ? 'i' : '');
      }
      const sources: { name: string; text: string }[] = [];
      const errs: string[] = [];
      if (rest.length === 0) {
        if (flags.has('r')) {
          for (const [p, c] of [...ctx.files].sort((a, b) => a[0].localeCompare(b[0]))) sources.push({ name: relativeTo(cwd, p), text: c });
        } else if (stdin !== undefined) sources.push({ name: '(standard input)', text: stdin });
        else return fail('grep: no input (give a file or pipe text into it)', 2);
      } else {
        for (const a of rest) {
          const p = R(a);
          if (ctx.files.has(p)) sources.push({ name: a, text: ctx.files.get(p) as string });
          else if (isDir(ctx.files, p) && flags.has('r')) {
            for (const [fp, c] of [...ctx.files].sort((x, y) => x[0].localeCompare(y[0]))) {
              if (!p || fp.startsWith(p + '/')) sources.push({ name: relativeTo(cwd, fp), text: c });
            }
          } else errs.push(`grep: ${a}: ${isDir(ctx.files, p) ? 'Is a directory' : 'No such file or directory'}`);
        }
      }
      const showName = sources.length > 1 || flags.has('r');
      const lines: string[] = [];
      let matches = 0;
      for (const s of sources) {
        let fileMatches = 0;
        s.text.replace(/\n$/, '').split('\n').forEach((line, i) => {
          if (re.test(line) !== flags.has('v')) {
            fileMatches++;
            if (!flags.has('c') && !flags.has('l')) lines.push(`${showName ? s.name + ':' : ''}${flags.has('n') ? i + 1 + ':' : ''}${line}`);
          }
        });
        matches += fileMatches;
        if (flags.has('c')) lines.push(`${showName ? s.name + ':' : ''}${fileMatches}`);
        else if (flags.has('l') && fileMatches) lines.push(s.name);
      }
      return { out: lines.length ? lines.join('\n') + '\n' : '', err: errs.join('\n') || undefined, code: errs.length ? 2 : matches ? 0 : 1 };
    }

    case 'touch': {
      if (!args.length) return fail('touch: missing file operand');
      for (const a of args) {
        const p = R(a);
        if (isDir(ctx.files, p)) continue;
        if (!ctx.files.has(p)) ctx.files.set(p, '');
      }
      return ok();
    }

    case 'mkdir': {
      const { rest } = splitFlags(args);
      if (!rest.length) return fail('mkdir: missing operand');
      for (const a of rest) {
        const p = R(a);
        if (ctx.files.has(p)) return fail(`mkdir: cannot create directory '${a}': File exists`);
        if (isDir(ctx.files, p)) continue; // like mkdir -p
        ctx.files.set(p + '/.gitkeep', '');
      }
      return ok();
    }

    case 'rm': {
      const { flags, rest } = splitFlags(args);
      if (!rest.length) return fail('rm: missing operand');
      const errs: string[] = [];
      for (const a of rest) {
        const p = R(a);
        if (p === '' || a === '..') {
          errs.push(`rm: refusing to remove '${a}'`);
          continue;
        }
        if (ctx.files.has(p)) ctx.files.delete(p);
        else if (isDir(ctx.files, p)) {
          if (!flags.has('r')) errs.push(`rm: cannot remove '${a}': Is a directory (use -r)`);
          else for (const k of [...ctx.files.keys()]) if (k.startsWith(p + '/')) ctx.files.delete(k);
          if (cwd === p || cwd.startsWith(p + '/')) ctx.session.cwd = dirName(p);
        } else if (!flags.has('f')) errs.push(`rm: cannot remove '${a}': No such file or directory`);
      }
      return { out: '', err: errs.join('\n') || undefined, code: errs.length ? 1 : 0 };
    }

    case 'mv':
    case 'cp': {
      const { flags, rest } = splitFlags(args);
      if (rest.length < 2) return fail(`${cmd}: missing file operand`);
      const dest = rest[rest.length - 1];
      const sources = rest.slice(0, -1);
      const destPath = R(dest);
      const destIsDir = isDir(ctx.files, destPath);
      if (sources.length > 1 && !destIsDir) return fail(`${cmd}: target '${dest}' is not a directory`);
      for (const s of sources) {
        const sp = R(s);
        const target = destIsDir ? (destPath ? destPath + '/' : '') + baseName(sp) : destPath;
        if (ctx.files.has(sp)) {
          const content = ctx.files.get(sp) as string;
          if (sp === target) return fail(`${cmd}: '${s}' and '${dest}' are the same file`);
          ctx.files.set(target, content);
          if (cmd === 'mv') {
            ctx.files.delete(sp);
            ctx.moves.push([sp, target]);
          }
        } else if (isDir(ctx.files, sp)) {
          if (cmd === 'cp' && !flags.has('r')) return fail(`cp: -r not specified; omitting directory '${s}'`);
          if (target === sp || target.startsWith(sp + '/')) return fail(`${cmd}: cannot copy '${s}' into itself`);
          for (const k of [...ctx.files.keys()]) {
            if (!k.startsWith(sp + '/')) continue;
            const nk = target + k.slice(sp.length);
            ctx.files.set(nk, ctx.files.get(k) as string);
            if (cmd === 'mv') {
              ctx.files.delete(k);
              ctx.moves.push([k, nk]);
            }
          }
        } else return fail(`${cmd}: cannot stat '${s}': No such file or directory`);
      }
      return ok();
    }

    case 'code':
    case 'open': {
      if (cmd === 'open' && !args.length) return { out: '', code: await ctx.host.run({ type: 'preview' }) };
      if (!args.length) return fail(`usage: ${cmd} <file>`);
      const p = R(args[0]);
      if (!ctx.files.has(p)) return fail(`${cmd}: ${args[0]}: No such file`);
      return { out: '', code: await ctx.host.run({ type: 'open', path: p }) };
    }

    case 'python':
    case 'python3':
    case 'py': {
      if (args[0] === '-c') {
        if (args[1] === undefined) return fail('python: option requires an argument -- c', 2);
        return { out: '', code: await ctx.host.run({ type: 'run-python', name: '<string>', content: args[1] }) };
      }
      if (args[0] === '--version' || args[0] === '-V') return ok('Python 3.12 (Pyodide)');
      if (!args[0]) return fail('python: interactive mode is not available - use: python file.py or python -c "code"');
      const p = R(args[0]);
      if (!ctx.files.has(p)) return fail(`python: can't open file '${args[0]}': [Errno 2] No such file or directory`, 2);
      return { out: '', code: await ctx.host.run({ type: 'run-python', name: baseName(p), content: ctx.files.get(p) as string }) };
    }

    case 'node':
    case 'ts-node':
    case 'deno': {
      if (args[0] === '-e' || args[0] === '-p') {
        if (args[1] === undefined) return fail('node: -e requires an argument', 9);
        return { out: '', code: await ctx.host.run({ type: 'run-node', name: '<eval>', content: args[1] }) };
      }
      if (args[0] === '-v' || args[0] === '--version') return ok('JavaScript (browser engine)');
      if (!args[0]) return fail('node: interactive mode is not available - use: node file.js or node -e "code"');
      const p = R(args[0]);
      if (!ctx.files.has(p)) return fail(`node: cannot find module '${args[0]}'`);
      return { out: '', code: await ctx.host.run({ type: 'run-node', name: baseName(p), content: ctx.files.get(p) as string }) };
    }

    case 'g++':
    case 'gcc':
    case 'clang':
    case 'clang++':
    case 'cc':
    case 'c++': {
      let out = 'a.out';
      const sources: string[] = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-o' && args[i + 1]) out = args[++i];
        else if (args[i].startsWith('-')) continue; // optimisation / standard flags are accepted
        else sources.push(args[i]);
      }
      if (!sources.length) return fail(`${cmd}: fatal error: no input files`);
      if (sources.length > 1) return fail(`${cmd}: only one source file can be compiled at a time here (paste helper code into the same file)`);
      const p = R(sources[0]);
      if (!ctx.files.has(p)) return fail(`${cmd}: error: ${sources[0]}: No such file or directory`);
      const lang: NativeLang = /\.c$/i.test(p) || cmd === 'gcc' || cmd === 'cc' || cmd === 'clang' ? (/\.(cpp|cc|cxx)$/i.test(p) ? 'cpp' : 'c') : 'cpp';
      const content = ctx.files.get(p) as string;
      const code = await ctx.host.run({ type: 'native-compile', lang, name: baseName(p), content, out });
      if (code === 0) ctx.session.binaries[out] = { lang, name: baseName(p), content };
      return { out: '', code };
    }

    case 'javac': {
      const sources = args.filter(a => !a.startsWith('-'));
      if (!sources.length) return fail('javac: no source files');
      const p = R(sources[0]);
      if (!ctx.files.has(p)) return fail(`error: file not found: ${sources[0]}`);
      const content = ctx.files.get(p) as string;
      const key = baseName(p).replace(/\.java$/i, '');
      const code = await ctx.host.run({ type: 'native-compile', lang: 'java', name: baseName(p), content, out: key });
      if (code === 0) {
        const bin = { lang: 'java' as NativeLang, name: baseName(p), content };
        ctx.session.binaries[key] = bin;
        // also reachable through the class that holds main()
        const mainClass = content.match(/(?:public\s+)?class\s+(\w+)[\s\S]*?static\s+void\s+main\s*\(/);
        if (mainClass) ctx.session.binaries[mainClass[1]] = bin;
      }
      return { out: '', code };
    }

    case 'java': {
      const positional: string[] = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-cp' || args[i] === '-classpath' || args[i] === '--class-path') {
          i++; // skip the classpath value
          continue;
        }
        if (!args[i].startsWith('-')) positional.push(args[i]);
      }
      const cls = positional[0];
      if (!cls) return fail('Usage: java [-cp .] <MainClass> | java File.java');
      let bin: Binary | undefined;
      if (/\.java$/i.test(cls)) {
        const p = R(cls);
        if (!ctx.files.has(p)) return fail(`error: file not found: ${cls}`);
        bin = { lang: 'java', name: baseName(p), content: ctx.files.get(p) as string };
      } else bin = ctx.session.binaries[cls];
      if (!bin) return fail(`Error: Could not find or load main class ${cls}\nCaused by: java.lang.ClassNotFoundException: ${cls} (run javac first)`);
      return { out: '', code: await ctx.host.run({ type: 'native-run', lang: 'java', name: bin.name, content: bin.content, stdin, hasStdin }) };
    }

    case 'run': {
      const p = args[0] ? R(args[0]) : '';
      if (args[0] && !ctx.files.has(p)) return fail(`run: ${args[0]}: No such file`);
      if (!p) return fail('usage: run <file>   (python, javascript, c, c++, java, html)');
      const name = baseName(p);
      const content = ctx.files.get(p) as string;
      if (/\.py$/i.test(name)) return { out: '', code: await ctx.host.run({ type: 'run-python', name, content }) };
      if (/\.(m?js|ts)$/i.test(name)) return { out: '', code: await ctx.host.run({ type: 'run-node', name, content }) };
      if (/\.(html?|css)$/i.test(name)) return { out: '', code: await ctx.host.run({ type: 'preview' }) };
      if (/\.(c|cpp|cc|cxx)$/i.test(name))
        return { out: '', code: await ctx.host.run({ type: 'native-run', lang: /\.c$/i.test(name) ? 'c' : 'cpp', name, content, stdin, hasStdin }) };
      if (/\.java$/i.test(name)) return { out: '', code: await ctx.host.run({ type: 'native-run', lang: 'java', name, content, stdin, hasStdin }) };
      return fail(`run: don't know how to run ${name}`);
    }

    case 'npm':
    case 'npx':
    case 'yarn':
    case 'pnpm': {
      const sub = args[0] === 'run' ? args[1] : args[0];
      if (['dev', 'start', 'serve', 'preview'].includes(sub || '')) {
        if (![...ctx.files.keys()].some(f => /\.html?$/i.test(f))) return fail(`${cmd}: no .html file in the workspace to serve`);
        return { out: `Opening Live Preview (static project - no dev server process)\n`, code: await ctx.host.run({ type: 'preview' }) };
      }
      if (sub === 'test') return fail('npm test: no test runner is available in this browser terminal');
      if (sub === 'build') return fail('npm run build: bundlers are not available in this browser terminal (the preview runs your files as they are)');
      if (sub === 'install' || sub === 'i' || sub === 'add') return fail(`${cmd}: installing packages is not available in this browser terminal`);
      return fail(`${cmd}: '${sub ?? ''}' is not supported here. Supported: ${cmd} run dev | start`);
    }

    case 'pip':
    case 'pip3':
      return fail('pip is not available. Inside Python you can load packages with:  import micropip; await micropip.install("name")');

    case 'git':
      return execGit(args, ctx);

    default:
      if (cmd.startsWith('./')) {
        const key = cmd.slice(2);
        const bin = ctx.session.binaries[key];
        if (bin) return { out: '', code: await ctx.host.run({ type: 'native-run', lang: bin.lang, name: bin.name, content: bin.content, stdin, hasStdin }) };
        const p = R(cmd);
        if (ctx.files.has(p)) return fail(`bash: ${cmd}: Permission denied (scripts cannot be executed - use python/node/run)`, 126);
        return fail(`bash: ${cmd}: No such file or directory${/\.(cpp|c)$/.test(cmd) ? '' : ' (compile first, e.g. g++ main.cpp -o main)'}`, 127);
      }
      return fail(`bash: ${cmd}: command not found (type help)`, 127);
  }
}

async function execGit(args: string[], ctx: Ctx): Promise<CmdResult> {
  const [sub, ...rest] = args;
  const g = ctx.git;
  const cwd = ctx.session.cwd;
  switch (sub) {
    case undefined:
      return fail('usage: git <status|diff|add|commit|log|branch|checkout|restore>');
    case 'status': {
      const lines = [`On branch ${g.branch}`];
      if (!g.modified.length) lines.push('nothing to commit, working tree clean');
      else {
        lines.push('Changes not committed:');
        for (const m of g.modified) lines.push(`\t${ctx.files.has(m) ? (g.snapshots[m] === undefined ? 'new file:' : 'modified:') : 'deleted:'}   ${relativeTo(cwd, m)}`);
      }
      return ok(lines.join('\n'));
    }
    case 'diff': {
      if (!g.modified.length) return ok('');
      const lines: string[] = [];
      let a = 0;
      let r = 0;
      for (const m of g.modified) {
        const d = lineDiffStat(g.snapshots[m] ?? '', ctx.files.get(m) ?? '');
        a += d.added;
        r += d.removed;
        lines.push(` ${relativeTo(cwd, m).padEnd(24)} | +${d.added} -${d.removed}`);
      }
      lines.push(` ${g.modified.length} file(s) changed, ${a} insertion(s)(+), ${r} deletion(s)(-)`);
      return ok(lines.join('\n'));
    }
    case 'add':
      return ok('(this workspace has no staging area - "git commit" saves all changes)');
    case 'commit': {
      let message = '';
      for (let i = 0; i < rest.length; i++) {
        if ((rest[i] === '-m' || rest[i] === '-am' || rest[i] === '-a') && rest[i + 1] !== undefined && rest[i] !== '-a') message = rest[++i];
        else if (rest[i].startsWith('-m') && rest[i].length > 2) message = rest[i].slice(2);
      }
      if (!message.trim()) return fail('Aborting commit due to empty commit message. Use: git commit -m "message"');
      if (!g.modified.length && g.log.length) return ok('nothing to commit, working tree clean');
      return { out: '', code: await ctx.host.run({ type: 'git-commit', message }) };
    }
    case 'log': {
      if (!g.log.length) return fail(`fatal: your current branch '${g.branch}' does not have any commits yet`);
      const oneline = rest.includes('--oneline');
      const parse = (entry: string, i: number) => {
        const m = entry.match(/^([0-9a-f]{7}) ([\s\S]*)$/);
        return m ? { id: m[1], msg: m[2] } : { id: String(g.log.length - i).padStart(7, '0'), msg: entry };
      };
      return ok(g.log.map((entry, i) => {
        const { id, msg } = parse(entry, i);
        return oneline ? `${id} ${msg}` : `commit ${id}\n    ${msg}\n`;
      }).join('\n'));
    }
    case 'branch': {
      const names = rest.filter(r => !r.startsWith('-'));
      if (!names.length) return ok(g.branches.map(b => `${b === g.branch ? '*' : ' '} ${b}`).join('\n'));
      return { out: '', code: await ctx.host.run({ type: 'git-branch', name: names[0], create: true, stay: true }) };
    }
    case 'checkout':
    case 'switch': {
      const name = rest.filter(r => !r.startsWith('-'))[0];
      if (!name) return fail(`usage: git ${sub} [-b] <branch>`);
      if (sub === 'checkout' && rest.includes('--')) return restoreFiles(rest.slice(rest.indexOf('--') + 1), ctx);
      const create = rest.includes('-b') || rest.includes('-c') || rest.includes('-B');
      if (sub === 'checkout' && !create && !g.branches.includes(name) && ctx.files.has(resolvePath(cwd, name))) return restoreFiles([name], ctx);
      return { out: '', code: await ctx.host.run({ type: 'git-branch', name, create }) };
    }
    case 'restore':
      return restoreFiles(rest.filter(r => !r.startsWith('-')), ctx);
    case 'push':
    case 'pull':
    case 'clone':
    case 'fetch':
    case 'remote':
      return fail(`git ${sub}: use the "GitHub Sync" panel to push your project to GitHub`);
    default:
      return fail(`git: '${sub}' is not supported in this terminal (try: status, diff, commit, log, branch, checkout, restore)`);
  }
}

function restoreFiles(paths: string[], ctx: Ctx): CmdResult {
  if (!paths.length) return fail('git restore: specify a file or .');
  const targets = paths.includes('.') ? ctx.git.modified.slice() : paths.map(p => resolvePath(ctx.session.cwd, p));
  for (const p of targets) {
    if (ctx.git.snapshots[p] === undefined) return fail(`error: pathspec '${p}' did not match any file known to git`);
    ctx.files.set(p, ctx.git.snapshots[p]);
  }
  return ok();
}

// ------------------------------------------------------------ driver -------
interface ParsedLine {
  /** pipelines joined by connectors */
  items: { connector: '' | '&&' | '||' | ';'; segments: Segment[] }[];
}

function parse(line: string, vars: Record<string, string>): ParsedLine {
  const tokens = tokenize(line, vars);
  const items: ParsedLine['items'] = [];
  let segments: Segment[] = [];
  let seg: Segment = { argv: [] };
  let connector: ParsedLine['items'][number]['connector'] = '';

  const closeSegment = () => {
    if (!seg.argv.length && (seg.out || seg.input)) throw new Error('syntax error: missing command');
    segments.push(seg);
    seg = { argv: [] };
  };
  const closePipeline = (next: typeof connector) => {
    if (!seg.argv.length && !segments.length) {
      if (next === ';' || next === '') {
        connector = next;
        return; // empty statement
      }
      throw new Error(`syntax error near unexpected token '${next}'`);
    }
    closeSegment();
    items.push({ connector, segments });
    segments = [];
    connector = next;
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.op === '|') {
      if (!seg.argv.length) throw new Error("syntax error near unexpected token '|'");
      closeSegment();
    } else if (t.op === '&&' || t.op === '||' || t.op === ';') closePipeline(t.op);
    else if (t.op === '>' || t.op === '>>' || t.op === '<') {
      const target = tokens[i + 1];
      if (!target || target.op) throw new Error(`syntax error near unexpected token '${t.op}'`);
      if (t.op === '<') seg.input = target.text;
      else seg.out = { path: target.text, append: t.op === '>>' };
      i++;
    } else seg.argv.push(t);
  }
  if (seg.argv.length || segments.length || seg.out || seg.input) closePipeline('');
  return { items };
}

export async function runShell(
  line: string,
  input: { files: Map<string, string>; session: ShellSession; git: GitInfo; history: string[] },
  host: ShellHost
): Promise<ShellResult> {
  const original = new Map(input.files);
  const ctx: Ctx = { files: new Map(input.files), moves: [], session: input.session, git: input.git, history: input.history, host };

  // $? and $PWD change while a line runs (cd, earlier commands), so they are filled in per command
  const LATE_Q = '\u0001Q\u0001';
  const LATE_PWD = '\u0001PWD\u0001';
  const late = (text: string) =>
    text
      .split(LATE_Q)
      .join(String(ctx.session.lastCode))
      .split(LATE_PWD)
      .join('/codeforge/workspace' + (ctx.session.cwd ? '/' + ctx.session.cwd : ''));
  const vars = (): Record<string, string> => ({
    HOME: '/codeforge',
    PWD: LATE_PWD,
    USER: 'user',
    SHELL: '/bin/cf-sh',
    '?': LATE_Q
  });

  let parsed: ParsedLine;
  try {
    parsed = parse(line, vars());
  } catch (e: any) {
    host.print(`bash: ${e.message}`);
    ctx.session.lastCode = 2;
    return { files: original, moves: [] };
  }

  let failedRefusal = false;
  for (const item of parsed.items) {
    if (item.connector === '&&' && ctx.session.lastCode !== 0) continue;
    if (item.connector === '||' && ctx.session.lastCode === 0) continue;

    let pipeText: string | undefined;
    let code = 0;
    for (let s = 0; s < item.segments.length; s++) {
      const seg = item.segments[s];
      const argv = expandGlobs(seg.argv.map(t => ({ ...t, text: late(t.text) })), ctx.session.cwd, ctx.files);
      let stdin = pipeText;
      let hasStdin = pipeText !== undefined;
      if (seg.input !== undefined) {
        const p = resolvePath(ctx.session.cwd, late(seg.input));
        if (!ctx.files.has(p)) {
          host.print(`bash: ${late(seg.input)}: No such file or directory`);
          code = 1;
          pipeText = '';
          continue;
        }
        stdin = ctx.files.get(p) as string;
        hasStdin = true;
      }
      let res: CmdResult;
      try {
        res = await execCommand(argv, stdin, hasStdin, ctx);
      } catch (e: any) {
        res = fail(`${argv[0]}: ${e && e.message ? e.message : e}`);
      }
      if (res.err) host.print(res.err);
      code = res.code;
      const last = s === item.segments.length - 1;
      if (seg.out) {
        const p = resolvePath(ctx.session.cwd, late(seg.out.path));
        if (isDir(ctx.files, p)) {
          host.print(`bash: ${late(seg.out.path)}: Is a directory`);
          code = 1;
        } else {
          const previous = seg.out.append ? ctx.files.get(p) ?? '' : '';
          ctx.files.set(p, previous + res.out);
        }
        pipeText = '';
      } else if (last) {
        if (res.out) host.print(res.out.replace(/\n$/, ''));
        pipeText = undefined;
      } else pipeText = res.out;
    }
    ctx.session.lastCode = code;
  }

  // Never leave the project without any file (the editor needs one)
  if (ctx.files.size === 0) {
    host.print('rm: refusing to delete the last file in the workspace');
    ctx.session.lastCode = 1;
    failedRefusal = true;
  }
  return failedRefusal ? { files: original, moves: [] } : { files: ctx.files, moves: ctx.moves };
}
