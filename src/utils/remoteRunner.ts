// Compile & run C / C++ / Java on a real remote compiler (Judge0 CE, with Piston as a fallback).
// A phone cannot run gcc or javac locally, so this needs an internet connection.
import { Capacitor, CapacitorHttp } from '@capacitor/core';

export type NativeLang = 'c' | 'cpp' | 'java';

export interface RunResult {
  /** true when the program compiled and ran to completion with exit code 0 */
  ok: boolean;
  /** compiler output when compilation failed */
  compileError?: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timeSec?: number;
  provider: string;
  /** extra information for the user, e.g. that a Java class was renamed */
  note?: string;
}

const endpoints = {
  judge0: 'https://ce.judge0.com',
  piston: 'https://emkc.org/api/v2/piston'
};
/** only used by tests */
export function __setEndpoints(e: Partial<typeof endpoints>) {
  Object.assign(endpoints, e);
  languageCache = null;
}

interface HttpResult {
  status: number;
  json: any;
}

async function http(method: 'GET' | 'POST', url: string, body?: unknown, timeoutMs = 30000): Promise<HttpResult> {
  if (Capacitor.isNativePlatform()) {
    // Native HTTP avoids browser CORS limits inside the Android WebView
    const options = { url, headers: { 'Content-Type': 'application/json' }, data: body, connectTimeout: timeoutMs, readTimeout: timeoutMs };
    const res = method === 'GET' ? await CapacitorHttp.get(options) : await CapacitorHttp.post(options);
    let data = res.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        /* keep the raw text */
      }
    }
    return { status: res.status, json: data };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

function toB64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromB64(b64: string | null | undefined): string {
  if (!b64) return '';
  try {
    const bin = atob(b64.replace(/\s/g, ''));
    return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  } catch {
    return '';
  }
}

/**
 * Java needs the file name to match the class that holds main().
 * Rename that class to Main and drop any package line so it runs on the remote compiler.
 */
export function prepareJava(src: string): { source: string; renamedFrom?: string } {
  let s = src.replace(/^\s*package\s+[\w.]+\s*;\s*$/m, '');
  let mainClass: string | undefined;
  const publicClass = s.match(/public\s+(?:final\s+|abstract\s+)*class\s+([A-Za-z_]\w*)/);
  if (publicClass) {
    mainClass = publicClass[1];
  } else {
    const mainAt = s.search(/static\s+void\s+main\s*\(/);
    if (mainAt >= 0) {
      const classes = [...s.slice(0, mainAt).matchAll(/\bclass\s+([A-Za-z_]\w*)/g)];
      if (classes.length) mainClass = classes[classes.length - 1][1];
    }
  }
  if (mainClass && mainClass !== 'Main') {
    s = s.replace(new RegExp('\\b' + mainClass + '\\b', 'g'), 'Main');
    return { source: s, renamedFrom: mainClass };
  }
  return { source: s };
}

// ---------------------------------------------------------------- Judge0 ----
let languageCache: { id: number; name: string }[] | null = null;

async function judge0LanguageId(lang: NativeLang): Promise<number> {
  const fallback = { c: 50, cpp: 54, java: 62 }[lang];
  try {
    if (!languageCache) {
      const res = await http('GET', `${endpoints.judge0}/languages`, undefined, 15000);
      if (res.status === 200 && Array.isArray(res.json)) languageCache = res.json;
    }
    const pattern = lang === 'cpp' ? /^C\+\+ \(GCC/ : lang === 'c' ? /^C \(GCC/ : /^Java \(OpenJDK/;
    const found = (languageCache || []).filter(l => pattern.test(l.name));
    if (found.length) return found.reduce((a, b) => (b.id > a.id ? b : a)).id;
  } catch {
    /* use the well-known id */
  }
  return fallback;
}

async function runJudge0(lang: NativeLang, source: string, stdin: string): Promise<RunResult> {
  const body: Record<string, unknown> = {
    source_code: toB64(source),
    language_id: await judge0LanguageId(lang),
    stdin: toB64(stdin)
  };
  if (lang === 'cpp') body.compiler_options = '-std=c++17 -O2';

  const base = `${endpoints.judge0}/submissions?base64_encoded=true`;
  let res = await http('POST', `${base}&wait=true`, body);
  if (res.status >= 500 || res.status === 401 || res.status === 403 || res.status === 429) {
    throw new Error(`Judge0 returned HTTP ${res.status}`);
  }
  // Some servers do not allow wait=true: submit, then poll for the result
  if (!res.json || !res.json.status) {
    const created = await http('POST', base, body);
    const token = created.json && created.json.token;
    if (!token) throw new Error('Judge0 did not accept the submission');
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 1000));
      res = await http('GET', `${endpoints.judge0}/submissions/${token}?base64_encoded=true`);
      if (res.json && res.json.status && res.json.status.id > 2) break;
    }
  }
  const r = res.json;
  if (!r || !r.status) throw new Error('Judge0 returned an unexpected response');

  const stdout = fromB64(r.stdout);
  const stderr = [fromB64(r.stderr), fromB64(r.message)].filter(Boolean).join('\n');
  const statusId: number = r.status.id;
  const timeSec = r.time ? Number(r.time) : undefined;
  if (statusId === 6) {
    return { ok: false, compileError: fromB64(r.compile_output) || r.status.description, stdout, stderr, exitCode: null, provider: 'Judge0' };
  }
  if (statusId === 13) throw new Error('Judge0 internal error');
  const exitCode = typeof r.exit_code === 'number' ? r.exit_code : null;
  let extra = '';
  if (statusId === 5) extra = '\nTime limit exceeded.';
  else if (statusId >= 7 && statusId <= 12 && !stderr) extra = `\n${r.status.description}`;
  return { ok: statusId === 3 && (exitCode === 0 || exitCode === null), stdout, stderr: stderr + extra, exitCode, timeSec, provider: 'Judge0' };
}

// ---------------------------------------------------------------- Piston ----
async function runPiston(lang: NativeLang, source: string, stdin: string): Promise<RunResult> {
  const fileName = lang === 'java' ? 'Main.java' : lang === 'c' ? 'main.c' : 'main.cpp';
  const res = await http('POST', `${endpoints.piston}/execute`, {
    language: { c: 'c', cpp: 'c++', java: 'java' }[lang],
    version: '*',
    files: [{ name: fileName, content: source }],
    stdin,
    compile_timeout: 20000,
    run_timeout: 10000
  });
  if (res.status !== 200 || !res.json || !res.json.run) {
    throw new Error(`Piston returned HTTP ${res.status}`);
  }
  const { compile, run } = res.json;
  if (compile && compile.code !== 0) {
    return { ok: false, compileError: compile.stderr || compile.output || 'Compilation failed', stdout: '', stderr: '', exitCode: null, provider: 'Piston' };
  }
  return { ok: run.code === 0, stdout: run.stdout || '', stderr: run.stderr || '', exitCode: typeof run.code === 'number' ? run.code : null, provider: 'Piston' };
}

/** Compile and run a program remotely. Throws only when no compiler server could be reached. */
export async function runNative(opts: { lang: NativeLang; source: string; stdin?: string }): Promise<RunResult> {
  let source = opts.source;
  let note: string | undefined;
  if (opts.lang === 'java') {
    const prepared = prepareJava(source);
    source = prepared.source;
    if (prepared.renamedFrom) note = `Class "${prepared.renamedFrom}" is compiled as "Main" on the remote compiler.`;
  }
  const stdin = opts.stdin || '';

  const errors: string[] = [];
  for (const provider of [runJudge0, runPiston]) {
    try {
      const result = await provider(opts.lang, source, stdin);
      return note ? { ...result, note } : result;
    } catch (e: any) {
      errors.push(String(e && e.message ? e.message : e));
    }
  }
  throw new Error(`Could not reach a compiler server (${errors.join('; ')}). Check your internet connection.`);
}

/** Does this program look like it reads input? */
export function needsInput(lang: NativeLang, source: string): boolean {
  if (lang === 'java') return /System\.in|Scanner\s*\(|BufferedReader/.test(source);
  return /\bcin\b|\bscanf\b|\bgetline\b|\bgets\b|\bgetchar\b|\bfgets\b|\bfscanf\b/.test(source);
}
