import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  GridLegacy as Grid,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CheckCircle, Close, Edit, HourglassTop } from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';
import type { Trip } from '../types';

type EditableKey =
  | 'customerName'
  | 'customerPhone'
  | 'customerAddress'
  | 'date'
  | 'pickupLocation'
  | 'dropLocation'
  | 'vehicleType'
  | 'vehicleNumber'
  | 'materialType'
  | 'amount'
  | 'advanceAmount';

const AdminTripApprovals = () => {
  const { pendingTrips, approveTrip, rejectTrip, updateTrip } = useAppContext();
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [rejectingTrip, setRejectingTrip] = useState<Trip | null>(null);
  const [editForm, setEditForm] = useState<Record<EditableKey, string>>({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    date: '',
    pickupLocation: '',
    dropLocation: '',
    vehicleType: '',
    vehicleNumber: '',
    materialType: '',
    amount: '',
    advanceAmount: '',
  });
  const [rejectReason, setRejectReason] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const openEdit = (trip: Trip) => {
    setEditingTrip(trip);
    setEditForm({
      customerName: trip.customerName || '',
      customerPhone: trip.customerPhone || '',
      customerAddress: trip.customerAddress || '',
      date: trip.date ? trip.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      pickupLocation: trip.pickupLocation || '',
      dropLocation: trip.dropLocation || '',
      vehicleType: trip.vehicleType || '',
      vehicleNumber: trip.vehicleNumber || '',
      materialType: trip.materialType || '',
      amount: String(trip.amount || ''),
      advanceAmount: String(trip.advanceAmount || ''),
    });
  };

  const saveEdit = async () => {
    if (!editingTrip) return;
    try {
      await updateTrip(editingTrip.id, {
        ...editForm,
        date: new Date(editForm.date).toISOString(),
        amount: Number(editForm.amount),
        advanceAmount: Number(editForm.advanceAmount || 0),
      });
      setEditingTrip(null);
      setMessage({ type: 'success', text: 'Trip updated.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Could not update trip' });
    }
  };

  const approve = async (tripId: string) => {
    try {
      await approveTrip(tripId);
      setMessage({ type: 'success', text: 'Trip approved and added to billing.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Could not approve trip' });
    }
  };

  const reject = async () => {
    if (!rejectingTrip) return;
    try {
      await rejectTrip(rejectingTrip.id, rejectReason || 'Rejected by admin');
      setRejectingTrip(null);
      setRejectReason('');
      setMessage({ type: 'success', text: 'Trip rejected. Driver can see the update.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Could not reject trip' });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper elevation={0} sx={{ p: 3, bgcolor: '#161A1E', border: '1px solid #2B3139' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h5" sx={{ color: '#F0B90B', fontWeight: 800 }}>
              Pending Trip Approvals
            </Typography>
            <Typography variant="body2" sx={{ color: '#848E9C' }}>
              New driver submissions appear here in real time.
            </Typography>
          </Box>
          <Chip
            icon={<HourglassTop />}
            label={`${pendingTrips.length} pending`}
            sx={{ bgcolor: 'rgba(240,185,11,0.12)', color: '#F0B90B', fontWeight: 800 }}
          />
        </Box>
      </Paper>

      {message && <Alert severity={message.type}>{message.text}</Alert>}

      {pendingTrips.length === 0 ? (
        <Paper elevation={0} sx={{ p: 5, bgcolor: '#161A1E', border: '1px dashed #2B3139', textAlign: 'center' }}>
          <Typography sx={{ color: '#848E9C' }}>No pending trips right now.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {pendingTrips.map(trip => (
            <Paper key={trip.id} elevation={0} sx={{ p: 3, bgcolor: '#161A1E', border: '1px solid #2B3139' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="h6" sx={{ color: '#EAECEF', fontWeight: 800 }}>
                    {trip.customerName || 'Customer'} - ₹{Number(trip.amount || 0).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#848E9C' }}>
                    Driver: {trip.driverName || 'Unknown'} | {new Date(trip.date).toLocaleDateString('en-IN')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#848E9C', mt: 0.5 }}>
                    {trip.pickupLocation} to {trip.dropLocation} | Vehicle: {trip.vehicleType}
                    {trip.vehicleNumber ? ` (${trip.vehicleNumber})` : ''}
                  </Typography>
                  {trip.materialType && (
                    <Typography variant="body2" sx={{ color: '#848E9C' }}>
                      Material: {trip.materialType}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <Button variant="outlined" startIcon={<Edit />} onClick={() => openEdit(trip)}>
                    Edit
                  </Button>
                  <Button variant="outlined" color="error" startIcon={<Close />} onClick={() => setRejectingTrip(trip)}>
                    Reject
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<CheckCircle />}
                    onClick={() => approve(trip.id)}
                    sx={{ color: '#0B0E11', fontWeight: 800 }}
                  >
                    Approve
                  </Button>
                </Box>
              </Box>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(editingTrip)} onClose={() => setEditingTrip(null)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Trip Before Approval</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField label="Customer Name" value={editForm.customerName} onChange={event => setEditForm(prev => ({ ...prev, customerName: event.target.value }))} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Customer Phone" value={editForm.customerPhone} onChange={event => setEditForm(prev => ({ ...prev, customerPhone: event.target.value }))} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Customer Address" value={editForm.customerAddress} onChange={event => setEditForm(prev => ({ ...prev, customerAddress: event.target.value }))} fullWidth multiline rows={2} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Trip Date" type="date" value={editForm.date} onChange={event => setEditForm(prev => ({ ...prev, date: event.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Vehicle Type" value={editForm.vehicleType} onChange={event => setEditForm(prev => ({ ...prev, vehicleType: event.target.value }))} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Vehicle Number" value={editForm.vehicleNumber} onChange={event => setEditForm(prev => ({ ...prev, vehicleNumber: event.target.value.toUpperCase() }))} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Pickup Location" value={editForm.pickupLocation} onChange={event => setEditForm(prev => ({ ...prev, pickupLocation: event.target.value }))} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Drop Location" value={editForm.dropLocation} onChange={event => setEditForm(prev => ({ ...prev, dropLocation: event.target.value }))} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Material Type" value={editForm.materialType} onChange={event => setEditForm(prev => ({ ...prev, materialType: event.target.value }))} fullWidth />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField label="Amount" type="number" value={editForm.amount} onChange={event => setEditForm(prev => ({ ...prev, amount: event.target.value }))} fullWidth InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField label="Advance" type="number" value={editForm.advanceAmount} onChange={event => setEditForm(prev => ({ ...prev, advanceAmount: event.target.value }))} fullWidth InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingTrip(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit} sx={{ color: '#0B0E11', fontWeight: 800 }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(rejectingTrip)} onClose={() => setRejectingTrip(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Trip</DialogTitle>
        <DialogContent>
          <TextField
            label="Reason"
            value={rejectReason}
            onChange={event => setRejectReason(event.target.value)}
            fullWidth
            multiline
            rows={3}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectingTrip(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={reject}>
            Reject Trip
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminTripApprovals;
