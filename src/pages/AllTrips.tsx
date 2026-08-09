import { useState } from 'react';
import {
  Box, Typography, Paper, List, TextField, InputAdornment, IconButton, Chip, Button, useTheme,
} from '@mui/material';
import { Search, Clear, LocationOn, CalendarMonth, LocalShipping, Person, SearchOff } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import EmptyState from '../components/EmptyState';
import { ListRowsSkeleton } from '../components/Skeletons';

// Carried over when arriving here via the Dashboard's "Total Trips" card, so the date range
// selected there keeps applying instead of dropping back to "show everything".
interface AllTripsNavState {
  from?: string;
  to?: string;
}

const AllTrips = () => {
  const theme = useTheme();
  const { trips, isLoading } = useAppContext();
  const showSkeleton = isLoading && trips.length === 0;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const navState = location.state as AllTripsNavState | null;
  // Empty by default (show everything) unless the Dashboard handed off a date range.
  const [dateFrom, setDateFrom] = useState(navState?.from || '');
  const [dateTo, setDateTo] = useState(navState?.to || '');
  const isDateFiltered = Boolean(dateFrom || dateTo);

  const sortedTrips = [...trips].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const fromBound = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
  const toBound = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
  const dateFilteredTrips = sortedTrips.filter(trip => {
    const tripDate = new Date(trip.date);
    if (fromBound && tripDate < fromBound) return false;
    if (toBound && tripDate > toBound) return false;
    return true;
  });

  const visibleTrips = dateFilteredTrips.filter(trip => {
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
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: 'text.primary' }}>
          All Trips
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Every approved trip across all customers and drivers ({trips.length} total).
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
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
                <Search sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton aria-label="clear search" onClick={() => setSearchTerm('')} edge="end" size="small" sx={{ color: 'text.secondary' }}>
                  <Clear fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
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
          <Button size="small" startIcon={<Clear />} onClick={() => { setDateFrom(''); setDateTo(''); }} sx={{ color: 'text.secondary' }}>
            Clear dates
          </Button>
        )}
      </Box>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
          {visibleTrips.length} {visibleTrips.length === 1 ? 'trip' : 'trips'} shown
          {isDateFiltered && (
            <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary', fontWeight: 500 }}>
              (of {trips.length} total, date filtered)
            </Typography>
          )}
        </Typography>

        {showSkeleton ? (
          <ListRowsSkeleton />
        ) : visibleTrips.length === 0 ? (
          searchTerm ? (
            <EmptyState
              icon={<SearchOff />}
              title="No trips match your search"
              description="Try a different customer, driver, or route."
              action={{ label: 'Clear search', onClick: () => setSearchTerm('') }}
            />
          ) : isDateFiltered ? (
            <EmptyState
              icon={<SearchOff />}
              title="No trips in this date range"
              description="Try widening the From/To dates."
              action={{ label: 'Clear dates', onClick: () => { setDateFrom(''); setDateTo(''); } }}
            />
          ) : (
            <EmptyState
              icon={<LocalShipping />}
              title="No trips recorded yet"
              description="Trips you approve or add will show up here."
            />
          )
        ) : (
          <List sx={{ p: 0 }}>
            {visibleTrips.map((trip, index) => (
              <Box
                key={trip.id}
                onClick={() => trip.customerId && navigate(`/customer/${trip.customerId}`)}
                sx={{
                  mb: 1.5, p: 2, borderRadius: 2,
                  backgroundColor: index % 2 === 0 ? 'action.hover' : 'background.paper',
                  border: `1px solid ${theme.palette.divider}`,
                  cursor: trip.customerId ? 'pointer' : 'default',
                  transition: 'background-color 0.2s',
                  '&:hover': trip.customerId ? { backgroundColor: 'divider' } : {},
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.5, sm: 0 }, mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Person sx={{ mr: 1, color: '#F0B90B', fontSize: 20 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
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
                    <LocationOn sx={{ mr: 0.5, color: 'text.secondary', fontSize: 18 }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{trip.pickupLocation} → {trip.dropLocation}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarMonth sx={{ mr: 0.5, color: 'text.secondary', fontSize: 18 }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{new Date(trip.date).toLocaleDateString('en-IN')}</Typography>
                  </Box>
                  {trip.driverName && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LocalShipping sx={{ mr: 0.5, color: 'text.secondary', fontSize: 18 }} />
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{trip.driverName}</Typography>
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
