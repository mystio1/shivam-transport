import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, GridLegacy as Grid, Card, CardContent,
  IconButton, Chip, List, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import {
  ArrowBack, Phone, LocalShipping, ErrorOutline,
  CalendarMonth, LocationOn, CheckCircle, Cancel, Person, ChevronRight,
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';
import type { Trip } from '../types';

const DriverDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { drivers, getDriverTrips } = useAppContext();
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

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

  const driverTrips = [...getDriverTrips(driver.id)].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalTrips = driverTrips.length;
  const totalAmount = driverTrips.reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalAdvance = driverTrips.reduce((s, t) => s + Number(t.advanceAmount || 0), 0);
  const pendingAmount = driverTrips.filter(t => !t.isPaid).reduce((s, t) => s + Number(t.amount || 0), 0);

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

      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, background: '#161A1E', border: '1px solid #2B3139' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(240, 185, 11, 0.1)', color: '#F0B90B', width: 56, height: 56 }}>
              <LocalShipping fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#EAECEF' }}>{driver.name}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <Phone sx={{ fontSize: 18, mr: 1, color: '#F0B90B' }} />
                <Typography variant="body1" sx={{ color: '#848E9C' }}>{driver.phone}</Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, ml: 'auto' }}>
            <Chip
              icon={<LocalShipping />}
              label={`${totalTrips} Trips`}
              sx={{ fontWeight: 600, backgroundColor: 'rgba(240, 185, 11, 0.1)', color: '#F0B90B', border: '1px solid rgba(240, 185, 11, 0.2)' }}
            />
            {!driver.active && (
              <Chip label="Inactive" sx={{ fontWeight: 600, backgroundColor: 'rgba(246, 70, 93, 0.1)', color: '#F6465D' }} />
            )}
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ height: '100%', borderRadius: 2, background: '#161A1E', borderTop: '3px solid #2B3139', color: '#EAECEF', p: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#848E9C', fontWeight: 600, fontSize: '1rem' }}>Total Trips</Typography>
              <Typography variant="h3" sx={{ color: '#EAECEF', fontWeight: 800 }}>{totalTrips}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ height: '100%', borderRadius: 2, background: '#161A1E', borderTop: '3px solid #0ECB81', color: '#EAECEF', p: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#848E9C', fontWeight: 600, fontSize: '1rem' }}>Revenue Generated</Typography>
              <Typography variant="h3" sx={{ color: '#EAECEF', fontWeight: 800 }}>₹{totalAmount.toFixed(2)}</Typography>
              {totalAdvance > 0 && (
                <Typography variant="body2" sx={{ color: '#848E9C', mt: 1 }}>Advance collected: ₹{totalAdvance.toFixed(2)}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ height: '100%', borderRadius: 2, background: '#161A1E', borderTop: '3px solid #F6465D', color: '#EAECEF', p: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#848E9C', fontWeight: 600, fontSize: '1rem' }}>Pending (Net Payable)</Typography>
              <Typography variant="h3" sx={{ color: '#F6465D', fontWeight: 800 }}>₹{pendingAmount.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, background: '#161A1E', border: '1px solid #2B3139' }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3, color: '#EAECEF' }}>
          Trips Done by {driver.name}
        </Typography>
        {driverTrips.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center', color: '#848E9C' }}>
            <LocalShipping sx={{ fontSize: 48, mb: 1 }} />
            <Typography>No trips recorded yet for {driver.name}.</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {driverTrips.map((trip, index) => (
              <Box
                key={trip.id}
                onClick={() => setSelectedTrip(trip)}
                sx={{
                  mb: 1.5, py: 2, px: 3, borderRadius: 2,
                  bgcolor: index % 2 === 0 ? '#1E2329' : '#161A1E',
                  border: '1px solid #2B3139',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease-in-out',
                  '&:hover': { bgcolor: '#2B3139' },
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 }, mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Person sx={{ mr: 1, color: '#F0B90B', fontSize: 20 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#EAECEF' }}>
                      {trip.customerName || 'Walk-in Customer'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#EAECEF' }}>
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
                    <ChevronRight sx={{ color: '#5C6470' }} />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LocationOn sx={{ mr: 0.5, color: '#848E9C', fontSize: 18 }} />
                    <Typography variant="body2" sx={{ color: '#848E9C' }}>
                      {trip.pickupLocation} → {trip.dropLocation}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarMonth sx={{ mr: 0.5, color: '#848E9C', fontSize: 18 }} />
                    <Typography variant="body2" sx={{ color: '#848E9C' }}>
                      {new Date(trip.date).toLocaleDateString('en-IN')}
                    </Typography>
                  </Box>
                  {trip.materialType && (
                    <Typography variant="body2" sx={{ color: '#848E9C' }}>
                      Material: {trip.materialType}
                    </Typography>
                  )}
                  {typeof trip.advanceAmount === 'number' && trip.advanceAmount > 0 && (
                    <Typography variant="body2" sx={{ color: '#848E9C' }}>
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
                <Typography variant="caption" sx={{ color: '#848E9C' }}>Date</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {new Date(selectedTrip.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: '2-digit' })}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#848E9C' }}>Status</Typography>
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
                  <Typography variant="caption" sx={{ color: '#848E9C' }}>Rejection Reason</Typography>
                  <Typography variant="body1" sx={{ color: '#F6465D' }}>{selectedTrip.rejectionReason}</Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ color: '#848E9C' }}>Customer</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedTrip.customerName || 'Walk-in Customer'}</Typography>
                {(selectedTrip.customerPhone || selectedTrip.customerAddress) && (
                  <Typography variant="body2" sx={{ color: '#848E9C' }}>
                    {[selectedTrip.customerPhone, selectedTrip.customerAddress].filter(Boolean).join(' · ')}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#848E9C' }}>Pickup</Typography>
                <Typography variant="body1">{selectedTrip.pickupLocation || '—'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#848E9C' }}>Drop</Typography>
                <Typography variant="body1">{selectedTrip.dropLocation || '—'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#848E9C' }}>Vehicle Type</Typography>
                <Typography variant="body1">{selectedTrip.vehicleType || '—'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#848E9C' }}>Vehicle Number</Typography>
                <Typography variant="body1">{selectedTrip.vehicleNumber || '—'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ color: '#848E9C' }}>Material</Typography>
                <Typography variant="body1">{selectedTrip.materialType || 'Not specified'}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" sx={{ color: '#848E9C' }}>Amount</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>₹{Number(selectedTrip.amount || 0).toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" sx={{ color: '#848E9C' }}>Advance (at booking)</Typography>
                <Typography variant="body1">₹{Number(selectedTrip.advanceAmount || 0).toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" sx={{ color: '#848E9C' }}>Paid So Far</Typography>
                <Typography variant="body1" sx={{ color: '#0ECB81', fontWeight: 700 }}>₹{Number(selectedTrip.paidAmount || 0).toFixed(2)}</Typography>
              </Grid>
              {selectedTrip.paymentMode && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#848E9C' }}>Payment Mode</Typography>
                  <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>{selectedTrip.paymentMode.replace('_', ' ')}</Typography>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: '#848E9C' }}>Driver</Typography>
                <Typography variant="body1">
                  {selectedTrip.driverName || driver.name}{selectedTrip.driverCode ? ` (${selectedTrip.driverCode})` : ''}
                </Typography>
              </Grid>
              {selectedTrip.submittedAt && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#848E9C' }}>Submitted</Typography>
                  <Typography variant="body2">{new Date(selectedTrip.submittedAt).toLocaleString('en-IN')}</Typography>
                </Grid>
              )}
              {selectedTrip.approvedAt && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#848E9C' }}>Approved</Typography>
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
    </Box>
  );
};

export default DriverDetails;
