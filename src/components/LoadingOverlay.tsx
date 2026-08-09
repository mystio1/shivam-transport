import { useEffect, useRef, useState } from 'react';
import { Backdrop, Box, Typography } from '@mui/material';

// Every "saving..." moment in the app plays this same short clip instead of a bare spinner —
// one consistent, branded loading animation instead of each screen picking its own.
const VIDEO_SRC = '/videos/saving-loader.mp4';

// The source file is a longer export than any save in this app ever takes — looping the whole
// thing would mean sitting through footage that has nothing to do with how long the wait
// actually is. Capping playback to a short segment (and looping THAT) keeps it feeling like a
// loading animation rather than "watch this video while you wait".
const MAX_LOOP_SECONDS = 10;
// A save that finishes in 200ms still shows the animation for this long — otherwise it just
// flashes and reads as a glitch rather than an intentional loading state.
const MIN_VISIBLE_MS = 4000;

interface LoadingOverlayProps {
  open: boolean;
  label?: string;
  /** Renders inline, filling its positioned parent, instead of as a full-viewport Backdrop. */
  absolute?: boolean;
}

// Reusable "something is happening" overlay for save/approve/reject actions — see
// AdminTripApprovals and BrandingSettings for how it's wired to an in-flight request.
const LoadingOverlay = ({ open, label = 'Saving…', absolute = false }: LoadingOverlayProps) => {
  const [visible, setVisible] = useState(false);
  const openedAtRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (open) {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      openedAtRef.current = Date.now();
      setVisible(true);
      return;
    }
    const openedAt = openedAtRef.current;
    if (openedAt == null) {
      setVisible(false);
      return;
    }
    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - openedAt));
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      openedAtRef.current = null;
    }, remaining);
  }, [open]);

  useEffect(() => () => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
  }, []);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.currentTime >= MAX_LOOP_SECONDS) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
  };

  if (!visible) return null;

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ width: 160, height: 160, borderRadius: 3, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
          onTimeUpdate={handleTimeUpdate}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </Box>
      <Typography sx={{ color: '#fff', fontWeight: 700, letterSpacing: 0.3 }}>{label}</Typography>
    </Box>
  );

  return (
    <Backdrop
      open={visible}
      sx={{
        position: absolute ? 'absolute' : 'fixed',
        zIndex: theme => theme.zIndex.modal + 1,
        borderRadius: absolute ? 'inherit' : 0,
        bgcolor: 'rgba(0,0,0,0.65)',
      }}
    >
      {content}
    </Backdrop>
  );
};

export default LoadingOverlay;
