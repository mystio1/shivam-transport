// Shared by every "upload an image, store it as a data URL" flow (signature, header logos, ...)
// so the file-size guard and the quality/byte-budget search only exist once.

// A phone camera photo can easily be 10-20MB — reject before ever handing it to a canvas
// (decoding a huge image just to immediately downscale it is a real jank/memory cost on a low-end
// phone) rather than after. This is about the *source* file; the OUTPUT is separately capped by
// each caller's own byte budget regardless of what comes in.
export const MAX_SOURCE_FILE_BYTES = 15 * 1024 * 1024;

export function fileToImage(file: File): Promise<HTMLImageElement> {
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    return Promise.reject(new Error(`That image is too large (max ${Math.round(MAX_SOURCE_FILE_BYTES / (1024 * 1024))}MB). Try a smaller photo or a screenshot.`));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not read that image file'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(file);
  });
}

// Real byte size of a data URL's payload — `.length` on the string counts base64 characters,
// which overstate the actual decoded size by ~33%, so budget checks need this instead.
export function dataUrlByteSize(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

// Tries a sequence of quality levels (JPEG/WebP only — PNG has no quality knob) and keeps the
// smallest that fits the budget, or the smallest found at all if none do.
export function encodeWithBudget(canvas: HTMLCanvasElement, mimeType: string, maxBytes: number): string {
  const qualities = [0.85, 0.7, 0.55, 0.4];
  let smallest = canvas.toDataURL(mimeType, qualities[0]);
  for (const quality of qualities) {
    const candidate = canvas.toDataURL(mimeType, quality);
    if (dataUrlByteSize(candidate) < dataUrlByteSize(smallest)) smallest = candidate;
    if (dataUrlByteSize(candidate) <= maxBytes) return candidate;
  }
  return smallest;
}

// WebP is what actually makes a transparent image small (real lossy compression *with* an alpha
// channel, unlike PNG) — but a handful of very old browsers silently hand back a PNG from
// toDataURL('image/webp', ...) instead of erroring, so this checks the MIME prefix of what
// actually came back rather than assuming the request was honored.
export function supportsWebpEncoding(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').startsWith('data:image/webp');
}
