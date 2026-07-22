import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  GridLegacy as Grid,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { Send } from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';

const DriverSubmitTrip = () => {
  const { submitDriverTrip } = useAppContext();
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    date: new Date().toISOString().slice(0, 10),
    pickupLocation: '',
    dropLocation: '',
    vehicleType: '',
    vehicleNumber: '',
    materialType: '',
    amount: '',
    advanceAmount: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const updateField = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const result = await submitDriverTrip({
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerAddress: form.customerAddress.trim(),
        date: new Date(form.date).toISOString(),
        pickupLocation: form.pickupLocation.trim(),
        dropLocation: form.dropLocation.trim(),
        vehicleType: form.vehicleType.trim(),
        vehicleNumber: form.vehicleNumber.trim(),
        materialType: form.materialType.trim(),
        amount: Number(form.amount),
        advanceAmount: Number(form.advanceAmount || 0),
        isPaid: false,
      });
      setForm(prev => ({
        ...prev,
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        pickupLocation: '',
        dropLocation: '',
        vehicleType: '',
        vehicleNumber: '',
        materialType: '',
        amount: '',
        advanceAmount: '',
      }));
      setMessage(
        result.queued
          ? { type: 'warning', text: "No connection right now — saved on your phone and will send automatically once you're back online." }
          : { type: 'success', text: 'Trip submitted. Admin will review it now.' }
      );
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not submit trip',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 }, bgcolor: '#161A1E', border: '1px solid #2B3139' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#F0B90B', fontWeight: 800 }}>
          Submit Trip
        </Typography>
        <Typography variant="body2" sx={{ color: '#848E9C' }}>
          This reaches the admin dashboard immediately after submission.
        </Typography>
      </Box>
      <Divider sx={{ mb: 3, borderColor: '#2B3139' }} />

      {message && <Alert severity={message.type} sx={{ mb: 3 }}>{message.text}</Alert>}

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Customer Name"
            value={form.customerName}
            onChange={event => updateField('customerName', event.target.value)}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Customer Phone"
            value={form.customerPhone}
            onChange={event => updateField('customerPhone', event.target.value)}
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Customer Address"
            value={form.customerAddress}
            onChange={event => updateField('customerAddress', event.target.value)}
            fullWidth
            multiline
            rows={2}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Trip Date"
            type="date"
            value={form.date}
            onChange={event => updateField('date', event.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Vehicle Type"
            value={form.vehicleType}
            onChange={event => updateField('vehicleType', event.target.value)}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Vehicle Number"
            placeholder="e.g. MH12AB1234"
            value={form.vehicleNumber}
            onChange={event => updateField('vehicleNumber', event.target.value.toUpperCase())}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Pickup Location"
            value={form.pickupLocation}
            onChange={event => updateField('pickupLocation', event.target.value)}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Drop Location"
            value={form.dropLocation}
            onChange={event => updateField('dropLocation', event.target.value)}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Material Type"
            value={form.materialType}
            onChange={event => updateField('materialType', event.target.value)}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="Amount"
            value={form.amount}
            onChange={event => updateField('amount', event.target.value)}
            type="number"
            fullWidth
            required
            InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="Advance"
            value={form.advanceAmount}
            onChange={event => updateField('advanceAmount', event.target.value)}
            type="number"
            fullWidth
            InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
          />
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<Send />}
              onClick={handleSubmit}
              disabled={loading}
              sx={{ color: '#0B0E11', fontWeight: 800 }}
            >
              {loading ? 'Submitting...' : 'Submit Trip'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default DriverSubmitTrip;
