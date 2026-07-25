import { useState } from 'react';
import {
  Box, Typography, Paper, List, TextField, InputAdornment, IconButton, Chip,
} from '@mui/material';
import { Search, Clear, LocationOn, CalendarMonth, LocalShipping, Person } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const AllTrips = () => {
  const { trips } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const sortedTrips = [...trips].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const visibleTrips = sortedTrips.filter(trip => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (trip.customerName || '').toLowerCase().includes(q) ||
      (trip.driverName || '').toLowerCase().includes(q) ||
      trip.pickupLocation.toLowerCase().includes(q) ||
      trip.dropLocation.toLowerCase().includes(q)
    );
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: '#EAECEF' }}>
          All Trips
        </Typography>
        <Typography variant="body2" sx={{ color: '#848E9C', mt: 0.5 }}>
          Every approved trip across all customers and drivers ({trips.length} total).
        </Typography>
      </Box>

      <TextField
        placeholder="Search by customer, driver, or route..."
        variant="outlined"
        size="small"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        sx={{ width: { xs: '100%', sm: '400px' } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ color: '#848E9C' }} />
            </InputAdornment>
          ),
          endAdornment: searchTerm && (
            <InputAdornment position="end">
              <IconButton aria-label="clear search" onClick={() => setSearchTerm('')} edge="end" size="small" sx={{ color: '#848E9C' }}>
                <Clear fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, background: '#161A1E', border: '1px solid #2B3139' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#EAECEF' }}>
          {visibleTrips.length} {visibleTrips.length === 1 ? 'trip' : 'trips'} shown
        </Typography>

        {visibleTrips.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center', color: '#848E9C' }}>
            <LocalShipping sx={{ fontSize: 48, mb: 1 }} />
            <Typography>{searchTerm ? 'No trips match your search.' : 'No trips recorded yet.'}</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {visibleTrips.map((trip, index) => (
              <Box
                key={trip.id}
                onClick={() => trip.customerId && navigate(`/customer/${trip.customerId}`)}
                sx={{
                  mb: 1.5, p: 2, borderRadius: 2,
                  backgroundColor: index % 2 === 0 ? '#1E2329' : '#161A1E',
                  border: '1px solid #2B3139',
                  cursor: trip.customerId ? 'pointer' : 'default',
                  transition: 'background-color 0.2s',
                  '&:hover': trip.customerId ? { backgroundColor: '#2B3139' } : {},
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.5, sm: 0 }, mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Person sx={{ mr: 1, color: '#F0B90B', fontSize: 20 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#EAECEF' }}>
                      {trip.customerName || 'Walk-in Customer'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: trip.isPaid ? '#0ECB81' : '#F6465D' }}>
                      ₹{Number(trip.amount || 0).toFixed(2)}
                    </Typography>
                    <Chip
                      label={trip.isPaid ? 'Paid' : 'Unpaid'}
                      size="small"
                      sx={{ fontWeight: 600, backgroundColor: trip.isPaid ? 'rgba(14, 203, 129, 0.1)' : 'rgba(246, 70, 93, 0.1)', color: trip.isPaid ? '#0ECB81' : '#F6465D' }}
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LocationOn sx={{ mr: 0.5, color: '#848E9C', fontSize: 18 }} />
                    <Typography variant="body2" sx={{ color: '#848E9C' }}>{trip.pickupLocation} → {trip.dropLocation}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarMonth sx={{ mr: 0.5, color: '#848E9C', fontSize: 18 }} />
                    <Typography variant="body2" sx={{ color: '#848E9C' }}>{new Date(trip.date).toLocaleDateString('en-IN')}</Typography>
                  </Box>
                  {trip.driverName && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LocalShipping sx={{ mr: 0.5, color: '#848E9C', fontSize: 18 }} />
                      <Typography variant="body2" sx={{ color: '#848E9C' }}>{trip.driverName}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default AllTrips;
