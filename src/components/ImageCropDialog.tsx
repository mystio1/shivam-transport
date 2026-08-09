import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Slider, Typography } from '@mui/material';
import { ZoomIn } from '@mui/icons-material';

interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropDialogProps {
  open: boolean;
  image: HTMLImageElement | null;
  aspect: number;
  viewportWidth?: number;
  title?: string;
  onCancel: () => void;
  onConfirm: (crop: CropRegion) => void;
}

// A "position and zoom" cropper (same idea as a profile-photo upload): the image always fully
// covers a fixed-shape viewport — drag to pick which part shows, the slider to zoom in — so
// there's never a gap to explain and the output is always exactly the target aspect ratio.
const ImageCropDialog = ({ open, image, aspect, viewportWidth = 280, title = 'Position your image', onCancel, onConfirm }: ImageCropDialogProps) => {
  const viewportHeight = Math.round(viewportWidth / aspect);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);

  const baseScale = image ? Math.max(viewportWidth / image.width, viewportHeight / image.height) : 1;
  const scale = baseScale * zoom;

  const clampOffset = (next: { x: number; y: number }, currentScale: number) => {
    if (!image) return next;
    const dispW = image.width * currentScale;
    const dispH = image.height * currentScale;
    const minX = Math.min(0, viewportWidth - dispW);
    const minY = Math.min(0, viewportHeight - dispH);
    return {
      x: Math.min(0, Math.max(minX, next.x)),
      y: Math.min(0, Math.max(minY, next.y)),
    };
  };

  // Re-center whenever a new image is loaded into the dialog.
  useEffect(() => {
    if (!image) return;
    setZoom(1);
    const initialScale = Math.max(viewportWidth / image.width, viewportHeight / image.height);
    const dispW = image.width * initialScale;
    const dispH = image.height * initialScale;
    setOffset({ x: (viewportWidth - dispW) / 2, y: (viewportHeight - dispH) / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image]);

  const handleZoomChange = (nextZoom: number) => {
    if (!image) return;
    const nextScale = baseScale * nextZoom;
    // Zoom around the viewport's center so the subject under it doesn't jump.
    const centerImgX = (viewportWidth / 2 - offset.x) / scale;
    const centerImgY = (viewportHeight / 2 - offset.y) / scale;
    const next = {
      x: viewportWidth / 2 - centerImgX * nextScale,
      y: viewportHeight / 2 - centerImgY * nextScale,
    };
    setZoom(nextZoom);
    setOffset(clampOffset(next, nextScale));
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, offsetX: offset.x, offsetY: offset.y };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset(clampOffset({ x: dragState.current.offsetX + dx, y: dragState.current.offsetY + dy }, scale));
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  const handleConfirm = () => {
    if (!image) return;
    onConfirm({
      x: -offset.x / scale,
      y: -offset.y / scale,
      width: viewportWidth / scale,
      height: viewportHeight / scale,
    });
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          That image doesn't match this slot's shape — drag to position it and use the slider to zoom.
          Only what's inside the frame will be uploaded.
        </Typography>
        {image && (
          <>
            <Box
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              sx={{
                width: viewportWidth,
                height: viewportHeight,
                mx: 'auto',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 1,
                border: theme => `2px solid ${theme.palette.divider}`,
                bgcolor: '#111',
                cursor: 'grab',
                touchAction: 'none',
                userSelect: 'none',
              }}
            >
              <img
                src={image.src}
                alt="Crop preview"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: offset.x,
                  top: offset.y,
                  width: image.width * scale,
                  height: image.height * scale,
                  maxWidth: 'none',
                  pointerEvents: 'none',
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2, px: 1 }}>
              <ZoomIn sx={{ color: 'text.secondary' }} />
              <Slider
                value={zoom}
                min={1}
                max={3}
                step={0.01}
                onChange={(_, value) => handleZoomChange(value as number)}
              />
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleConfirm} sx={{ color: 'primary.contrastText', fontWeight: 700 }}>
          Use This Crop
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageCropDialog;
