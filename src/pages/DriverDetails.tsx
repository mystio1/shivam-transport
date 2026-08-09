import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, GridLegacy as Grid, Card, CardContent,
  IconButton, Chip, List, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Alert, TextField, useTheme,
} from '@mui/material';
import {
  ArrowBack, Phone, LocalShipping, ErrorOutline, VpnKey,
  CalendarMonth, LocationOn, CheckCircle, Cancel, Person, ChevronRight, Clear,
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';
import type { Trip } from '../types';

const DriverDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { drivers, getDriverTrips, resetDriverPassword } = useAppContext();
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);
  // Empty by default — no filter applied, so a fresh visit shows this driver's full history
  // (start to end) rather than defaulting to a recent window like the Dashboard does.
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const isDateFiltered = Boolean(dateFrom || dateTo);

  const driver = drivers.find(d => d.id === id);

  if (!driver) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <ErrorOutline sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom color="error.main">Driver Not Found</Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>This driver doesn't exist in your group (or hasn't loaded yet).</Typography>
        <IconButton onClick={() => navigate('/drivers')} sx={{ bgcolor: 'action.hover' }} aria-label="back">
          <ArrowBack />
        </IconButton>
      </Box>
    );
  }

  const allDriverTrips = [...getDriverTrips(driver.id)].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const fromBound = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
  const toBound = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
  const driverTrips = allDriverTrips.filter(t => {
    const tripDate = new Date(t.date);
    if (fromBound && tripDate < fromBound) return false;
    if (toBound && tripDate > toBound) return false;
    return true;
  });

  const totalTrips = driverTrips.length;
  const totalAmount = driverTrips.reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalAdvance = driverTrips.reduce((s, t) => s + Number(t.advanceAmount || 0), 0);
  const pendingAmount = driverTrips.filter(t => !t.isPaid).reduce((s, t) => s + Number(t.amount || 0), 0);

  const openResetDialog = () => {
    setNewPassword('');
    setResetError('');
    setResetSuccess(false);
    setResetDialogOpen(true);
  };

  const handleResetPassword = async () => {
    setResetError('');
    if (newPassword.length < 6) return setResetError('Password must be at least 6 characters');
    setResetting(true);
    try {
      await resetDriverPassword(driver.id, newPassword);
      setResetSuccess(true);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Could not reset password');
    } finally {
      setResetting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <IconButton onClick={() => navigate('/drivers')} sx={{ mr: 2, bgcolor: 'action.hover' }} aria-label="back">
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" color="primary.dark" sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', sm: '2.125rem' } }}>
          Driver Details
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, background: 'background.paper', border: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(240, 185, 11, 0.1)', color: '#F0B90B', width: 56, height: 56 }}>
              <LocalShipping fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>{driver.name}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <Phone sx={{ fontSize: 18, mr: 1, color: '#F0B90B' }} />
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>{driver.phone}</Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, ml: 'auto', alignItems: 'center' }}>
            <Chip
              icon={<LocalShipping />}
              label={`${totalTrips} Trips`}
              sx={{ fontWeight: 600, backgroundColor: 'rgba(240, 185, 11, 0.1)', color: '#F0B90B', border: '1px solid rgba(240, 185, 11, 0.2)' }}
            />
            {!driver.active && (
              <Chip label="Inactive" sx={{ fontWeight: 600, backgroundColor: 'rgba(246, 70, 93, 0.1)', color: '#F6465D' }} />
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<VpnKey />}
              onClick={openResetDialog}
              sx={{ color: 'text.secondary', borderColor: 'divider', '&:hover': { borderColor: '#F0B90B', color: '#F0B90B' } }}
            >
              Reset Password
            </Button>
          </Box>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, background: 'background.paper', border: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mr: 0.5 }}>
            Filter by date:
          </Typography>
          <TextField
            label="From" type="date" size="small"
            value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          <TextField
            label="To" type="date" size="small"
            value={dateTo} onChange={e => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          {isDateFiltered && (
            <Button
              size="small"
              startIcon={<Clear />}
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              sx={{ color: 'text.secondary' }}
            >
              Clear
            </Button>
          )}
          <Typography variant="body2" sx={{ color: 'text.secondary', ml: { sm: 'auto' } }}>
            {isDateFiltered
              ? `Showing ${totalTrips} of ${allDriverTrips.length} trip${allDriverTrips.length === 1 ? '' : 's'}`
              : `Showing all ${allDriverTrips.length} trip${allDriverTrips.length === 1 ? '' : 's'}`}
          </Typography>
        </Box>
      </Paper>

      <Grid container spacing={{ xs: 1.5, sm: 3 }}>
        <Grid item xs={4}>
          <Card sx={{ height: '100%', borderRadius: 2, background: 'background.paper', borderTop: `3px solid ${theme.palette.divider}`, color: 'text.primary' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Typography gutterBottom sx={{ color: 'text.secondary', fontWeight: 600, fontSize: { xs: '0.7rem', sm: '1rem' } }}>Total Trips</Typography>
              <Typography sx={{ color: 'text.primary', fontWeight: 800, fontSize: { xs: '1.3rem', sm: '2.2rem' } }}>{totalTrips}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card sx={{ height: '100%', borderRadius: 2, background: 'background.paper', borderTop: '3px solid #0ECB81', color: 'text.primary' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Typography gutterBottom sx={{ color: 'text.secondary', fontWeight: 600, fontSize: { xs: '0.7rem', sm: '1rem' } }}>Revenue Generated</Typography>
              <Typography sx={{ color: 'text.primary', fontWeight: 800, fontSize: { xs: '0.95rem', sm: '2.2rem' }, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>₹{totalAmount.toFixed(2)}</Typography>
              {totalAdvance > 0 && (
                <Typography sx={{ color: 'text.secondary', mt: 1, fontWeight: 500, fontSize: { xs: '0.65rem', sm: '0.875rem' }, display: { xs: 'none', sm: 'block' } }}>
                  Advance collected: ₹{totalAdvance.toFixed(2)}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card sx={{ height: '100%', borderRadius: 2, background: 'background.paper', borderTop: '3px solid #F6465D', color: 'text.primary' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Typography gutterBottom sx={{ color: 'text.secondary', fontWeight: 600, fontSize: { xs: '0.7rem', sm: '1rem' } }}>Pending (Net Payable)</Typography>
              <Typography sx={{ color: '#F6465D', fontWeight: 800, fontSize: { xs: '0.95rem', sm: '2.2rem' }, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>₹{pendingAmount.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, background: 'background.paper', border: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3, color: 'text.primary' }}>
          Trips Done by {driver.name}
        </Typography>
        {driverTrips.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
            <LocalShipping sx={{ fontSize: 48, mb: 1 }} />
            <Typography>
              {isDateFiltered
                ? `No trips for ${driver.name} in this date range.`
                : `No trips recorded yet for ${driver.name}.`}
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {driverTrips.map((trip, index) => (
              <Box
                key={trip.id}
                onClick={() => setSelectedTrip(trip)}
                sx={{
                  mb: 1.5, py: 2, px: 3, borderRadius: 2,
                  bgcolor: index % 2 === 0 ? 'action.hover' : 'background.paper',
                  border: `1px solid ${theme.palette.divider}`,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease-in-out',
                  '&:hover': { bgcolor: 'divider' },
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 }, mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Person sx={{ mr: 1, color: '#F0B90B', fontSize: 20 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {trip.customerName || 'Walk-in Customer'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      ₹{Number(trip.amount || 0).toFixed(2)}
                    </Typography>
                    <Chip
                      icon={trip.isPaid ? <CheckCircle /> : <Cancel />}
                      label={trip.isPaid ? 'Paid' : 'Unpaid'}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        backgroundColor: trip.isPaid ? 'rgba(14, 203, 129, 0.1)' : 'rgba(246, 70, 93, 0.1)',
                        color: trip.isPaid ? '#0ECB81' : '#F6465D',
                      }}
                    />
                    {trip.status === 'pending' && (
                      <Chip label="Awaiting Approval" size="small" sx={{ fontWeight: 600, backgroundColor: 'rgba(240, 185, 11, 0.1)', color: '#F0B90B' }} />
                    )}
                    <ChevronRight sx={{ color: 'text.secondary' }} />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LocationOn sx={{ mr: 0.5, color: 'text.secondary', fontSize: 18 }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {trip.pickupLocation} → {trip.dropLocation}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarMonth sx={{ mr: 0.5, color: 'text.secondary', fontSize: 18 }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {new Date(trip.date).toLocaleDateString('en-IN')}
                    </Typography>
                  </Box>
                  {trip.materialType && (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Material: {trip.materialType}
                    </Typography>
                  )}
                  {typeof trip.advanceAmount === 'number' && trip.advanceAmount > 0 && (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Advance: ₹{trip.advanceAmount.toFixed(2)}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </List>
        )}
      </Paper>

      {/* Trip Details — full record behind each trip card: material, vehicle, payment breakdown, status */}
      <Dialog open={Boolean(selectedTrip)} onClose={() => setSelectedTrip(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Trip Details</DialogTitle>
        <DialogContent>
          {selectedTrip && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Date</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {new Date(selectedTrip.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: '2-digit' })}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Status</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={selectedTrip.status === 'pending' ? 'Awaiting Approval' : selectedTrip.status === 'rejected' ? 'Rejected' : 'Approved'}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      backgroundColor: selectedTrip.status === 'rejected' ? 'rgba(246, 70, 93, 0.1)' : selectedTrip.status === 'pending' ? 'rgba(240, 185, 11, 0.1)' : 'rgba(14, 203, 129, 0.1)',
                      color: selectedTrip.status === 'rejected' ? '#F6465D' : selectedTrip.status === 'pending' ? '#F0B90B' : '#0ECB81',
                    }}
                  />
                  <Chip
                    icon={selectedTrip.isPaid ? <CheckCircle /> : <Cancel />}
                    label={selectedTrip.isPaid ? 'Paid' : 'Unpaid'}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      backgroundColor: selectedTrip.isPaid ? 'rgba(14, 203, 129, 0.1)' : 'rgba(246, 70, 93, 0.1)',
                      color: selectedTrip.isPaid ? '#0ECB81' : '#F6465D',
                    }}
                  />
                </Box>
              </Grid>
              {selectedTrip.status === 'rejected' && selectedTrip.rejectionReason && (
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Rejection Reason</Typography>
                  <Typography variant="body1" sx={{ color: '#F6465D' }}>{selectedTrip.rejectionReason}</Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Customer</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedTrip.customerName || 'Walk-in Customer'}</Typography>
                {(selectedTrip.customerPhone || selectedTrip.customerAddress) && (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {[selectedTrip.customerPhone, selectedTrip.customerAddress].filter(Boolean).join(' · ')}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Pickup</Typography>
                <Typography variant="body1">{selectedTrip.pickupLocation || '—'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Drop</Typography>
                <Typography variant="body1">{selectedTrip.dropLocation || '—'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Vehicle Type</Typography>
                <Typography variant="body1">{selectedTrip.vehicleType || '—'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Vehicle Number</Typography>
                <Typography variant="body1">{selectedTrip.vehicleNumber || '—'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Material</Typography>
                <Typography variant="body1">{selectedTrip.materialType || 'Not specified'}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Amount</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>₹{Number(selectedTrip.amount || 0).toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Advance (at booking)</Typography>
                <Typography variant="body1">₹{Number(selectedTrip.advanceAmount || 0).toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Paid So Far</Typography>
                <Typography variant="body1" sx={{ color: '#0ECB81', fontWeight: 700 }}>₹{Number(selectedTrip.paidAmount || 0).toFixed(2)}</Typography>
              </Grid>
              {selectedTrip.paymentMode && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Payment Mode</Typography>
                  <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>{selectedTrip.paymentMode.replace('_', ' ')}</Typography>
                </Grid>
              )}
              {selectedTrip.paymentNote && (
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Payment Note</Typography>
                  <Typography variant="body1">{selectedTrip.paymentNote}</Typography>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Driver</Typography>
                <Typography variant="body1">
                  {selectedTrip.driverName || driver.name}{selectedTrip.driverCode ? ` (${selectedTrip.driverCode})` : ''}
                </Typography>
              </Grid>
              {selectedTrip.submittedAt && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Submitted</Typography>
                  <Typography variant="body2">{new Date(selectedTrip.submittedAt).toLocaleString('en-IN')}</Typography>
                </Grid>
              )}
              {selectedTrip.approvedAt && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Approved</Typography>
                  <Typography variant="body2">{new Date(selectedTrip.approvedAt).toLocaleString('en-IN')}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedTrip(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Reset a driver's password directly — drivers have no recovery email on file, so this is
          how they get back in if they forget it: tell them the new password yourself. */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reset Password for {driver.name}</DialogTitle>
        <DialogContent>
          {resetSuccess ? (
            <Alert severity="success" sx={{ mt: 1 }}>
              Password reset. Share the new password with {driver.name} directly (call/WhatsApp) —
              it won't be shown again.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              {resetError && <Alert severity="error">{resetError}</Alert>}
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Set a new password for this driver. They'll need it (along with the group code) to log in.
              </Typography>
              <TextField
                label="New Password"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                helperText="Minimum 6 characters"
                fullWidth
                autoFocus
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>{resetSuccess ? 'Close' : 'Cancel'}</Button>
          {!resetSuccess && (
            <Button variant="contained" onClick={handleResetPassword} disabled={resetting || !newPassword}>
              {resetting ? 'Resetting...' : 'Reset Password'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DriverDetails;
