import { useState } from 'react';
import {
  Alert, Box, Button, Chip, Container, FormControl, FormControlLabel,
  InputLabel, MenuItem, Paper, Select, Stack, Switch, TextField, Typography,
  IconButton, Tooltip, Accordion, AccordionSummary, AccordionDetails, Link,
  useTheme,
} from '@mui/material';
import { Lock, Login, PersonAdd, ContentCopy, Check, ExpandMore, Dns } from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';
import type { SignupInput } from '../context/AppContext';
import type { UserRole } from '../types';
import ForgotPasswordDialog from '../components/ForgotPasswordDialog';

const AuthPage = () => {
  const theme = useTheme();
  const { login, signup, serverUrl, saveServerUrl } = useAppContext();
  // This page has no neutral "choose" screen of its own - it defaults straight to Login.
  // TrackMarg's hub sends `?mode=signup` for its Get Started flow (and `?mode=login`, same as
  // the default, for Log In) so arriving here to create an account doesn't land on Login first.
  const [isSignup, setIsSignup] = useState(
    () => new URLSearchParams(window.location.search).get('mode') === 'signup',
  );
  const [role, setRole] = useState<UserRole>('admin');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [groupName, setGroupName] = useState('Shivam Transport');
  const [serverAddress, setServerAddress] = useState(serverUrl);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [newGroupCode, setNewGroupCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (serverAddress.trim() !== serverUrl) saveServerUrl(serverAddress.trim());
      if (isSignup) {
        const input: SignupInput = { name, phone, password, role, groupCode, groupName, email };
        const result = await signup(input);
        if (result.groupCode) setNewGroupCode(result.groupCode);
      } else {
        await login({ phone, password, groupCode });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (newGroupCode) {
      navigator.clipboard.writeText(newGroupCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Show group code screen after admin signup
  if (newGroupCode) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          // This screen has no Header/Layout chrome of its own to clear a notch/gesture bar, so
          // it needs its own safe-area padding — resolves to plain 32px on anything without one.
          pt: 'calc(32px + env(safe-area-inset-top))',
          pb: 'calc(32px + env(safe-area-inset-bottom))',
        }}
      >
        <Container maxWidth="sm">
          <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
            <Stack spacing={3}>
              <Box>
                <Chip label="Account Created!" sx={{ bgcolor: 'rgba(14,203,129,0.12)', color: '#0ECB81', fontWeight: 700, mb: 2 }} />
                <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 800 }}>Share this Group Code with your Drivers</Typography>
                <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>
                  Drivers must enter this code when signing up to join your transport group.
                </Typography>
              </Box>
              <Box sx={{ p: 3, bgcolor: 'background.default', border: '2px solid #F0B90B', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1, letterSpacing: 2 }}>
                  YOUR GROUP CODE
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Typography variant="h3" sx={{ color: '#F0B90B', fontWeight: 900, letterSpacing: 6, fontFamily: 'monospace' }}>
                    {newGroupCode}
                  </Typography>
                  <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
                    <IconButton onClick={handleCopy} sx={{ color: copied ? '#0ECB81' : '#F0B90B' }}>
                      {copied ? <Check /> : <ContentCopy />}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Alert severity="warning" sx={{ bgcolor: 'rgba(240,185,11,0.08)', color: '#F0B90B', border: '1px solid rgba(240,185,11,0.2)' }}>
                Save this code! Drivers need it to register. You can also find it in the sidebar after login.
              </Alert>
              <Button
                variant="contained"
                size="large"
                onClick={() => setNewGroupCode(null)}
                sx={{ color: 'primary.contrastText', fontWeight: 800 }}
              >
                Continue to Dashboard
              </Button>
            </Stack>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        pt: 'calc(32px + env(safe-area-inset-top))',
        pb: 'calc(32px + env(safe-area-inset-bottom))',
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
          <Stack spacing={3}>
            <Box>
              <Chip label="Laptop Server Mode" sx={{ bgcolor: 'rgba(240,185,11,0.12)', color: '#F0B90B', fontWeight: 700, mb: 2 }} />
              <Typography variant="h4" sx={{ color: '#F0B90B', fontWeight: 900 }}>Shivam Transport</Typography>
              <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>
                {isSignup
                  ? role === 'admin'
                    ? 'Create an admin account. A group code will be generated for your drivers.'
                    : 'Enter the group code your admin shared with you to join their group.'
                  : 'Login with your group code, phone and password.'}
              </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <FormControlLabel
              control={<Switch checked={isSignup} onChange={e => { setIsSignup(e.target.checked); setError(''); }} />}
              label={isSignup ? 'Create account' : 'Login to existing account'}
              sx={{ color: 'text.primary' }}
            />

            {isSignup && (
              <TextField label="Full Name" value={name} onChange={e => setName(e.target.value)} fullWidth />
            )}

            {isSignup && (
              <FormControl fullWidth>
                <InputLabel>Account Type</InputLabel>
                <Select label="Account Type" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                  <MenuItem value="admin">Admin / Owner</MenuItem>
                  <MenuItem value="driver">Driver / Employee</MenuItem>
                </Select>
              </FormControl>
            )}

            {isSignup && role === 'admin' && (
              <TextField
                label="Transport Group Name"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                fullWidth
              />
            )}

            {/* Group code: optional for admin signup, required for driver signup and login */}
            {(isSignup && role === 'driver') || !isSignup ? (
              <TextField
                label={isSignup ? 'Group Code (from your Admin)' : 'Group Code'}
                value={groupCode}
                onChange={e => setGroupCode(e.target.value.toUpperCase())}
                helperText={
                  isSignup
                    ? 'Ask your admin for the group code to join their group.'
                    : 'Enter the group code for your transport group.'
                }
                fullWidth
                required
              />
            ) : (
              <TextField
                label="Group Code (optional — leave blank to auto-generate)"
                value={groupCode}
                onChange={e => setGroupCode(e.target.value.toUpperCase())}
                helperText="Leave empty to generate a new code. Share this code with your drivers."
                fullWidth
              />
            )}

            <TextField label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} fullWidth />

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              helperText={isSignup ? 'Minimum 6 characters' : ''}
              fullWidth
            />

            {isSignup && role === 'admin' && (
              <TextField
                label="Recovery Email (optional)"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                helperText="Lets you reset your password yourself if you forget it. Drivers don't need one — you can reset a driver's password for them from the Drivers page."
                fullWidth
              />
            )}

            {!isSignup && (
              <Box sx={{ textAlign: 'right', mt: -1.5 }}>
                <Link
                  component="button"
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  sx={{ color: '#F0B90B', fontSize: '0.85rem' }}
                >
                  Forgot password?
                </Link>
              </Box>
            )}

            <Accordion sx={{ bgcolor: 'background.default', border: `1px solid ${theme.palette.divider}`, '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'text.secondary' }} />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Dns sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Server Address (only if your admin gave you one)</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  label="Server Address"
                  placeholder="e.g. https://api.yourdomain.com"
                  value={serverAddress}
                  onChange={e => setServerAddress(e.target.value)}
                  fullWidth
                  size="small"
                  helperText="Leave as-is if you're on the same office WiFi as the admin. Otherwise paste the address your admin shared (from the QR code / join info)."
                />
              </AccordionDetails>
            </Accordion>

            <Button
              variant="contained"
              size="large"
              startIcon={isSignup ? <PersonAdd /> : <Login />}
              onClick={handleSubmit}
              disabled={loading}
              sx={{ color: 'primary.contrastText', fontWeight: 800 }}
            >
              {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Login'}
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <Lock fontSize="small" />
              <Typography variant="body2">
                Data is stored on your office laptop server. Keep regular backups.
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Container>

      <ForgotPasswordDialog
        open={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        initialGroupCode={groupCode}
      />
    </Box>
  );
};

export default AuthPage;
