import { dataUrlByteSize, encodeWithBudget, fileToImage } from './imageEncoding';
import type { Branding } from '../types';

// Unlike the header logo slots, a QR code must never be cropped — cutting off any part of the
// pattern can make it unscannable — so this only resizes (never crops) and disables image
// smoothing on the resize so downscaling doesn't blur the fine black/white pattern the way a
// photo-oriented resize would.
const MAX_DIMENSION = 640;
const TARGET_MAX_BYTES = 150 * 1024;

export async function processUpiQrImage(file: File): Promise<string> {
  const img = await fileToImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported on this device');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, width, height);

  // PNG first (lossless — safest for a scannable pattern); only fall back to JPEG if a
  // genuinely large source image can't fit the budget losslessly.
  const png = canvas.toDataURL('image/png');
  if (dataUrlByteSize(png) <= TARGET_MAX_BYTES) return png;
  return encodeWithBudget(canvas, 'image/jpeg', TARGET_MAX_BYTES);
}

// Whether the UPI QR should appear on a bill of this type, per the admin's "Show on" preference.
export function shouldShowUpiQr(
  branding: Pick<Branding, 'upiQrImageDataUrl' | 'upiQrShowOn'> | null | undefined,
  isGstBill: boolean,
): boolean {
  if (!branding?.upiQrImageDataUrl) return false;
  if (branding.upiQrShowOn === 'gst') return isGstBill;
  if (branding.upiQrShowOn === 'non-gst') return !isGstBill;
  return true; // 'both' (also the fallback for records saved before this preference existed)
}
