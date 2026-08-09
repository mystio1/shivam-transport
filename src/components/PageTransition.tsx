import { useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import type { ReactNode } from 'react';

// Keying on pathname forces a remount of this Box whenever the route changes, which is what
// makes the fade-scale-in CSS animation (defined once in index.css) replay on every navigation —
// a soft entrance instead of new content just snapping into place. Wraps only the routed content
// (not Layout/Sidebar/Header), so the shell around it stays stable across navigation.
const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return (
    <Box key={location.pathname} sx={{ animation: 'fade-scale-in 240ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
      {children}
    </Box>
  );
};

export default PageTransition;
