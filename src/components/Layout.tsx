import { Alert, Box, Button, Container, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { AcUnit, CloudOff, EventNote } from '@mui/icons-material';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import { useAppContext } from '../context/AppContext';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { themeMode, pendingSyncCount, isSyncingOffline, flushPendingTrips, user, group, activeDocumentReminders } = useAppContext();
  const isFrozen = Boolean(group?.frozen);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  useEffect(() => {
    document.body.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  const { expiredCount, dueSoonCount } = useMemo(() => {
    let expired = 0;
    let dueSoon = 0;
    for (const reminder of activeDocumentReminders) {
      if (reminder.status.state === 'expired') expired += 1;
      else dueSoon += 1;
    }
    return { expiredCount: expired, dueSoonCount: dueSoon };
  }, [activeDocumentReminders]);

  const showReminderBanner = user?.role === 'admin' && !reminderDismissed && (expiredCount > 0 || dueSoonCount > 0);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Greyed out and inert (but still mounted) while frozen — the overlay below is the only
          thing left interactive, so support's freeze can't be worked around by dismissing it. */}
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          filter: isFrozen ? 'grayscale(1)' : 'none',
          pointerEvents: isFrozen ? 'none' : 'auto',
          userSelect: isFrozen ? 'none' : 'auto',
        }}
        aria-hidden={isFrozen}
      >
        <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            width: '100%',
            '@media (min-width:1024px)': { width: 'calc(100% - 260px)' },
            overflowX: 'hidden',
            backgroundColor: 'background.default',
          }}
        >
          <Header handleDrawerToggle={handleDrawerToggle} />
          {pendingSyncCount > 0 && (
            <Alert
              severity="warning"
              icon={<CloudOff />}
              sx={{ borderRadius: 0, bgcolor: alpha('#F0B90B', theme.palette.mode === 'dark' ? 0.15 : 0.12), color: theme.palette.mode === 'dark' ? '#F0B90B' : '#7A5A00' }}
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
          {showReminderBanner && (
            <Alert
              severity={expiredCount > 0 ? 'error' : 'warning'}
              icon={<EventNote />}
              onClose={() => setReminderDismissed(true)}
              sx={{ borderRadius: 0 }}
              action={
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => {
                    setReminderDismissed(true);
                    navigate('/document-reminders');
                  }}
                  sx={{ fontWeight: 700 }}
                >
                  View
                </Button>
              }
            >
              {[
                expiredCount > 0 ? `${expiredCount} document${expiredCount > 1 ? 's' : ''} expired` : null,
                dueSoonCount > 0 ? `${dueSoonCount} due soon` : null,
              ].filter(Boolean).join(' · ')} — check Document Reminders.
            </Alert>
          )}
          <Container
            component="main"
            maxWidth="xl"
            sx={{
              flexGrow: 1,
              py: { xs: 2, sm: 4 },
              px: { xs: 1.5, sm: 3 },
              // Clears a phone's home-indicator/gesture bar so the last button on a page (a form's
              // submit button, say) never sits flush against it — resolves to the normal py on
              // anything without one.
              pb: { xs: 'calc(16px + env(safe-area-inset-bottom))', sm: 'calc(32px + env(safe-area-inset-bottom))' },
            }}
          >
            {children}
          </Container>
        </Box>
      </Box>

      {isFrozen && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: theme.zIndex.modal + 100,
            bgcolor: 'rgba(10,10,10,0.94)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 2,
            px: 3,
            pt: 'calc(24px + env(safe-area-inset-top))',
            pb: 'calc(24px + env(safe-area-inset-bottom))',
          }}
        >
          <AcUnit sx={{ fontSize: 64, color: '#42A5F5' }} />
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, maxWidth: 480 }}>
            Your account has been frozen by our support console
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)', maxWidth: 440 }}>
            Your data is safe with us. Contact our support team immediately for recovery.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Layout;