import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Alert, Box, Button, GridLegacy as Grid, Paper, Stack, TextField, Typography, IconButton,
} from '@mui/material';
import {
  Save, Add, Delete, AccountBalance,
  PhotoCamera, AutoFixHigh,
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';
import type { Branding, BankAccount } from '../types';
import { processSignaturePhoto, processSignatureScan } from '../utils/signatureImage';

const EMPTY: Branding = {
  companyName: '', tagline: '', proprietorName: '', phone1: '', phone2: '', address: '',
  gstNumber: '', footerNote: '', primaryColor: '#0B2B5E', accentColor: '#F0B90B',
  logoDataUrl: '', signatureDataUrl: '', bankName: '', bankBranch: '', bankAccountNumber: '', bankIfsc: '',
  bankAccounts: [], publicServerUrl: '', nextInvoiceNumber: 1,
};

const newBankAccount = (): BankAccount => ({
  id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label: '', bankName: '', bankBranch: '', accountNumber: '', ifscCode: '',
});

const BrandingSettings = () => {
  const { branding, updateBranding } = useAppContext();
  const [form, setForm] = useState<Branding>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [signatureProcessing, setSignatureProcessing] = useState(false);
  const [signatureError, setSignatureError] = useState('');

  useEffect(() => {
    if (branding) setForm({ ...branding, bankAccounts: branding.bankAccounts || [] });
  }, [branding]);

  const addBankAccount = () => setForm(prev => ({ ...prev, bankAccounts: [...prev.bankAccounts, newBankAccount()] }));
  const updateBankAccount = (id: string, key: keyof BankAccount, value: string) =>
    setForm(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map(acc => (acc.id === id ? { ...acc, [key]: value } : acc)),
    }));
  const removeBankAccount = (id: string) =>
    setForm(prev => ({ ...prev, bankAccounts: prev.bankAccounts.filter(acc => acc.id !== id) }));

  const update = (key: keyof Branding, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSignatureUpload = async (e: ChangeEvent<HTMLInputElement>, mode: 'photo' | 'scan') => {
    const file = e.target.files?.[0];
    e.target.value = ''; // so choosing the same file again still fires onChange
    if (!file) return;
    setSignatureProcessing(true);
    setSignatureError('');
    try {
      const dataUrl = mode === 'scan' ? await processSignatureScan(file) : await processSignaturePhoto(file);
      setForm(prev => ({ ...prev, signatureDataUrl: dataUrl }));
    } catch (error) {
      setSignatureError(error instanceof Error ? error.message : 'Could not process that image');
    } finally {
      setSignatureProcessing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateBranding(form);
      setMessage({ type: 'success', text: 'Bill branding saved.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Could not save' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper elevation={0} sx={{ p: 3, bgcolor: '#161A1E', border: '1px solid #2B3139' }}>
        <Typography variant="h5" sx={{ color: '#F0B90B', fontWeight: 800 }}>Bill Branding &amp; Settings</Typography>
        <Typography variant="body2" sx={{ color: '#848E9C' }}>
          This is what appears on every invoice you print or share.
        </Typography>
      </Paper>

      {message && <Alert severity={message.type}>{message.text}</Alert>}

      <Paper elevation={0} sx={{ p: 3, bgcolor: '#161A1E', border: '1px solid #2B3139' }}>
        <Typography variant="h6" sx={{ color: '#EAECEF', fontWeight: 700, mb: 2 }}>Company Details</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="Company Name" value={form.companyName} onChange={e => update('companyName', e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Tagline" value={form.tagline} onChange={e => update('tagline', e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Proprietor Name" value={form.proprietorName} onChange={e => update('proprietorName', e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField label="Phone 1" value={form.phone1} onChange={e => update('phone1', e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField label="Phone 2 (optional)" value={form.phone2} onChange={e => update('phone2', e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Address" value={form.address} onChange={e => update('address', e.target.value)} fullWidth multiline rows={2} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Your GST Number (optional)" value={form.gstNumber} onChange={e => update('gstNumber', e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Invoice Footer Note" value={form.footerNote} onChange={e => update('footerNote', e.target.value)} fullWidth />
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, bgcolor: '#161A1E', border: '1px solid #2B3139' }}>
        <Typography variant="h6" sx={{ color: '#EAECEF', fontWeight: 700, mb: 2 }}>Bill Theme Colors</Typography>
        <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
          <Box>
            <Typography variant="body2" sx={{ color: '#848E9C', mb: 1 }}>Primary Color (header / accents)</Typography>
            <input
              type="color"
              value={form.primaryColor}
              onChange={e => update('primaryColor', e.target.value)}
              style={{ width: 64, height: 40, border: '1px solid #2B3139', borderRadius: 6, background: 'none', cursor: 'pointer' }}
            />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: '#848E9C', mb: 1 }}>Accent Color (highlights / badge)</Typography>
            <input
              type="color"
              value={form.accentColor}
              onChange={e => update('accentColor', e.target.value)}
              style={{ width: 64, height: 40, border: '1px solid #2B3139', borderRadius: 6, background: 'none', cursor: 'pointer' }}
            />
          </Box>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, bgcolor: '#161A1E', border: '1px solid #2B3139' }}>
        <Typography variant="h6" sx={{ color: '#EAECEF', fontWeight: 700, mb: 1 }}>Authorized Signature</Typography>
        <Typography variant="body2" sx={{ color: '#848E9C', mb: 2 }}>
          Upload once and it'll appear above "Authorized Signatory" on every printed bill. If you're uploading a
          photo of a signature on paper, use "Remove Background" so only the ink shows through — otherwise the
          paper's white/cream background prints as a visible box.
        </Typography>
        {signatureError && <Alert severity="error" sx={{ mb: 2 }}>{signatureError}</Alert>}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          {form.signatureDataUrl ? (
            <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 220, height: 110 }}>
              <img src={form.signatureDataUrl} alt="Signature" style={{ maxWidth: '100%', maxHeight: '100%' }} />
            </Box>
          ) : (
            <Box sx={{ border: '1px dashed #2B3139', borderRadius: 2, width: 220, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" sx={{ color: '#848E9C' }}>No signature uploaded</Typography>
            </Box>
          )}
          <Stack spacing={1}>
            <Button variant="outlined" component="label" startIcon={<PhotoCamera />} disabled={signatureProcessing}>
              Upload as Photo
              <input type="file" accept="image/*" hidden onChange={e => handleSignatureUpload(e, 'photo')} />
            </Button>
            <Button variant="outlined" component="label" startIcon={<AutoFixHigh />} disabled={signatureProcessing}>
              Upload &amp; Remove Background
              <input type="file" accept="image/*" hidden onChange={e => handleSignatureUpload(e, 'scan')} />
            </Button>
            {form.signatureDataUrl && (
              <Button variant="text" color="error" onClick={() => update('signatureDataUrl', '')}>
                Remove Signature
              </Button>
            )}
          </Stack>
        </Box>
        {signatureProcessing && (
          <Typography variant="body2" sx={{ color: '#F0B90B', mt: 2 }}>Processing image...</Typography>
        )}
      </Paper>

      <Paper elevation={0} sx={{ p: 3, bgcolor: '#161A1E', border: '1px solid #2B3139' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ color: '#EAECEF', fontWeight: 700 }}>Bank Accounts</Typography>
          <Button size="small" startIcon={<Add />} onClick={addBankAccount} sx={{ color: '#F0B90B', fontWeight: 700 }}>
            Add Account
          </Button>
        </Box>
        <Typography variant="body2" sx={{ color: '#848E9C', mb: 2 }}>
          Add every account you receive payments into. When generating a customer's bill, you'll pick which one
          to print — handy since a bill doesn't always go to the same account.
        </Typography>

        {form.bankAccounts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, border: '1px dashed #2B3139', borderRadius: 2 }}>
            <AccountBalance sx={{ fontSize: 36, color: '#848E9C', mb: 1 }} />
            <Typography variant="body2" sx={{ color: '#848E9C' }}>
              No bank accounts saved yet. Click "Add Account" to add your first one.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {form.bankAccounts.map((account, index) => (
              <Box
                key={account.id}
                sx={{ p: 2, borderRadius: 2, bgcolor: '#1E2329', border: '1px solid #2B3139', position: 'relative' }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ color: '#F0B90B', fontWeight: 700 }}>
                    Account {index + 1}
                  </Typography>
                  <IconButton size="small" onClick={() => removeBankAccount(account.id)} sx={{ color: '#848E9C', '&:hover': { color: '#F6465D' } }}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Label (e.g. SBI - Main Account)"
                      value={account.label}
                      onChange={e => updateBankAccount(account.id, 'label', e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Bank Name"
                      value={account.bankName}
                      onChange={e => updateBankAccount(account.id, 'bankName', e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Branch"
                      value={account.bankBranch}
                      onChange={e => updateBankAccount(account.id, 'bankBranch', e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Account Number"
                      value={account.accountNumber}
                      onChange={e => updateBankAccount(account.id, 'accountNumber', e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="IFSC Code"
                      value={account.ifscCode}
                      onChange={e => updateBankAccount(account.id, 'ifscCode', e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Box>
            ))}
          </Stack>
        )}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving} sx={{ color: '#0B0E11', fontWeight: 800 }}>
            {saving ? 'Saving...' : 'Save Branding'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default BrandingSettings;
