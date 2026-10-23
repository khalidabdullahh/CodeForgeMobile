// Strips TypeScript types (and converts import/export) so code can run in the browser.
import { transform } from 'sucrase';

const hasModuleSyntax = (code: string) => /^\s*(import|export)\s/m.test(code);

/** TypeScript -> plain JavaScript. Throws a readable Error on syntax problems. */
export function tsToJs(code: string): string {
  try {
    return transform(code, { transforms: ['typescript', 'imports'], disableESTransforms: true }).code;
  } catch (e: any) {
    throw new Error(`TypeScript error: ${e && e.message ? e.message : String(e)}`);
  }
}

/** JavaScript with import/export -> something a plain Function can run. */
export function jsModulesToCjs(code: string): string {
  if (!hasModuleSyntax(code)) return code;
  try {
    return transform(code, { transforms: ['imports'], disableESTransforms: true }).code;
  } catch (e: any) {
    throw new Error(`Syntax error: ${e && e.message ? e.message : String(e)}`);
  }
}

/**
 * Build the srcDoc for the live HTML preview.
 * - keeps inline <style>/<script> exactly as written
 * - <link rel=stylesheet href=x.css> and <script src=x.js|x.ts> are replaced by the project file of that name
 * - external (http/https) scripts and styles are kept
 */
export function buildPreviewHtml(
  rawHtml: string,
  files: { name: string; path: string; content: string }[],
  consoleBridge: string
): string {
  const find = (ref: string) => {
    const clean = ref.split('#')[0].split('?')[0].replace(/^\.\//, '').replace(/^\//, '');
    return files.find(f => f.path === clean || f.name === clean || f.path.endsWith('/' + clean));
  };
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(rawHtml, 'text/html');
  } catch {
    return rawHtml;
  }
  doc.querySelectorAll('link[rel~="stylesheet"]').forEach(node => {
    const href = node.getAttribute('href') || '';
    if (/^(https?:)?\/\//i.test(href)) return;
    const file = find(href);
    if (file) {
      const style = doc.createElement('style');
      style.textContent = `/* ${file.path} */\n${file.content}`;
      node.replaceWith(style);
    } else {
      node.remove();
    }
  });
  doc.querySelectorAll('script[src]').forEach(node => {
    const src = node.getAttribute('src') || '';
    if (/^(https?:)?\/\//i.test(src)) return;
    const file = find(src);
    if (file) {
      const script = doc.createElement('script');
      let code = file.content;
      try {
        if (/\.tsx?$/i.test(file.name)) code = tsToJs(code);
        else code = jsModulesToCjs(code);
      } catch {
        /* run as written; the console bridge will report the syntax error */
      }
      if (/\bexports\b|\brequire\b/.test(code) && !node.hasAttribute('type')) {
        code = `var exports = {}, module = { exports: exports };\n${code}`;
      }
      script.textContent = `/* ${file.path} */\n${code}`;
      node.replaceWith(script);
    } else {
      node.remove();
    }
  });
  const bridge = doc.createElement('script');
  bridge.textContent = consoleBridge;
  doc.head.insertBefore(bridge, doc.head.firstChild);
  const viewport = doc.head.querySelector('meta[name="viewport"]');
  if (!viewport) {
    const meta = doc.createElement('meta');
    meta.setAttribute('name', 'viewport');
    meta.setAttribute('content', 'width=device-width,initial-scale=1');
    doc.head.insertBefore(meta, doc.head.firstChild);
  }
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}
