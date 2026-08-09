import { dataUrlByteSize, encodeWithBudget } from './imageEncoding';

// The fixed shape both the left and right header-logo slots use — kept identical for both so an
// image on one side never makes the header look lopsided compared to the other. A slightly
// landscape box (rather than square) fits how most company logos are actually shaped.
export const HEADER_IMAGE_ASPECT = 4 / 3;
export const HEADER_IMAGE_WIDTH = 320;
export const HEADER_IMAGE_HEIGHT = Math.round(HEADER_IMAGE_WIDTH / HEADER_IMAGE_ASPECT);

const TARGET_MAX_BYTES = 80 * 1024;

// How far an image's own aspect ratio may drift from the slot's before we bother asking the
// admin to crop it — small deviations just get an automatic center-crop instead of an extra step.
const ASPECT_TOLERANCE = 0.05;

export function imageAspect(img: HTMLImageElement): number {
  return img.width / img.height;
}

// True when the source is enough of a different shape (most commonly "more landscape", i.e.
// wider relative to its height) than the target slot that a plain center-crop would cut off a
// meaningful part of the image — that's when the admin should get to choose what stays in frame.
export function needsManualCrop(img: HTMLImageElement): boolean {
  const ratio = imageAspect(img) / HEADER_IMAGE_ASPECT;
  return ratio < 1 - ASPECT_TOLERANCE || ratio > 1 + ASPECT_TOLERANCE;
}

function encodeHeaderCanvas(canvas: HTMLCanvasElement): string {
  // Logos are frequently PNGs with a transparent background — try that first so transparency
  // survives. Only fall back to flattening onto white + lossy JPEG if PNG doesn't fit the budget.
  const png = canvas.toDataURL('image/png');
  if (dataUrlByteSize(png) <= TARGET_MAX_BYTES) return png;

  const flattened = document.createElement('canvas');
  flattened.width = canvas.width;
  flattened.height = canvas.height;
  const ctx = flattened.getContext('2d');
  if (!ctx) return png;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, flattened.width, flattened.height);
  ctx.drawImage(canvas, 0, 0);
  return encodeWithBudget(flattened, 'image/jpeg', TARGET_MAX_BYTES);
}

// Center-crops (no user input) for images already close enough in shape to the target slot.
export function autoFitHeaderImage(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = HEADER_IMAGE_WIDTH;
  canvas.height = HEADER_IMAGE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported on this device');

  const sourceAspect = imageAspect(img);
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (sourceAspect > HEADER_IMAGE_ASPECT) {
    sw = img.height * HEADER_IMAGE_ASPECT;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / HEADER_IMAGE_ASPECT;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return encodeHeaderCanvas(canvas);
}

// Renders the admin's chosen crop region (in the source image's own natural pixel coordinates —
// see ImageCropDialog for how that region is derived from on-screen drag/zoom) to the final,
// fixed-size header image.
export function renderHeaderImageCrop(
  img: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number },
): string {
  const canvas = document.createElement('canvas');
  canvas.width = HEADER_IMAGE_WIDTH;
  canvas.height = HEADER_IMAGE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported on this device');
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  return encodeHeaderCanvas(canvas);
}
