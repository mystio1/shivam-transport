import { AppBar, Toolbar, Box, Container, IconButton, Menu, MenuItem, Tooltip, Typography, Chip, Button } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import BackupIcon from '@mui/icons-material/Backup';
import RestoreIcon from '@mui/icons-material/Restore';
import { useState } from 'react';
import DataBackupRestore from './DataBackupRestore';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAppContext } from '../context/AppContext';
interface HeaderProps {
  handleDrawerToggle?: () => void;
}

const Header = ({ handleDrawerToggle }: HeaderProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const { user, group, logout } = useAppContext();
  
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
    <AppBar position="static" color="primary" elevation={0} sx={{ borderBottom: '1px solid #2B3139', backgroundColor: '#0B0E11' }}>
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
            sx={{ display: 'block', '@media (min-width:1024px)': { display: 'none' }, color: '#EAECEF', fontWeight: 800 }}
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
              <Typography variant="body2" sx={{ color: '#EAECEF', fontWeight: 700 }}>
                {user.name}
                {user.userCode && (
                  <Box component="span" sx={{ color: '#848E9C', fontWeight: 500 }}> · {user.userCode}</Box>
                )}
              </Typography>
            </Box>
          )}
          
          {/* Data Management Menu */}
          <IconButton 
            onClick={handleMenuOpen}
            aria-label="data management"
            aria-controls="data-menu"
            aria-haspopup="true"
            sx={{ 
              color: '#848E9C',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { color: '#EAECEF', backgroundColor: '#2B3139' }
            }}
          >
            <SettingsIcon />
          </IconButton>

          {/* Icon-only logout on phone screens — the text button below is desktop-only */}
          <Tooltip title="Logout">
            <IconButton
              onClick={logout}
              aria-label="logout"
              sx={{
                display: { xs: 'inline-flex', sm: 'none' },
                color: '#848E9C',
                '&:hover': { color: '#F6465D', backgroundColor: '#2B3139' },
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
              sx={{ ml: 1, color: '#848E9C', display: { xs: 'none', sm: 'inline-flex' } }}
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
                backgroundColor: '#1E2329',
                border: '1px solid #2B3139',
                boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                color: '#EAECEF'
              }
            }}
          >
            <MenuItem onClick={handleBackup} sx={{ py: 1.2, fontWeight: 500, '&:hover': { backgroundColor: '#2B3139' } }}>
              <BackupIcon fontSize="small" sx={{ mr: 1.5, color: '#F0B90B' }} />
              <strong>Backup Data</strong>
            </MenuItem>
            <MenuItem onClick={handleRestore} sx={{ py: 1.2, fontWeight: 500, '&:hover': { backgroundColor: '#2B3139' } }}>
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
