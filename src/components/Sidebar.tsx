import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  useTheme,
} from '@mui/material';
import { Dashboard, People, AssignmentTurnedIn, Send, Settings, LocalShipping, AddCircle, ReceiptLong, EventNote } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const drawerWidth = 260;

interface SidebarProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
}

const Sidebar = ({ mobileOpen, handleDrawerToggle }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { user, pendingTrips, group, activeDocumentReminders } = useAppContext();

  const expiringDocsCount = activeDocumentReminders.length;

  const navItems =
    user?.role === 'admin'
      ? [
          { text: 'Dashboard', icon: <Dashboard />, path: '/' },
          { text: 'Customers', icon: <People />, path: '/customers' },
          { text: 'Drivers', icon: <LocalShipping />, path: '/drivers' },
          { text: 'Add Trip', icon: <AddCircle />, path: '/add-trip' },
          {
            text: `Approvals${pendingTrips.length ? ` (${pendingTrips.length})` : ''}`,
            icon: <AssignmentTurnedIn />,
            path: '/approvals',
          },
          { text: 'My Bills', icon: <ReceiptLong />, path: '/my-bills' },
          {
            text: `Document Reminders${expiringDocsCount ? ` (${expiringDocsCount})` : ''}`,
            icon: <EventNote />,
            path: '/document-reminders',
          },
          { text: 'Bill Branding & Settings', icon: <Settings />, path: '/settings' },
        ]
      : [
          { text: 'My Trips', icon: <Dashboard />, path: '/' },
          { text: 'Submit Trip', icon: <Send />, path: '/submit' },
        ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const drawerContent = (
    <>
      <Box
        sx={{
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          // The drawer runs edge-to-edge on native, so its own top padding needs to clear a
          // phone's notch/status bar on top of the normal 24px visual gap — resolves to plain
          // 24px (no change) on anything without one.
          pt: 'calc(24px + env(safe-area-inset-top))',
        }}
      >
        <Box 
          component="img"
          src="/logo.png"
          alt="Brand Logo"
          sx={{ width: '100%', maxWidth: 180, mb: 2, filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.5))' }}
        />
        <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 800, textAlign: 'center', letterSpacing: '0.5px' }}>
          SHIVAM
        </Typography>
        <Typography variant="caption" sx={{ color: '#F0B90B', fontWeight: 600, letterSpacing: '1px' }}>
          TRANSPORT
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'divider' }} />
      <List sx={{ px: 2, pt: 3 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: 2,
                  backgroundColor: isActive ? 'rgba(240, 185, 11, 0.1)' : 'transparent',
                  color: isActive ? '#F0B90B' : 'text.secondary',
                  '&:hover': {
                    backgroundColor: isActive ? 'rgba(240, 185, 11, 0.15)' : 'rgba(255,255,255,0.05)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{ fontWeight: isActive ? 700 : 500 }} 
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ p: 3, pb: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
           <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
             Group Code
           </Typography>
           <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
             {group?.code || user?.groupCode || 'LOGIN'}
           </Typography>
        </Box>
      </Box>
    </>
  );

  // Fixed sidebar only from 1024px up (desktop/laptop); phone AND tablet (below that) get the
  // slide-out drawer instead — a plain MUI breakpoint alias would cut over at 600 or 900px,
  // so this uses an explicit media query to land exactly on the 1024px tablet/desktop line.
  const DESKTOP_QUERY = '@media (min-width:1024px)';

  return (
    <Box
      component="nav"
      sx={{ width: 0, flexShrink: 0, [DESKTOP_QUERY]: { width: drawerWidth, flexShrink: 0 } }}
      aria-label="mailbox folders"
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: 'block',
          [DESKTOP_QUERY]: { display: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, backgroundColor: 'background.default', borderRight: `1px solid ${theme.palette.divider}` },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: 'none',
          [DESKTOP_QUERY]: { display: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, backgroundColor: 'background.default', borderRight: `1px solid ${theme.palette.divider}` },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
