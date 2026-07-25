import { Alert, Box, Button, Container } from '@mui/material';
import { CloudOff } from '@mui/icons-material';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import Header from './Header';
import { useAppContext } from '../context/AppContext';
import Sidebar from './Sidebar';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { themeMode, pendingSyncCount, isSyncingOffline, flushPendingTrips } = useAppContext();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  useEffect(() => {
    document.body.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          width: '100%',
          '@media (min-width:1024px)': { width: 'calc(100% - 260px)' },
          overflowX: 'hidden',
          backgroundColor: '#0B0E11',
        }}
      >
        <Header handleDrawerToggle={handleDrawerToggle} />
        {pendingSyncCount > 0 && (
          <Alert
            severity="warning"
            icon={<CloudOff />}
            sx={{ borderRadius: 0, bgcolor: '#2A2500', color: '#F0B90B' }}
            action={
              <Button
                size="small"
                onClick={() => flushPendingTrips()}
                disabled={isSyncingOffline}
                sx={{ color: '#F0B90B', fontWeight: 700 }}
              >
                {isSyncingOffline ? 'Syncing...' : 'Retry now'}
              </Button>
            }
          >
            {pendingSyncCount} trip{pendingSyncCount > 1 ? 's' : ''} saved on this phone, waiting for a connection to sync.
          </Alert>
        )}
        <Container
          component="main"
          maxWidth="xl"
          sx={{
            flexGrow: 1,
            py: { xs: 2, sm: 4 },
            px: { xs: 1.5, sm: 3 },
          }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;