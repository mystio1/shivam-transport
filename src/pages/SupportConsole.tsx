import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, Paper, Stack, TextField, Tooltip, Typography, useTheme,
} from '@mui/material';
import { AcUnit, AdminPanelSettings, Business, Clear, Logout, Search, Tune, VpnKey } from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';
import LoadingOverlay from '../components/LoadingOverlay';
import type { SupportBusinessSummary } from '../types';

// Not linked from anywhere in the client-facing app — reachable only by navigating straight to
// this URL (#/support). Entirely separate credential from any business's own login: a single
// shared password (SUPPORT_ACCESS_PASSWORD on the server) grants a short-lived token that can
// list every business and open any of them as their admin, for remote troubleshooting.
const SUPPORT_TOKEN_KEY = 'shivam_support_token';

const SupportConsole = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { supportLogin, supportListBusinesses, supportAccessBusiness, supportSetFrozen, supportSetLimits } = useAppContext();

  const [supportToken, setSupportToken] = useState<string | null>(() => sessionStorage.getItem(SUPPORT_TOKEN_KEY));
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [businesses, setBusinesses] = useState<SupportBusinessSummary[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [accessTarget, setAccessTarget] = useState<SupportBusinessSummary | null>(null);
  const [accessing, setAccessing] = useState(false);
  const [accessError, setAccessError] = useState('');

  const [freezeTarget, setFreezeTarget] = useState<SupportBusinessSummary | null>(null);
  const [freezing, setFreezing] = useState(false);
  const [freezeError, setFreezeError] = useState('');

  const [manageTarget, setManageTarget] = useState<SupportBusinessSummary | null>(null);
  const [maxDriversInput, setMaxDriversInput] = useState('');
  const [maxAdminsInput, setMaxAdminsInput] = useState('');
  const [maxBillsPerDayInput, setMaxBillsPerDayInput] = useState('');
  const [managing, setManaging] = useState(false);
  const [manageError, setManageError] = useState('');

  const loadBusinesses = async (token: string) => {
    setLoadingList(true);
    setLoadError('');
    try {
      const groups = await supportListBusinesses(token);
      setBusinesses(groups);
    } catch (error) {
      // An expired/invalid support token looks the same as any other failure here — bounce back
      // to the password screen rather than showing a list that can't actually be used.
      sessionStorage.removeItem(SUPPORT_TOKEN_KEY);
      setSupportToken(null);
      setLoadError(error instanceof Error ? error.message : 'Could not load businesses');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (supportToken) loadBusinesses(supportToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportToken]);

  const handleLogin = async () => {
    if (!password.trim()) {
      setLoginError('Enter the support password');
      return;
    }
    setLoggingIn(true);
    setLoginError('');
    try {
      const token = await supportLogin(password);
      sessionStorage.setItem(SUPPORT_TOKEN_KEY, token);
      setPassword('');
      setSupportToken(token);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Could not log in');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleExitSupport = () => {
    sessionStorage.removeItem(SUPPORT_TOKEN_KEY);
    setSupportToken(null);
    setBusinesses([]);
  };

  const handleConfirmAccess = async () => {
    if (!accessTarget || !supportToken) return;
    setAccessing(true);
    setAccessError('');
    try {
      await supportAccessBusiness(supportToken, accessTarget.code);
      navigate('/');
    } catch (error) {
      setAccessError(error instanceof Error ? error.message : 'Could not access this business');
    } finally {
      setAccessing(false);
    }
  };

  const handleConfirmFreeze = async () => {
    if (!freezeTarget || !supportToken) return;
    const nextFrozen = !freezeTarget.frozen;
    setFreezing(true);
    setFreezeError('');
    try {
      await supportSetFrozen(supportToken, freezeTarget.code, nextFrozen);
      setBusinesses(prev => prev.map(b => (b.code === freezeTarget.code ? { ...b, frozen: nextFrozen } : b)));
      setFreezeTarget(null);
    } catch (error) {
      setFreezeError(error instanceof Error ? error.message : 'Could not update freeze status');
    } finally {
      setFreezing(false);
    }
  };

  const openManageDialog = (business: SupportBusinessSummary) => {
    setManageError('');
    setMaxDriversInput(business.maxDrivers != null ? String(business.maxDrivers) : '');
    setMaxAdminsInput(business.maxAdmins != null ? String(business.maxAdmins) : '');
    setMaxBillsPerDayInput(business.maxBillsPerDay != null ? String(business.maxBillsPerDay) : '');
    setManageTarget(business);
  };

  // Blank means unlimited; anything else must be a positive whole number — same rule the server
  // enforces, checked here too so a typo shows up immediately instead of after a round trip.
  const parseLimitInput = (value: string, label: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (!Number.isInteger(n) || n <= 0) throw new Error(`${label} must be a positive whole number, or left blank for unlimited`);
    return n;
  };

  const handleSaveLimits = async () => {
    if (!manageTarget || !supportToken) return;
    setManageError('');
    let limits: { maxDrivers: number | null; maxAdmins: number | null; maxBillsPerDay: number | null };
    try {
      limits = {
        maxDrivers: parseLimitInput(maxDriversInput, 'Max drivers'),
        maxAdmins: parseLimitInput(maxAdminsInput, 'Max admins'),
        maxBillsPerDay: parseLimitInput(maxBillsPerDayInput, 'Max bills per day'),
      };
    } catch (error) {
      setManageError(error instanceof Error ? error.message : 'Invalid limit');
      return;
    }
    setManaging(true);
    try {
      await supportSetLimits(supportToken, manageTarget.code, limits);
      setBusinesses(prev => prev.map(b => (b.code === manageTarget.code ? { ...b, ...limits } : b)));
      setManageTarget(null);
    } catch (error) {
      setManageError(error instanceof Error ? error.message : 'Could not save limits');
    } finally {
      setManaging(false);
    }
  };

  const visibleBusinesses = businesses.filter(b => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q);
  });

  // ── Password gate ─────────────────────────────────────────────────────────
  if (!supportToken) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          width: '100%',
          backgroundImage: `linear-gradient(rgba(11, 14, 17, 0.65), rgba(11, 14, 17, 0.85)), url(/login-bg.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Paper
          elevation={24}
          sx={{
            p: 4,
            maxWidth: 400,
            width: '100%',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(18, 24, 38, 0.85)' : 'rgba(255, 255, 255, 0.90)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)'}`,
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.45)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <VpnKey sx={{ color: '#F0B90B' }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>Support Console</Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Internal tool — access any business's admin account for remote troubleshooting.
          </Typography>
          {loginError && <Alert severity="error" sx={{ mb: 2 }}>{loginError}</Alert>}
          <TextField
            autoFocus
            label="Support Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            fullWidth
            disabled={loggingIn}
          />
          <Button
            variant="contained"
            fullWidth
            onClick={handleLogin}
            disabled={loggingIn}
            sx={{ mt: 2, color: 'primary.contrastText', fontWeight: 800, py: 1.2 }}
          >
            {loggingIn ? 'Checking...' : 'Log In'}
          </Button>
        </Paper>
      </Box>
    );
  }

  // ── Business directory ────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, sm: 4 } }}>
      <Box sx={{ maxWidth: 900, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#F0B90B' }}>Support Console</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {businesses.length} business{businesses.length === 1 ? '' : 'es'} registered.
              </Typography>
            </Box>
            <Button size="small" startIcon={<Logout />} onClick={handleExitSupport} sx={{ color: 'text.secondary' }}>
              Exit Support Mode
            </Button>
          </Box>
        </Paper>

        {loadError && <Alert severity="error">{loadError}</Alert>}

        <TextField
          placeholder="Search by business name or code..."
          size="small"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment>,
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')}><Clear fontSize="small" /></IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: `1px solid ${theme.palette.divider}` }}>
          {loadingList ? (
            <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>Loading...</Typography>
          ) : visibleBusinesses.length === 0 ? (
            <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>No businesses match your search.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {visibleBusinesses.map(business => (
                <Box
                  key={business.code}
                  sx={{
                    p: 2, borderRadius: 2, bgcolor: 'action.hover', border: `1px solid ${theme.palette.divider}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <Business sx={{ color: '#F0B90B' }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{business.name}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}>
                        <Chip size="small" label={`Code: ${business.code}`} sx={{ bgcolor: 'rgba(240,185,11,0.12)', color: '#F0B90B', fontWeight: 700 }} />
                        {business.frozen && (
                          <Chip size="small" icon={<AcUnit sx={{ fontSize: 14, color: '#2196F3 !important' }} />} label="FROZEN" sx={{ bgcolor: 'rgba(33,150,243,0.15)', color: '#2196F3', fontWeight: 800 }} />
                        )}
                        <Chip
                          size="small"
                          label={`${business.adminCount}${business.maxAdmins != null ? `/${business.maxAdmins}` : ''} admin${business.adminCount === 1 && business.maxAdmins == null ? '' : 's'}`}
                          sx={business.maxAdmins != null && business.adminCount >= business.maxAdmins ? { bgcolor: 'rgba(246,70,93,0.12)', color: '#F6465D', fontWeight: 700 } : undefined}
                        />
                        <Chip
                          size="small"
                          label={`${business.driverCount}${business.maxDrivers != null ? `/${business.maxDrivers}` : ''} driver${business.driverCount === 1 && business.maxDrivers == null ? '' : 's'}`}
                          sx={business.maxDrivers != null && business.driverCount >= business.maxDrivers ? { bgcolor: 'rgba(246,70,93,0.12)', color: '#F6465D', fontWeight: 700 } : undefined}
                        />
                        <Chip size="small" label={`${business.customerCount} customers`} />
                        <Chip size="small" label={`${business.tripCount} trips`} />
                        {business.maxBillsPerDay != null && (
                          <Chip
                            size="small"
                            label={`Bills today: ${business.billsToday}/${business.maxBillsPerDay}`}
                            sx={business.billsToday >= business.maxBillsPerDay ? { bgcolor: 'rgba(246,70,93,0.12)', color: '#F6465D', fontWeight: 700 } : undefined}
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Tooltip title="Manage limits (drivers, admins, bills/day)">
                      <IconButton
                        onClick={() => openManageDialog(business)}
                        sx={{ color: 'text.secondary', '&:hover': { color: '#F0B90B', bgcolor: 'rgba(240,185,11,0.1)' } }}
                      >
                        <Tune />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={business.frozen ? 'Unfreeze this account' : 'Freeze this account'}>
                      <IconButton
                        onClick={() => { setFreezeError(''); setFreezeTarget(business); }}
                        sx={{
                          color: '#2196F3',
                          bgcolor: business.frozen ? 'rgba(33,150,243,0.15)' : 'transparent',
                          '&:hover': { bgcolor: 'rgba(33,150,243,0.2)' },
                        }}
                      >
                        <AcUnit />
                      </IconButton>
                    </Tooltip>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AdminPanelSettings />}
                      onClick={() => { setAccessError(''); setAccessTarget(business); }}
                      disabled={business.adminCount === 0}
                      sx={{ color: 'primary.contrastText', fontWeight: 700, flexShrink: 0 }}
                    >
                      Access Admin
                    </Button>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>

      <Dialog
        open={Boolean(accessTarget)}
        onClose={() => !accessing && setAccessTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { position: 'relative', overflow: 'hidden' } }}
      >
        <LoadingOverlay open={accessing} absolute label="Accessing business…" />
        <DialogTitle>Access {accessTarget?.name}?</DialogTitle>
        <DialogContent>
          {accessError && <Alert severity="error" sx={{ mb: 2 }}>{accessError}</Alert>}
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            This logs this browser into <strong>{accessTarget?.name}</strong> (code {accessTarget?.code}) as their
            admin. The action is recorded in that business's own audit log.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAccessTarget(null)} disabled={accessing}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmAccess} disabled={accessing} sx={{ color: 'primary.contrastText', fontWeight: 700 }}>
            {accessing ? 'Accessing...' : 'Access Admin'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(freezeTarget)}
        onClose={() => !freezing && setFreezeTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { position: 'relative', overflow: 'hidden' } }}
      >
        <LoadingOverlay open={freezing} absolute label={freezeTarget?.frozen ? 'Unfreezing…' : 'Freezing…'} />
        <DialogTitle>{freezeTarget?.frozen ? 'Unfreeze' : 'Freeze'} {freezeTarget?.name}?</DialogTitle>
        <DialogContent>
          {freezeError && <Alert severity="error" sx={{ mb: 2 }}>{freezeError}</Alert>}
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {freezeTarget?.frozen ? (
              <>This immediately restores access for every admin and driver logged into <strong>{freezeTarget?.name}</strong> (code {freezeTarget?.code}), on every device.</>
            ) : (
              <>This immediately locks out every admin and driver logged into <strong>{freezeTarget?.name}</strong> (code {freezeTarget?.code}), on every device — they'll see a full-screen notice to contact support.</>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFreezeTarget(null)} disabled={freezing}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmFreeze}
            disabled={freezing}
            color={freezeTarget?.frozen ? 'primary' : 'error'}
            sx={{ fontWeight: 700 }}
          >
            {freezing ? 'Please wait...' : freezeTarget?.frozen ? 'Unfreeze' : 'Freeze Account'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(manageTarget)}
        onClose={() => !managing && setManageTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { position: 'relative', overflow: 'hidden' } }}
      >
        <LoadingOverlay open={managing} absolute label="Saving…" />
        <DialogTitle>Manage Limits — {manageTarget?.name}</DialogTitle>
        <DialogContent>
          {manageError && <Alert severity="error" sx={{ mb: 2 }}>{manageError}</Alert>}
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Leave a field blank for unlimited. Applies immediately — a group already over a new
            limit isn't kicked out, but can't add more until back under it.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Max Drivers"
              type="number"
              value={maxDriversInput}
              onChange={e => setMaxDriversInput(e.target.value)}
              placeholder="Unlimited"
              helperText={manageTarget ? `Currently ${manageTarget.driverCount} active driver${manageTarget.driverCount === 1 ? '' : 's'}` : undefined}
              fullWidth
              inputProps={{ min: 1 }}
            />
            <TextField
              label="Max Admins"
              type="number"
              value={maxAdminsInput}
              onChange={e => setMaxAdminsInput(e.target.value)}
              placeholder="Unlimited"
              helperText={manageTarget ? `Currently ${manageTarget.adminCount} active admin${manageTarget.adminCount === 1 ? '' : 's'}` : undefined}
              fullWidth
              inputProps={{ min: 1 }}
            />
            <TextField
              label="Max Bills Generated Per Day"
              type="number"
              value={maxBillsPerDayInput}
              onChange={e => setMaxBillsPerDayInput(e.target.value)}
              placeholder="Unlimited"
              helperText={manageTarget ? `${manageTarget.billsToday} bill${manageTarget.billsToday === 1 ? '' : 's'} generated today` : undefined}
              fullWidth
              inputProps={{ min: 1 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageTarget(null)} disabled={managing}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveLimits} disabled={managing} sx={{ color: 'primary.contrastText', fontWeight: 700 }}>
            {managing ? 'Saving...' : 'Save Limits'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SupportConsole;
