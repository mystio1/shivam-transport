import { AppBar, Toolbar, Box, Container, IconButton, Menu, MenuItem, Tooltip, Typography, Chip, Button, useTheme } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import BackupIcon from '@mui/icons-material/Backup';
import RestoreIcon from '@mui/icons-material/Restore';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useState } from 'react';
import DataBackupRestore from './DataBackupRestore';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import { useAppContext } from '../context/AppContext';
import NotificationCenter from './NotificationCenter';
interface HeaderProps {
  handleDrawerToggle?: () => void;
}

// Same VITE_TRACKMARG_URL convention as Ledger+'s Settings screen - overridable per-build so
// this can be pointed at the real hub the moment it has a home, with no code change.
const TRACKMARG_HUB_URL = import.meta.env.VITE_TRACKMARG_URL || 'https://trackmarg.in';

const Header = ({ handleDrawerToggle }: HeaderProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const { user, group, logout, themeMode, toggleThemeMode } = useAppContext();
  const theme = useTheme();
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleBackup = () => {
    handleMenuClose();
    setBackupDialogOpen(true);
  };

  const handleRestore = () => {
    handleMenuClose();
    setRestoreDialogOpen(true);
  };

  return (
    <AppBar
      position="static"
      color="primary"
      elevation={0}
      sx={{
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: 'background.default',
        // Pushes the toolbar below a phone's notch/status bar when the app runs edge-to-edge
        // (Capacitor's viewport-fit=cover) — resolves to 0 (no change) on anything without one.
        pt: 'env(safe-area-inset-top)',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar sx={{ py: 1.5, px: { xs: 0, sm: 2 } }}>
          {handleDrawerToggle && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: 'inline-flex', '@media (min-width:1024px)': { display: 'none' }, color: '#F0B90B' }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ display: 'block', '@media (min-width:1024px)': { display: 'none' }, color: 'text.primary', fontWeight: 800 }}
          >
            SHIVAM
          </Typography>
          <Box sx={{ flexGrow: 1 }} />

          {user && (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1.5, mr: 2 }}>
              <Chip
                label={`Code: ${group?.code || user.groupCode}`}
                size="small"
                sx={{ bgcolor: 'rgba(240,185,11,0.12)', color: '#F0B90B', fontWeight: 800 }}
              />
              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 700 }}>
                {user.name}
                {user.userCode && (
                  <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}> · {user.userCode}</Box>
                )}
              </Typography>
            </Box>
          )}

          {/* Document-reminder notification center — admin only */}
          {user?.role === 'admin' && <NotificationCenter />}

          {/* Light/Dark theme toggle */}
          <Tooltip title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton
              onClick={toggleThemeMode}
              aria-label="toggle color theme"
              sx={{
                color: 'text.secondary',
                transition: 'all 0.2s ease-in-out',
                '&:hover': { color: '#F0B90B', backgroundColor: 'divider' },
              }}
            >
              {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {/* Data Management Menu */}
          <IconButton
            onClick={handleMenuOpen}
            aria-label="data management"
            aria-controls="data-menu"
            aria-haspopup="true"
            sx={{ 
              color: 'text.secondary',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { color: 'text.primary', backgroundColor: 'divider' }
            }}
          >
            <SettingsIcon />
          </IconButton>

          {/* Icon-only on phone screens — the text button below is desktop-only */}
          <Tooltip title="Exit to TrackMarg">
            <IconButton
              onClick={() => { window.location.href = TRACKMARG_HUB_URL; }}
              aria-label="exit to trackmarg"
              sx={{
                display: { xs: 'inline-flex', sm: 'none' },
                color: 'text.secondary',
                '&:hover': { color: '#F0B90B', backgroundColor: 'divider' },
              }}
            >
              <HomeIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Exit to TrackMarg">
            <Button
              onClick={() => { window.location.href = TRACKMARG_HUB_URL; }}
              color="inherit"
              startIcon={<HomeIcon />}
              sx={{ ml: 1, color: 'text.secondary', display: { xs: 'none', sm: 'inline-flex' } }}
            >
              Exit to TrackMarg
            </Button>
          </Tooltip>

          {/* Icon-only logout on phone screens — the text button below is desktop-only */}
          <Tooltip title="Logout">
            <IconButton
              onClick={logout}
              aria-label="logout"
              sx={{
                display: { xs: 'inline-flex', sm: 'none' },
                color: 'text.secondary',
                '&:hover': { color: '#F6465D', backgroundColor: 'divider' },
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Logout">
            <Button
              onClick={logout}
              color="inherit"
              startIcon={<LogoutIcon />}
              sx={{ ml: 1, color: 'text.secondary', display: { xs: 'none', sm: 'inline-flex' } }}
            >
              Logout
            </Button>
          </Tooltip>
          
          <Menu
            id="data-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            sx={{
              '& .MuiPaper-root': {
                backgroundColor: 'background.paper',
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                color: 'text.primary'
              }
            }}
          >
            <MenuItem onClick={handleBackup} sx={{ py: 1.2, fontWeight: 500, '&:hover': { backgroundColor: 'divider' } }}>
              <BackupIcon fontSize="small" sx={{ mr: 1.5, color: '#F0B90B' }} />
              <strong>Backup Data</strong>
            </MenuItem>
            <MenuItem onClick={handleRestore} sx={{ py: 1.2, fontWeight: 500, '&:hover': { backgroundColor: 'divider' } }}>
              <RestoreIcon fontSize="small" sx={{ mr: 1.5, color: '#0ECB81' }} />
              <strong>Restore Data</strong>
            </MenuItem>
          </Menu>
          
          {/* Backup/Restore Dialogs */}
          <DataBackupRestore 
            open={backupDialogOpen} 
            onClose={() => setBackupDialogOpen(false)} 
            mode="backup" 
          />
          <DataBackupRestore 
            open={restoreDialogOpen} 
            onClose={() => setRestoreDialogOpen(false)} 
            mode="restore" 
          />
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;
