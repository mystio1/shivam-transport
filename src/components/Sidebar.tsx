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
} from '@mui/material';
import { Dashboard, People, AssignmentTurnedIn, Send, Settings } from '@mui/icons-material';
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
  const { user, pendingTrips, group } = useAppContext();

  const navItems =
    user?.role === 'admin'
      ? [
          { text: 'Dashboard', icon: <Dashboard />, path: '/' },
          { text: 'Customers', icon: <People />, path: '/customers' },
          {
            text: `Approvals${pendingTrips.length ? ` (${pendingTrips.length})` : ''}`,
            icon: <AssignmentTurnedIn />,
            path: '/approvals',
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
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box 
          component="img"
          src="/logo.png"
          alt="Brand Logo"
          sx={{ width: '100%', maxWidth: 180, mb: 2, filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.5))' }}
        />
        <Typography variant="h6" sx={{ color: '#EAECEF', fontWeight: 800, textAlign: 'center', letterSpacing: '0.5px' }}>
          SHIVAM
        </Typography>
        <Typography variant="caption" sx={{ color: '#F0B90B', fontWeight: 600, letterSpacing: '1px' }}>
          TRANSPORT
        </Typography>
      </Box>
      <Divider sx={{ borderColor: '#2B3139' }} />
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
                  color: isActive ? '#F0B90B' : '#848E9C',
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
      <Box sx={{ p: 3 }}>
        <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#161A1E', border: '1px solid #2B3139', textAlign: 'center' }}>
           <Typography variant="caption" sx={{ color: '#848E9C', display: 'block', mb: 1 }}>
             Group Code
           </Typography>
           <Typography variant="body2" sx={{ color: '#EAECEF', fontWeight: 600 }}>
             {group?.code || user?.groupCode || 'LOGIN'}
           </Typography>
        </Box>
      </Box>
    </>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
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
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, backgroundColor: '#0B0E11', borderRight: '1px solid #2B3139' },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, backgroundColor: '#0B0E11', borderRight: '1px solid #2B3139' },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
