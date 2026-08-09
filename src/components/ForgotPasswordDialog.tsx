import { useEffect, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Stack, TextField, Typography, useTheme,
} from '@mui/material';
import { useAppContext } from '../context/AppContext';

interface ForgotPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  initialGroupCode?: string;
}

// Only admin accounts can self-recover (they can optionally set a recovery email at signup or
// in Settings). Drivers have no email on file by design — their admin resets their password for
// them from the Drivers page instead.
const ForgotPasswordDialog = ({ open, onClose, initialGroupCode = '' }: ForgotPasswordDialogProps) => {
  const theme = useTheme();
  const { forgotPassword, verifyResetOtp, resetPassword } = useAppContext();
  const [step, setStep] = useState<'request' | 'verify' | 'reset' | 'done'>('request');
  const [phone, setPhone] = useState('');
  const [groupCode, setGroupCode] = useState(initialGroupCode);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('request');
      setGroupCode(initialGroupCode);
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setInfo('');
      setError('');
    }
  }, [open, initialGroupCode]);

  const handleRequestCode = async () => {
    setError('');
    setLoading(true);
    try {
      const message = await forgotPassword(phone.trim(), groupCode.trim().toUpperCase());
      setInfo(message);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    setLoading(true);
    try {
      await verifyResetOtp(phone.trim(), groupCode.trim().toUpperCase(), otp.trim());
      setStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');
    setLoading(true);
    try {
      await resetPassword(phone.trim(), groupCode.trim().toUpperCase(), otp.trim(), newPassword);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}` } }}
    >
      <DialogTitle sx={{ color: 'text.primary', fontWeight: 700 }}>
        {step === 'done' ? 'Password Reset' : 'Forgot Password (Admin Only)'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {step === 'request' && (
            <>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Only admin accounts with a recovery email on file can reset their password this way.
                Drivers should ask their admin to reset it for them.
              </Typography>
              <TextField label="Group Code" value={groupCode} onChange={e => setGroupCode(e.target.value.toUpperCase())} fullWidth />
              <TextField label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} fullWidth />
            </>
          )}

          {step === 'verify' && (
            <>
              <Alert severity="info">{info}</Alert>
              <TextField label="6-Digit Code" value={otp} onChange={e => setOtp(e.target.value)} fullWidth autoFocus />
            </>
          )}

          {step === 'reset' && (
            <>
              <Alert severity="success">Code verified. Choose a new password.</Alert>
              <TextField
                label="New Password"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                helperText="Minimum 6 characters"
                fullWidth
                autoFocus
              />
              <TextField
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                fullWidth
              />
            </>
          )}

          {step === 'done' && (
            <Alert severity="success">Your password has been reset. You can now log in with your new password.</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>
          {step === 'done' ? 'Close' : 'Cancel'}
        </Button>
        {step === 'request' && (
          <Button
            variant="contained"
            disabled={loading || !phone.trim() || !groupCode.trim()}
            onClick={handleRequestCode}
            sx={{ color: 'primary.contrastText', fontWeight: 700 }}
          >
            {loading ? 'Sending...' : 'Send Reset Code'}
          </Button>
        )}
        {step === 'verify' && (
          <Button
            variant="contained"
            disabled={loading || !otp.trim()}
            onClick={handleVerifyCode}
            sx={{ color: 'primary.contrastText', fontWeight: 700 }}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </Button>
        )}
        {step === 'reset' && (
          <Button
            variant="contained"
            disabled={loading || !newPassword || !confirmPassword}
            onClick={handleResetPassword}
            sx={{ color: 'primary.contrastText', fontWeight: 700 }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
