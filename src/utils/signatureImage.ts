// Client-side signature processing — no server upload, no external "remove.bg"-style API.
// Everything happens on a <canvas> in the browser: resize, then use LOCAL adaptive thresholding
// (Sauvola's method) to tell ink from paper — this is the key part. A single global cutoff
// (even a "smart" one like Otsu) breaks the moment the photo has any lighting gradient across
// it, because one side of the paper can be darker than the other side's ink highlights. Sauvola
// instead asks, per pixel, "is this darker than what's typical for *this neighbourhood*?" — so
// an unevenly-lit photo still gets a clean cutout, computed via an integral image so it stays
// fast regardless of window size.
import { encodeWithBudget, fileToImage, supportsWebpEncoding } from './imageEncoding';

// Same idea as a government portal's "signature must be under 50KB, ~140x60px" upload rule —
// except this auto-fits the image to the limit instead of just rejecting an oversized file and
// making the admin go find their own compression tool. A signature only ever prints at roughly
// 1.5-2 inches wide on a bill; at 300 DPI that's 450-600px, so 640x260 has real headroom for
// print sharpness while still being a fraction of a typical phone photo's resolution (and this
// image gets stored as base64 text directly in the database — see the branding schema comments
// for why keeping this small matters for a free-tier Postgres budget).
const MAX_WIDTH = 640;
const MAX_HEIGHT = 260;

// Target ceiling for the final encoded size. Chosen generously above the ~20-50KB governments
// commonly cap signature uploads at, since this is being auto-fit rather than hand-tuned by
// whoever's uploading it.
const TARGET_MAX_BYTES = 60 * 1024;

function drawToCanvas(img: HTMLImageElement): CanvasRenderingContext2D {
  const scale = Math.min(1, MAX_WIDTH / img.width, MAX_HEIGHT / img.height);
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is not supported on this device');
  ctx.drawImage(img, 0, 0, width, height);
  return ctx;
}

// Crops the canvas down to the bounding box of visible (non-transparent) pixels, with a little
// breathing room, so the signature fills its frame instead of sitting tiny in a large blank canvas.
function cropToContent(ctx: CanvasRenderingContext2D, padding = 14): CanvasRenderingContext2D {
  const { width, height } = ctx.canvas;
  const { data } = ctx.getImageData(0, 0, width, height);

  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 15) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return ctx; // nothing detected — return uncropped rather than error

  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  const cropped = document.createElement('canvas');
  cropped.width = cropWidth;
  cropped.height = cropHeight;
  const croppedCtx = cropped.getContext('2d');
  if (!croppedCtx) return ctx;
  croppedCtx.drawImage(ctx.canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return croppedCtx;
}

// Photo mode — just resized/compressed, no pixel changes. JPEG instead of PNG: this mode never
// touches transparency (no background removal happens here), so there's no alpha channel to lose,
// and JPEG's real lossy compression runs 5-10x smaller than lossless PNG on a photographic image.
export async function processSignaturePhoto(file: File): Promise<string> {
  const img = await fileToImage(file);
  const ctx = drawToCanvas(img);
  return encodeWithBudget(ctx.canvas, 'image/jpeg', TARGET_MAX_BYTES);
}

// Scan mode — Sauvola local adaptive threshold: each pixel is compared against the mean and
// standard deviation of its own neighbourhood (via an integral image, so window size doesn't
// cost extra time), fading paper to transparent with a soft ramp and normalizing surviving ink
// to a single dark tone, then cropping tightly to the strokes.
export async function processSignatureScan(file: File): Promise<string> {
  const img = await fileToImage(file);
  const ctx = drawToCanvas(img);
  const { width, height } = ctx.canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const pixelCount = width * height;

  const luminance = new Float64Array(pixelCount);
  for (let p = 0; p < pixelCount; p++) {
    const i = p * 4;
    luminance[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // Integral images (summed-area tables) of luminance and luminance² — let us read the mean
  // and stddev of any rectangular window in O(1), however large the window is.
  const sum = new Float64Array((width + 1) * (height + 1));
  const sumSq = new Float64Array((width + 1) * (height + 1));
  const idx = (x: number, y: number) => y * (width + 1) + x;
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    let rowSumSq = 0;
    for (let x = 0; x < width; x++) {
      const v = luminance[y * width + x];
      rowSum += v;
      rowSumSq += v * v;
      sum[idx(x + 1, y + 1)] = sum[idx(x + 1, y)] + rowSum;
      sumSq[idx(x + 1, y + 1)] = sumSq[idx(x + 1, y)] + rowSumSq;
    }
  }

  function windowStats(cx: number, cy: number, radius: number) {
    const x0 = Math.max(0, cx - radius);
    const y0 = Math.max(0, cy - radius);
    const x1 = Math.min(width, cx + radius + 1);
    const y1 = Math.min(height, cy + radius + 1);
    const area = (x1 - x0) * (y1 - y0);
    const s = sum[idx(x1, y1)] - sum[idx(x0, y1)] - sum[idx(x1, y0)] + sum[idx(x0, y0)];
    const sq = sumSq[idx(x1, y1)] - sumSq[idx(x0, y1)] - sumSq[idx(x1, y0)] + sumSq[idx(x0, y0)];
    const mean = s / area;
    const variance = Math.max(0, sq / area - mean * mean);
    return { mean, stddev: Math.sqrt(variance) };
  }

  // Window big enough to average out a lighting gradient, small enough to still be "local".
  const radius = Math.max(12, Math.round(Math.min(width, height) / 10));
  const k = 0.34;   // Sauvola sensitivity — higher = stricter about what counts as ink
  const R = 128;    // expected max stddev for normalization

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const { mean, stddev } = windowStats(x, y, radius);
      // Sauvola threshold: darker than this, for this neighbourhood, counts as ink.
      const threshold = mean * (1 + k * (stddev / R - 1));
      const distanceBelow = threshold - luminance[p];

      let alpha: number;
      if (distanceBelow <= 0) {
        alpha = 0;
      } else {
        // Ramp over ~20 luminance units below the threshold for anti-aliased edges instead
        // of a hard binary cutout.
        alpha = Math.min(255, Math.round((distanceBelow / 20) * 255));
      }

      const i = p * 4;
      data[i] = 20;
      data[i + 1] = 20;
      data[i + 2] = 28;
      data[i + 3] = Math.min(data[i + 3], alpha);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const finalCtx = cropToContent(ctx);
  // This mode's output is mostly flat transparent/ink regions, which PNG already compresses
  // reasonably well — but WebP (when the browser actually supports encoding it) still does
  // meaningfully better while keeping the alpha channel this mode depends on.
  const mimeType = supportsWebpEncoding() ? 'image/webp' : 'image/png';
  return encodeWithBudget(finalCtx.canvas, mimeType, TARGET_MAX_BYTES);
}
