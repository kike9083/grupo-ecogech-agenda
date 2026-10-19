/**
 * Generates the PWA icons under `public/` (spec `pwa` → "Installable app").
 *
 * The repo has no image tooling and the icons must be real PNGs — Chromium
 * only counts a PNG (or ICO) icon towards installability, and iOS ignores the
 * manifest entirely and uses `apple-touch-icon` — so this script draws them
 * from scratch and encodes the PNG itself with `node:zlib`. Run it with:
 *
 *   node scripts/generate-pwa-icons.mjs
 *
 * It is deterministic: the same input always produces the same bytes, so the
 * committed PNGs can be regenerated and diffed instead of being mystery
 * binaries. Drawing is supersampled 3x and box-filtered down, which is the
 * cheapest way to get antialiased edges without a rasterizer.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

/** Brand accent from `globals.css` (`--color-accent`) and its soft tint. */
const ACCENT = [5, 150, 105];
const WHITE = [255, 255, 255];

const SUPERSAMPLE = 3;

function createCanvas(size) {
  return {
    size,
    pixels: new Uint8ClampedArray(size * size * 4),
  };
}

function setPixel(canvas, x, y, [r, g, b], alpha = 255) {
  if (x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) {
    return;
  }
  const index = (y * canvas.size + x) * 4;
  canvas.pixels[index] = r;
  canvas.pixels[index + 1] = g;
  canvas.pixels[index + 2] = b;
  canvas.pixels[index + 3] = alpha;
}

/** True when (x, y) is inside the rounded rectangle of the given corner radius. */
function inRoundedRect(x, y, left, top, right, bottom, radius) {
  if (x < left || x > right || y < top || y > bottom) {
    return false;
  }
  const clampedRadius = Math.min(radius, (right - left) / 2, (bottom - top) / 2);
  if (clampedRadius <= 0) {
    return true;
  }

  const nearLeft = x < left + clampedRadius;
  const nearRight = x > right - clampedRadius;
  const nearTop = y < top + clampedRadius;
  const nearBottom = y > bottom - clampedRadius;

  if ((nearLeft || nearRight) && (nearTop || nearBottom)) {
    const centerX = nearLeft ? left + clampedRadius : right - clampedRadius;
    const centerY = nearTop ? top + clampedRadius : bottom - clampedRadius;
    const dx = x - centerX;
    const dy = y - centerY;
    return dx * dx + dy * dy <= clampedRadius * clampedRadius;
  }

  return true;
}

/**
 * Draws the icon at `size`: a brand plate with a white note sheet and three
 * accent rules, the same "document with lines" mark the in-app header uses.
 * `maskable` fills the whole square so the platform's own mask can crop it,
 * and shrinks the glyph into the 80% safe zone.
 */
function drawIcon(size, { maskable }) {
  const canvas = createCanvas(size);
  const s = size;
  const plateRadius = maskable ? 0 : s * 0.22;

  for (let y = 0; y < s; y += 1) {
    for (let x = 0; x < s; x += 1) {
      if (inRoundedRect(x, y, 0, 0, s - 1, s - 1, plateRadius)) {
        setPixel(canvas, x, y, ACCENT);
      }
    }
  }

  // The sheet, and the rules on it. A maskable icon keeps the same layout but
  // everything is pulled inward so a circular crop never clips the glyph.
  const scale = maskable ? 0.78 : 1;
  const sheet = {
    left: s * (0.5 - 0.24 * scale),
    right: s * (0.5 + 0.24 * scale),
    top: s * (0.5 - 0.28 * scale),
    bottom: s * (0.5 + 0.28 * scale),
  };
  const sheetRadius = s * 0.05 * scale;

  for (let y = 0; y < s; y += 1) {
    for (let x = 0; x < s; x += 1) {
      if (
        inRoundedRect(
          x,
          y,
          sheet.left,
          sheet.top,
          sheet.right,
          sheet.bottom,
          sheetRadius,
        )
      ) {
        setPixel(canvas, x, y, WHITE);
      }
    }
  }

  const ruleHeight = s * 0.035 * scale;
  const rules = [
    { top: 0.38, right: 0.66 },
    { top: 0.49, right: 0.66 },
    { top: 0.6, right: 0.58 },
  ];

  for (const rule of rules) {
    const left = s * 0.36;
    const right = s * rule.right;
    const top = s * rule.top;
    const bottom = top + ruleHeight;

    for (let y = Math.floor(top); y <= Math.ceil(bottom); y += 1) {
      for (let x = Math.floor(left); x <= Math.ceil(right); x += 1) {
        if (inRoundedRect(x, y, left, top, right, bottom, ruleHeight / 2)) {
          setPixel(canvas, x, y, ACCENT);
        }
      }
    }
  }

  return canvas;
}

/** Box-filters a supersampled canvas down to `size`, giving smooth edges. */
function downsample(canvas, size) {
  const factor = canvas.size / size;
  const out = createCanvas(size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let samples = 0;

      for (let sy = 0; sy < factor; sy += 1) {
        for (let sx = 0; sx < factor; sx += 1) {
          const px = x * factor + sx;
          const py = y * factor + sy;
          const index = (py * canvas.size + px) * 4;
          const alpha = canvas.pixels[index + 3] / 255;
          r += canvas.pixels[index] * alpha;
          g += canvas.pixels[index + 1] * alpha;
          b += canvas.pixels[index + 2] * alpha;
          a += alpha;
          samples += 1;
        }
      }

      const index = (y * size + x) * 4;
      if (a === 0) {
        out.pixels[index + 3] = 0;
        continue;
      }
      out.pixels[index] = Math.round(r / a);
      out.pixels[index + 1] = Math.round(g / a);
      out.pixels[index + 2] = Math.round(b / a);
      out.pixels[index + 3] = Math.round((a / samples) * 255);
    }
  }

  return out;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(canvas) {
  const { size, pixels } = canvas;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  // Each scanline is prefixed with its filter byte (0 = none).
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, rowStart + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function writeIcon(name, size, options) {
  const supersampled = drawIcon(size * SUPERSAMPLE, options);
  const png = encodePng(downsample(supersampled, size));
  writeFileSync(join(PUBLIC_DIR, name), png);
  return `${name} (${size}x${size}, ${png.length} bytes)`;
}

const written = [
  writeIcon('icon-192.png', 192, { maskable: false }),
  writeIcon('icon-512.png', 512, { maskable: false }),
  writeIcon('icon-maskable-512.png', 512, { maskable: true }),
  // iOS reads this one for the home screen; it ignores the manifest icons.
  writeIcon('apple-touch-icon.png', 180, { maskable: false }),
];

console.log(written.join('\n'));
