import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AppProvider } from './context/AppContext';
import { useAppContext } from './context/AppContext';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import Dashboard from './components/Dashboard';
import CustomerList from './components/CustomerList';
import CustomerDetails from './pages/CustomerDetails';
import AuthPage from './pages/AuthPage';
import AdminTripApprovals from './pages/AdminTripApprovals';
import DriverSubmitTrip from './pages/DriverSubmitTrip';
import DriverTrips from './pages/DriverTrips';
import BrandingSettings from './pages/BrandingSettings';
import DriverList from './pages/DriverList';
import DriverDetails from './pages/DriverDetails';
import AllTrips from './pages/AllTrips';
import AddTrip from './pages/AddTrip';
import MyBills from './pages/MyBills';
import { useMemo } from 'react';
import type {} from '@mui/x-date-pickers/AdapterDayjs';

// Binance Professional Modern Theme with Dynamic Mode
const getDashboardTheme = (mode: 'light' | 'dark') => createTheme({
  palette: {
    mode,
    primary: {
      main: '#F0B90B', // Binance Gold
      contrastText: '#0B0E11', // Black text on gold
    },
    secondary: {
      main: '#0ECB81', // Binance Green
      contrastText: '#fff',
    },
    background: {
      default: mode === 'dark' ? '#0B0E11' : '#f4f6f8',
      paper: mode === 'dark' ? '#161A1E' : '#fff',
    },
    text: {
      primary: mode === 'dark' ? '#EAECEF' : '#1E2329',
      secondary: mode === 'dark' ? '#848E9C' : '#474D57',
    },
    error: {
      main: '#F6465D', // Binance Red
    },
    warning: {
      main: '#F0B90B',
    },
    info: {
      main: '#2B3139',
    },
    success: {
      main: '#0ECB81',
    },
    divider: mode === 'dark' ? '#2B3139' : 'rgba(0,0,0,0.08)',
  },
  typography: {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
    h4: { fontWeight: 800, letterSpacing: 0.5 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0.2 },
    body1: { fontWeight: 500 },
    body2: { fontWeight: 400 },
  },
  shape: {
    borderRadius: 8, // Slightly sharper corners
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'dark' ? '#0B0E11' : '#ffffff',
          color: mode === 'dark' ? '#EAECEF' : '#1E2329',
          borderBottom: `1px solid ${mode === 'dark' ? '#2B3139' : '#EAECEF'}`,
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: mode === 'dark' ? '#161A1E' : '#fff',
          boxShadow: 'none',
          border: `1px solid ${mode === 'dark' ? '#2B3139' : '#EAECEF'}`,
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: mode === 'dark' ? '#161A1E' : '#fff',
          boxShadow: 'none',
          border: `1px solid ${mode === 'dark' ? '#2B3139' : '#EAECEF'}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
          padding: '8px 20px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          backgroundColor: '#F0B90B',
          color: '#0B0E11',
          '&:hover': {
            backgroundColor: '#FCD535',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 6,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: mode === 'dark' ? '#2B3139' : '#EAECEF',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundColor: mode === 'dark' ? '#1E2329' : '#fff',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: mode === 'dark' ? '#2B3139' : '#EAECEF',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#F0B90B',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#F0B90B',
          },
        },
      },
    },
  },
});

const AppWithTheme = () => {
  const { themeMode, user, authLoading } = useAppContext();
  // Force dark mode for binance theme, but allow toggle if really wanted
  const activeMode = themeMode === 'light' ? 'light' : 'dark';
  const theme = useMemo(() => getDashboardTheme(activeMode), [activeMode]);

  if (authLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#0B0E11', color: '#EAECEF' }}>
          Loading Shivam Transport...
        </Box>
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthPage />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ color: 'text.primary', minHeight: '100vh', background: theme.palette.background.default }}>
        <Router>
          <ScrollToTop />
          <Layout>
            <Routes>
              {user.role === 'admin' ? (
                <>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/customers" element={<CustomerList />} />
                  <Route path="/approvals" element={<AdminTripApprovals />} />
                  <Route path="/customer/:id" element={<CustomerDetails />} />
                  <Route path="/drivers" element={<DriverList />} />
                  <Route path="/driver/:id" element={<DriverDetails />} />
                  <Route path="/trips" element={<AllTrips />} />
                  <Route path="/add-trip" element={<AddTrip />} />
                  <Route path="/my-bills" element={<MyBills />} />
                  <Route path="/settings" element={<BrandingSettings />} />
                </>
              ) : (
                <>
                  <Route path="/" element={<DriverTrips />} />
                  <Route path="/submit" element={<DriverSubmitTrip />} />
                </>
              )}
            </Routes>
          </Layout>
        </Router>
      </Box>
    </ThemeProvider>
  );
};

function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AppProvider>
        <AppWithTheme />
      </AppProvider>
    </LocalizationProvider>
  );
}

export default App;
