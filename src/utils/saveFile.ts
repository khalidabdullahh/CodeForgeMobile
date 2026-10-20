import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function safeName(name: string): string {
  return (name || 'file').replace(/[\\/:*?"<>|]/g, '_');
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

function browserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking straight away can cancel the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Save a file for the user.
 * - Browser: normal download.
 * - Android app: the WebView cannot download blobs, so write the file to the app cache and
 *   open the Android share sheet ("Save to Files", Drive, WhatsApp...). Falls back to the
 *   browser download if the native plugins are unavailable.
 */
export async function saveFile(data: Blob | string, filename: string, mime = 'text/plain;charset=utf-8'): Promise<void> {
  const name = safeName(filename);
  const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data;

  if (Capacitor.isNativePlatform()) {
    try {
      const written = await Filesystem.writeFile({
        path: name,
        data: await blobToBase64(blob),
        directory: Directory.Cache
      });
      await Share.share({ title: name, files: [written.uri], dialogTitle: `Save ${name}` });
      return;
    } catch (err: any) {
      // The user closing the share sheet is not an error
      if (err && /cancel|dismiss/i.test(String(err.message || err))) return;
    }
  }
  browserDownload(blob, name);
}
