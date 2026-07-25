import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  ListItemAvatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  GridLegacy as Grid,
  InputAdornment,
  Alert,
} from '@mui/material';
import {
  CalendarMonth,
  LocationOn,
  CheckCircle,
  Cancel,
  LocalShipping,
  Edit,
  Download,
} from '@mui/icons-material';
import type { Trip } from '../types';
import { useAppContext } from '../context/AppContext';

interface TripListProps {
  trips: Trip[];
  customerName: string;
  customerAdvanceBalance?: number;
  onUpdatePaymentStatus?: (tripId: string, isPaid: boolean) => void;
  onDownloadTripBill?: (trip: Trip) => void;
}

type EditForm = {
  date: string;
  pickupLocation: string;
  dropLocation: string;
  vehicleType: string;
  vehicleNumber: string;
  materialType: string;
  amount: string;
  advanceAmount: string;
};

const TripList = ({ trips, customerName, customerAdvanceBalance = 0, onUpdatePaymentStatus, onDownloadTripBill }: TripListProps) => {
  const { updateTrip, recordTripPayment } = useAppContext();

  const [editTrip, setEditTrip] = useState<Trip | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [paymentTrip, setPaymentTrip] = useState<Trip | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [fullyPaid, setFullyPaid] = useState(false);
  const [fromAdvance, setFromAdvance] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [confirmUnpaidTrip, setConfirmUnpaidTrip] = useState<Trip | null>(null);

  const sortedTrips = [...trips].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleTogglePaymentStatus = (trip: Trip) => {
    if (trip.isPaid) {
      setConfirmUnpaidTrip(trip);
      return;
    }
    setPaymentTrip(trip);
    const remaining = Number(trip.amount || 0) - Number(trip.paidAmount || 0);
    setPaymentAmount(remaining > 0 ? remaining.toFixed(2) : '');
    setFullyPaid(false);
    setFromAdvance(false);
    setPaymentError('');
  };

  const handleConfirmMarkUnpaid = () => {
    if (!confirmUnpaidTrip) return;
    onUpdatePaymentStatus?.(confirmUnpaidTrip.id, false);
    setConfirmUnpaidTrip(null);
  };

  const remainingForPaymentTrip = paymentTrip
    ? Math.max(0, Number(paymentTrip.amount || 0) - Number(paymentTrip.paidAmount || 0))
    : 0;

  const handleFullyPaidToggle = (checked: boolean) => {
    setFullyPaid(checked);
    if (checked) setPaymentAmount(remainingForPaymentTrip.toFixed(2));
  };

  const handleConfirmPayment = async () => {
    if (!paymentTrip) return;
    const amount = Number(paymentAmount);
    if (!fullyPaid && (!amount || amount <= 0)) {
      setPaymentError('Enter an amount greater than zero.');
      return;
    }
    if (fromAdvance && amount > customerAdvanceBalance) {
      setPaymentError(`Only ₹${customerAdvanceBalance.toFixed(2)} available in advance balance.`);
      return;
    }
    setSavingPayment(true);
    setPaymentError('');
    try {
      await recordTripPayment(paymentTrip.id, { amount, fullyPaid, fromAdvance });
      setPaymentTrip(null);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Could not record payment');
    } finally {
      setSavingPayment(false);
    }
  };

  const openEditTrip = (trip: Trip) => {
    setEditTrip(trip);
    setEditForm({
      date: new Date(trip.date).toISOString().slice(0, 10),
      pickupLocation: trip.pickupLocation,
      dropLocation: trip.dropLocation,
      vehicleType: trip.vehicleType || '',
      vehicleNumber: trip.vehicleNumber || '',
      materialType: trip.materialType || '',
      amount: String(trip.amount ?? ''),
      advanceAmount: String(trip.advanceAmount ?? 0),
    });
  };

  const updateEditField = (key: keyof EditForm, value: string) => {
    setEditForm(prev => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSaveEdit = async () => {
    if (!editTrip || !editForm) return;
    setSavingEdit(true);
    try {
      await updateTrip(editTrip.id, {
        date: new Date(editForm.date).toISOString(),
        pickupLocation: editForm.pickupLocation.trim(),
        dropLocation: editForm.dropLocation.trim(),
        vehicleType: editForm.vehicleType.trim(),
        vehicleNumber: editForm.vehicleNumber.trim(),
        materialType: editForm.materialType.trim(),
        amount: Number(editForm.amount) || 0,
        advanceAmount: Number(editForm.advanceAmount) || 0,
      });
      setEditTrip(null);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 4 },
        borderRadius: 2,
        background: '#161A1E',
        border: '1px solid #2B3139',
      }}
    >
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3, color: '#EAECEF' }}>
        Trip History
      </Typography>
      {sortedTrips.length === 0 ? (
        <Box sx={{
          py: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          color: '#848E9C',
          borderRadius: 2,
          bgcolor: '#1E2329',
          border: '1px dashed #2B3139'
        }}>
          <CalendarMonth sx={{ fontSize: 48, color: '#848E9C', mb: 2 }} />
          <Typography variant="body1" sx={{ textAlign: 'center', mb: 1, fontWeight: 600, letterSpacing: '0.1px', color: '#EAECEF' }}>
            No trips recorded yet for {customerName}.
          </Typography>
        </Box>
      ) : (
        <List sx={{ p: 0 }}>
          {sortedTrips.map((trip, index) => (
            <React.Fragment key={trip.id}>
              <ListItem
                sx={{
                  mb: 1.5,
                  py: 2,
                  px: { xs: 2, sm: 3 },
                  borderRadius: 2,
                  bgcolor: index % 2 === 0 ? '#1E2329' : '#161A1E',
                  border: '1px solid #2B3139',
                  '&:hover': { bgcolor: '#2B3139' },
                  transition: 'background-color 0.2s ease-in-out'
                }}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {onDownloadTripBill && (
                      <Tooltip title="Download bill for this trip">
                        <IconButton edge="end" onClick={() => onDownloadTripBill(trip)} sx={{ color: '#848E9C', '&:hover': { color: '#F0B90B' } }}>
                          <Download fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Edit trip">
                      <IconButton edge="end" onClick={() => openEditTrip(trip)} sx={{ color: '#848E9C', '&:hover': { color: '#F0B90B' } }}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {onUpdatePaymentStatus && (
                      <Tooltip title={trip.isPaid ? 'Mark as unpaid' : 'Record payment'}>
                        <IconButton
                          edge="end"
                          onClick={() => handleTogglePaymentStatus(trip)}
                          sx={{
                            color: trip.isPaid ? '#0ECB81' : '#F6465D',
                            bgcolor: trip.isPaid ? 'rgba(14, 203, 129, 0.1)' : 'rgba(246, 70, 93, 0.1)',
                            '&:hover': {
                              bgcolor: trip.isPaid ? 'rgba(14, 203, 129, 0.2)' : 'rgba(246, 70, 93, 0.2)',
                              transform: 'scale(1.05)'
                            },
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          {trip.isPaid ? <CheckCircle /> : <Cancel />}
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                }
              >
                <ListItemAvatar sx={{ display: { xs: 'none', sm: 'block' } }}>
                  <Avatar sx={{ bgcolor: trip.isPaid ? 'rgba(14, 203, 129, 0.1)' : 'rgba(246, 70, 93, 0.1)', color: trip.isPaid ? '#0ECB81' : '#F6465D' }}>
                    {trip.isPaid ? '₹' : '!'}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  sx={{ pr: { xs: 9, sm: 12 } }}
                  primary={
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.5, sm: 0 }, mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CalendarMonth sx={{ mr: 1, color: '#848E9C', fontSize: 18 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, letterSpacing: '0.2px', color: '#EAECEF' }}>
                          {new Date(trip.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 800,
                            mr: 1.5,
                            letterSpacing: '0.2px',
                            color: '#EAECEF'
                          }}
                        >
                          ₹{typeof trip.amount === 'number' ? trip.amount.toFixed(2) : '0.00'}
                        </Typography>
                        <Chip
                          label={trip.isPaid ? 'Paid' : 'Unpaid'}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            backgroundColor: trip.isPaid ? 'rgba(14, 203, 129, 0.1)' : 'rgba(246, 70, 93, 0.1)',
                            color: trip.isPaid ? '#0ECB81' : '#F6465D',
                            border: `1px solid ${trip.isPaid ? 'rgba(14, 203, 129, 0.2)' : 'rgba(246, 70, 93, 0.2)'}`,
                          }}
                        />
                      </Box>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <LocationOn sx={{ mr: 1, color: '#848E9C', fontSize: 18, mt: '2px' }} />
                      <Box>
                        <Typography variant="body2" sx={{ color: '#848E9C', fontWeight: 500, letterSpacing: '0.1px' }}>
                          {trip.pickupLocation} → {trip.dropLocation}
                        </Typography>
                        {trip.driverName && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <LocalShipping sx={{ fontSize: 14, mr: 0.5, color: '#F0B90B' }} />
                            <Typography variant="body2" sx={{ color: '#F0B90B', fontWeight: 600, letterSpacing: '0.1px', fontSize: '0.8rem' }}>
                              Driver: {trip.driverName}{trip.driverCode ? ` (${trip.driverCode})` : ''}
                            </Typography>
                          </Box>
                        )}
                        {(typeof trip.advanceAmount === 'number' && trip.advanceAmount > 0) || (trip.isPaid && (trip.paidAmount || 0) < trip.amount) ? (
                          <Typography variant="body2" sx={{ color: '#848E9C', fontWeight: 500, letterSpacing: '0.1px', mt: 0.5, fontSize: '0.8rem' }}>
                            {trip.advanceAmount ? `Advance: ₹${trip.advanceAmount.toFixed(2)}` : ''}
                            {trip.paidAmount ? `${trip.advanceAmount ? '  ·  ' : ''}Paid so far: ₹${trip.paidAmount.toFixed(2)}` : ''}
                          </Typography>
                        ) : null}
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Edit Trip Dialog */}
      <Dialog open={Boolean(editTrip)} onClose={() => setEditTrip(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Trip</DialogTitle>
        <DialogContent>
          {editForm && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date"
                  type="date"
                  value={editForm.date}
                  onChange={e => updateEditField('date', e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Vehicle Type" value={editForm.vehicleType} onChange={e => updateEditField('vehicleType', e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Pickup Location" value={editForm.pickupLocation} onChange={e => updateEditField('pickupLocation', e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Drop Location" value={editForm.dropLocation} onChange={e => updateEditField('dropLocation', e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Vehicle Number" value={editForm.vehicleNumber} onChange={e => updateEditField('vehicleNumber', e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Material Type" value={editForm.materialType} onChange={e => updateEditField('materialType', e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Amount"
                  type="number"
                  value={editForm.amount}
                  onChange={e => updateEditField('amount', e.target.value)}
                  fullWidth
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Advance Amount"
                  type="number"
                  value={editForm.advanceAmount}
                  onChange={e => updateEditField('advanceAmount', e.target.value)}
                  fullWidth
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTrip(null)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={savingEdit} sx={{ color: '#0B0E11', fontWeight: 700 }}>
            {savingEdit ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={Boolean(paymentTrip)} onClose={() => setPaymentTrip(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          {paymentTrip && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
              {paymentError && <Alert severity="error">{paymentError}</Alert>}
              <Typography variant="body2" sx={{ color: '#848E9C' }}>
                Trip amount: ₹{Number(paymentTrip.amount || 0).toFixed(2)}
                {Number(paymentTrip.paidAmount) > 0 && ` · Already paid: ₹${Number(paymentTrip.paidAmount).toFixed(2)}`}
                {` · Remaining: ₹${remainingForPaymentTrip.toFixed(2)}`}
              </Typography>
              <TextField
                label="Amount Paid Now"
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                disabled={fullyPaid}
                fullWidth
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              />
              <FormControlLabel
                control={<Checkbox checked={fullyPaid} onChange={e => handleFullyPaidToggle(e.target.checked)} />}
                label="✅ Mark as fully paid"
              />
              {customerAdvanceBalance > 0 && (
                <FormControlLabel
                  control={<Checkbox checked={fromAdvance} onChange={e => setFromAdvance(e.target.checked)} />}
                  label={`Pay from advance balance (₹${customerAdvanceBalance.toFixed(2)} available)`}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentTrip(null)}>Cancel</Button>
          <Button onClick={handleConfirmPayment} variant="contained" disabled={savingPayment} sx={{ color: '#0B0E11', fontWeight: 700 }}>
            {savingPayment ? 'Saving...' : 'Confirm Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm reverting Paid -> Unpaid */}
      <Dialog open={Boolean(confirmUnpaidTrip)} onClose={() => setConfirmUnpaidTrip(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Change Payment Status?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#848E9C' }}>
            Are you sure you want to change this trip's payment status from Paid to Unpaid?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmUnpaidTrip(null)}>Cancel</Button>
          <Button onClick={handleConfirmMarkUnpaid} variant="contained" color="error" sx={{ fontWeight: 700 }}>
            Yes, Mark as Unpaid
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default TripList;
