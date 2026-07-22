import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Divider, GridLegacy as Grid, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { Save, Share as ShareIcon, ContentCopy, Check } from '@mui/icons-material';
import { Share } from '@capacitor/share';
import QRCode from 'qrcode';
import { useAppContext } from '../context/AppContext';
import type { Branding } from '../types';

const EMPTY: Branding = {
  companyName: '', tagline: '', proprietorName: '', phone1: '', phone2: '', address: '',
  gstNumber: '', footerNote: '', primaryColor: '#0B2B5E', accentColor: '#F0B90B',
  logoDataUrl: '', bankName: '', bankBranch: '', bankAccountNumber: '', bankIfsc: '',
  publicServerUrl: '', nextInvoiceNumber: 1,
};

const BrandingSettings = () => {
  const { branding, updateBranding, group, serverUrl, saveServerUrl } = useAppContext();
  const [form, setForm] = useState<Branding>(EMPTY);
  const [serverField, setServerField] = useState(serverUrl);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (branding) setForm(branding);
  }, [branding]);

  const joinText = `Join ${form.companyName || 'Shivam Transport'} on the app:\nServer: ${form.publicServerUrl || serverUrl || '(ask admin)'}\nGroup Code: ${group?.code || ''}`;

  useEffect(() => {
    QRCode.toDataURL(joinText, { width: 220, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.publicServerUrl, serverUrl, group?.code, form.companyName]);

  const update = (key: keyof Branding, value: string) => setForm(prev => ({ ...prev, [key]: value }));

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

  const handleSaveServer = () => {
    saveServerUrl(serverField);
    setMessage({ type: 'success', text: 'Server address updated on this device.' });
  };

  const handleCopyJoinInfo = async () => {
    await navigator.clipboard.writeText(joinText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareJoinInfo = async () => {
    try {
      await Share.share({ title: 'Join our transport group', text: joinText, dialogTitle: 'Share with driver' });
    } catch {
      /* user cancelled share sheet */
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper elevation={0} sx={{ p: 3, bgcolor: '#161A1E', border: '1px solid #2B3139' }}>
        <Typography variant="h5" sx={{ color: '#F0B90B', fontWeight: 800 }}>Bill Branding &amp; Settings</Typography>
        <Typography variant="body2" sx={{ color: '#848E9C' }}>
          This is what appears on every invoice you print or share, and how drivers connect to your server.
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
        <Typography variant="h6" sx={{ color: '#EAECEF', fontWeight: 700, mb: 2 }}>Bank Details (shown on bill)</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="Bank Name" value={form.bankName} onChange={e => update('bankName', e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Branch" value={form.bankBranch} onChange={e => update('bankBranch', e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Account Number" value={form.bankAccountNumber} onChange={e => update('bankAccountNumber', e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="IFSC Code" value={form.bankIfsc} onChange={e => update('bankIfsc', e.target.value)} fullWidth />
          </Grid>
        </Grid>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving} sx={{ color: '#0B0E11', fontWeight: 800 }}>
            {saving ? 'Saving...' : 'Save Branding'}
          </Button>
        </Box>
      </Paper>

      <Divider sx={{ borderColor: '#2B3139' }} />

      <Paper elevation={0} sx={{ p: 3, bgcolor: '#161A1E', border: '1px solid #2B3139' }}>
        <Typography variant="h6" sx={{ color: '#EAECEF', fontWeight: 700, mb: 1 }}>Driver Connection</Typography>
        <Typography variant="body2" sx={{ color: '#848E9C', mb: 2 }}>
          If drivers are on your office WiFi, they don't need this. If they'll be out on the road, set up a
          Cloudflare Tunnel (see CLOUDFLARE_TUNNEL.md) and paste its address here — that becomes the permanent
          address the app uses, from anywhere.
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={8}>
            <TextField
              label="Server Address (e.g. https://api.yourdomain.com)"
              value={serverField}
              onChange={e => setServerField(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button variant="outlined" onClick={handleSaveServer} fullWidth>Use This Address</Button>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3, borderColor: '#2B3139' }} />

        <Typography variant="subtitle1" sx={{ color: '#EAECEF', fontWeight: 700, mb: 2 }}>Share Join Info With a New Driver</Typography>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {qrDataUrl && (
            <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, display: 'inline-block' }}>
              <img src={qrDataUrl} alt="Join QR code" width={180} height={180} />
            </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 240 }}>
            <Typography variant="body2" sx={{ color: '#848E9C', whiteSpace: 'pre-line', mb: 2 }}>
              {joinText}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={copied ? <Check /> : <ContentCopy />} onClick={handleCopyJoinInfo}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="contained" startIcon={<ShareIcon />} onClick={handleShareJoinInfo} sx={{ color: '#0B0E11', fontWeight: 700 }}>
                Share
              </Button>
            </Stack>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default BrandingSettings;
