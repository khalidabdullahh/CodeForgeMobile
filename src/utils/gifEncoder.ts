// Minimal animated-GIF encoder (no dependencies): fixed 256-colour palette + LZW compression.

const PALETTE_BITS = { r: 3, g: 3, b: 2 };

function buildPalette(): Uint8Array {
  const pal = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const ri = i >> 5;
    const gi = (i >> 2) & 7;
    const bi = i & 3;
    pal[i * 3] = Math.round((ri * 255) / 7);
    pal[i * 3 + 1] = Math.round((gi * 255) / 7);
    pal[i * 3 + 2] = Math.round((bi * 255) / 3);
  }
  return pal;
}

function quantize(rgba: Uint8ClampedArray, pixelCount: number): Uint8Array {
  const out = new Uint8Array(pixelCount);
  for (let p = 0, i = 0; p < pixelCount; p++, i += 4) {
    const ri = Math.round((rgba[i] * 7) / 255);
    const gi = Math.round((rgba[i + 1] * 7) / 255);
    const bi = Math.round((rgba[i + 2] * 3) / 255);
    out[p] = (ri << 5) | (gi << 2) | bi;
  }
  return out;
}

// Standard GIF variable-width LZW (minimum code size 8)
function lzwEncode(pixels: Uint8Array): number[] {
  const MIN_CODE_SIZE = 8;
  const clearCode = 1 << MIN_CODE_SIZE;
  const eofCode = clearCode + 1;
  const initBits = MIN_CODE_SIZE + 1;

  const out: number[] = [];
  let cur = 0;
  let curBits = 0;
  let nBits = initBits;
  let maxCode = (1 << nBits) - 1;
  let freeEnt = eofCode + 1;
  let table = new Map<number, number>();

  const output = (code: number, isClear = false) => {
    cur |= code << curBits;
    curBits += nBits;
    while (curBits >= 8) {
      out.push(cur & 255);
      cur >>= 8;
      curBits -= 8;
    }
    if (freeEnt > maxCode || isClear) {
      if (isClear) {
        nBits = initBits;
        maxCode = (1 << nBits) - 1;
      } else {
        nBits++;
        maxCode = nBits === 12 ? 4096 : (1 << nBits) - 1;
      }
    }
  };

  output(clearCode);
  let ent = pixels[0];
  for (let i = 1; i < pixels.length; i++) {
    const c = pixels[i];
    const key = (c << 12) | ent;
    const found = table.get(key);
    if (found !== undefined) {
      ent = found;
      continue;
    }
    output(ent);
    ent = c;
    if (freeEnt < 4096) {
      table.set(key, freeEnt++);
    } else {
      table = new Map();
      freeEnt = clearCode + 2;
      output(clearCode, true);
    }
  }
  output(ent);
  output(eofCode);
  if (curBits > 0) out.push(cur & 255);
  return out;
}

/**
 * Encode ImageData frames into an endlessly looping GIF.
 * Yields to the UI between frames so the page stays responsive.
 */
export async function encodeGif(
  images: { data: Uint8ClampedArray }[],
  width: number,
  height: number,
  fps: number,
  onProgress?: (ratio: number) => void
): Promise<Uint8Array> {
  const bytes: number[] = [];
  const w16 = (n: number) => bytes.push(n & 255, (n >> 8) & 255);
  const delay = Math.max(2, Math.round(100 / Math.max(1, fps)));

  // Header + logical screen descriptor (global colour table, 256 colours)
  'GIF89a'.split('').forEach(ch => bytes.push(ch.charCodeAt(0)));
  w16(width);
  w16(height);
  bytes.push(0xf7, 0, 0);
  buildPalette().forEach(v => bytes.push(v));

  // Loop forever (NETSCAPE2.0 extension)
  bytes.push(0x21, 0xff, 0x0b);
  'NETSCAPE2.0'.split('').forEach(ch => bytes.push(ch.charCodeAt(0)));
  bytes.push(0x03, 0x01, 0x00, 0x00, 0x00);

  for (let f = 0; f < images.length; f++) {
    // Graphic control extension: frame delay, leave previous frame in place
    bytes.push(0x21, 0xf9, 0x04, 0x04);
    w16(delay);
    bytes.push(0x00, 0x00);

    // Image descriptor (full frame, uses global palette)
    bytes.push(0x2c);
    w16(0);
    w16(0);
    w16(width);
    w16(height);
    bytes.push(0x00);

    // Pixel data
    bytes.push(8);
    const lzw = lzwEncode(quantize(images[f].data, width * height));
    for (let i = 0; i < lzw.length; i += 255) {
      const chunk = lzw.slice(i, i + 255);
      bytes.push(chunk.length);
      for (let j = 0; j < chunk.length; j++) bytes.push(chunk[j]);
    }
    bytes.push(0x00);

    onProgress?.((f + 1) / images.length);
    await new Promise(r => setTimeout(r, 0));
  }

  bytes.push(0x3b);
  return Uint8Array.from(bytes);
}

export { PALETTE_BITS };
