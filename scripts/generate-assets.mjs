// One-off generator for placeholder PWA icons and the alarm sound stub.
//
// No design assets exist yet (see app/manifest.ts's and
// constants/timer.constants.ts's TODOs). Rather than pull in an image
// library (sharp/canvas) just to draw a few solid squares, this writes
// PNG/WAV bytes directly against the public specs:
//   PNG: https://www.w3.org/TR/png/ (signature, IHDR/IDAT/IEND chunks, CRC-32)
//   WAV: http://soundfile.sapp.org/doc/WaveFormat/ (RIFF/WAVE, fmt , data)
//
// Run with: node scripts/generate-assets.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

// ---- PNG ----------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * Draws a simple rounded-square "P" glyph mark on a solid brand-color
 * background -- a legible, obviously-placeholder app icon, not an attempt
 * at a real logo.
 */
function drawIcon(size, [r, g, b]) {
  const pixels = Buffer.alloc(size * size * 4);
  const margin = Math.round(size * 0.16);
  const glyphLeft = Math.round(size * 0.36);
  const glyphTop = Math.round(size * 0.28);
  const glyphWidth = Math.round(size * 0.12);
  const glyphStemHeight = Math.round(size * 0.44);
  const glyphBowlSize = Math.round(size * 0.26);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * 4;
      const withinRoundedSquare = isInsideRoundedSquare(x, y, size, margin);

      let rr = 0, gg = 0, bb = 0, aa = 0;
      if (withinRoundedSquare) {
        rr = r; gg = g; bb = b; aa = 255;

        const inStem = x >= glyphLeft && x < glyphLeft + glyphWidth && y >= glyphTop && y < glyphTop + glyphStemHeight;
        const bowlCenterX = glyphLeft + glyphWidth + glyphBowlSize * 0.42;
        const bowlCenterY = glyphTop + glyphBowlSize * 0.5;
        const dx = x - bowlCenterX;
        const dy = y - bowlCenterY;
        const bowlOuter = glyphBowlSize * 0.5;
        const bowlInner = glyphBowlSize * 0.22;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const inBowlRing = distance <= bowlOuter && distance >= bowlInner && x >= glyphLeft;

        if (inStem || inBowlRing) {
          // White glyph strokes on top of the brand-color fill.
          rr = 255; gg = 255; bb = 255;
        }
      }

      pixels[offset] = rr;
      pixels[offset + 1] = gg;
      pixels[offset + 2] = bb;
      pixels[offset + 3] = aa;
    }
  }
  return pixels;
}

function isInsideRoundedSquare(x, y, size, margin) {
  const radius = margin * 1.6;
  const left = margin, top = margin, right = size - margin, bottom = size - margin;
  if (x < left || x >= right || y < top || y >= bottom) return false;

  const nearLeft = x < left + radius;
  const nearRight = x >= right - radius;
  const nearTop = y < top + radius;
  const nearBottom = y >= bottom - radius;

  if ((nearLeft || nearRight) && (nearTop || nearBottom)) {
    const cx = nearLeft ? left + radius : right - radius;
    const cy = nearTop ? top + radius : bottom - radius;
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= radius * radius;
  }
  return true;
}

function encodePng(size, color) {
  const pixels = drawIcon(size, color);
  const rowBytes = size * 4;
  const raw = Buffer.alloc((rowBytes + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (rowBytes + 1)] = 0; // filter: none
    pixels.copy(raw, y * (rowBytes + 1) + 1, y * rowBytes, (y + 1) * rowBytes);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const idat = deflateSync(raw, { level: 9 });

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const FOCUS_ACCENT = [0xe8, 0x5d, 0x3f]; // matches --focus light-mode value (#e85d3f) in src/styles/tokens.css

mkdirSync(path.join(publicDir, "icons"), { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(path.join(publicDir, "icons", `icon-${size}.png`), encodePng(size, FOCUS_ACCENT));
}
writeFileSync(path.join(publicDir, "icons", "apple-touch-icon.png"), encodePng(180, FOCUS_ACCENT));
writeFileSync(path.join(publicDir, "icons", "icon-maskable-512.png"), encodePng(512, FOCUS_ACCENT));
console.log("Wrote icons to public/icons/");

// ---- WAV (alarm placeholder) --------------------------------------------

/**
 * Short two-tone "beep-beep" placeholder alarm (no licensed sound asset
 * exists yet -- see constants/timer.constants.ts's TODO). Plain PCM16 mono
 * WAV so no encoder dependency is needed; every evergreen browser plays
 * WAV via HTMLAudioElement natively.
 */
function generateBeepWav() {
  const sampleRate = 44100;
  const toneHz = 880;
  const toneSeconds = 0.15;
  const gapSeconds = 0.08;
  const repeats = 2;

  const toneSamples = Math.round(sampleRate * toneSeconds);
  const gapSamples = Math.round(sampleRate * gapSeconds);
  const totalSamples = repeats * toneSamples + (repeats - 1) * gapSamples;

  const data = Buffer.alloc(totalSamples * 2);
  let offset = 0;
  for (let repeat = 0; repeat < repeats; repeat++) {
    for (let i = 0; i < toneSamples; i++) {
      // Linear fade in/out over 10ms to avoid a clicky waveform edge.
      const fadeSamples = Math.round(sampleRate * 0.01);
      const fade = Math.min(1, Math.min(i, toneSamples - 1 - i) / fadeSamples);
      const sample = Math.sin((2 * Math.PI * toneHz * i) / sampleRate) * fade * 0.5;
      data.writeInt16LE(Math.round(sample * 32767), offset);
      offset += 2;
    }
    if (repeat < repeats - 1) {
      data.fill(0, offset, offset + gapSamples * 2);
      offset += gapSamples * 2;
    }
  }

  const byteRate = sampleRate * 2;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36, "ascii");
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}

mkdirSync(path.join(publicDir, "sounds"), { recursive: true });
writeFileSync(path.join(publicDir, "sounds", "alarm.wav"), generateBeepWav());
console.log("Wrote public/sounds/alarm.wav");
