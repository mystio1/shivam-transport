import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Avatar, List, Paper,
  TextField, InputAdornment, IconButton, Chip, useTheme,
} from '@mui/material';
import { LocalShipping, Search, Phone, ArrowForward, Clear, Groups, PersonSearch } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import EmptyState from '../components/EmptyState';
import { ListRowsSkeleton } from '../components/Skeletons';

const DriverList = () => {
  const { drivers, getDriverTrips, group, isLoading } = useAppContext();
  const showSkeleton = isLoading && drivers.length === 0;
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');

  const driverStats = drivers.map(driver => {
    const driverTrips = getDriverTrips(driver.id);
    const totalTrips = driverTrips.length;
    const totalAmount = driverTrips.reduce((s, t) => s + Number(t.amount || 0), 0);
    return { ...driver, totalTrips, totalAmount };
  });

  const visibleDrivers = driverStats.filter(
    d => d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.phone.includes(searchTerm)
  );

  const totalTripsAcrossDrivers = driverStats.reduce((s, d) => s + d.totalTrips, 0);
  const totalRevenueAcrossDrivers = driverStats.reduce((s, d) => s + d.totalAmount, 0);

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Drivers
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Everyone who has joined your group using code <strong>{group?.code}</strong>.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: { xs: 1.5, sm: 3 }, mb: 4 }}>
        <Card sx={{ height: { xs: '116px', sm: '140px' }, borderRadius: 2, background: theme.palette.background.paper, borderTop: '3px solid #F0B90B', color: 'text.primary', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: { xs: '0.75rem', sm: '1rem' } }}>Total Drivers</Typography>
              <Avatar sx={{ bgcolor: 'rgba(240, 185, 11, 0.1)', color: '#F0B90B', width: { xs: 28, sm: 36 }, height: { xs: 28, sm: 36 } }}>
                <Groups sx={{ fontSize: { xs: 15, sm: 18 } }} />
              </Avatar>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', sm: '2.2rem' }, color: 'text.primary', lineHeight: 1 }}>
              {drivers.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ height: { xs: '116px', sm: '140px' }, borderRadius: 2, background: theme.palette.background.paper, borderTop: `3px solid ${theme.palette.divider}`, color: 'text.primary', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: { xs: '0.75rem', sm: '1rem' } }}>Total Trips</Typography>
              <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', color: 'text.secondary', width: { xs: 28, sm: 36 }, height: { xs: 28, sm: 36 } }}>
                <LocalShipping sx={{ fontSize: { xs: 15, sm: 18 } }} />
              </Avatar>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', sm: '2.2rem' }, color: 'text.primary', lineHeight: 1 }}>
              {totalTripsAcrossDrivers}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ height: { xs: '116px', sm: '140px' }, borderRadius: 2, background: theme.palette.background.paper, borderTop: '3px solid #0ECB81', color: 'text.primary', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gridColumn: { xs: 'span 2', md: 'span 1' } }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: { xs: '0.75rem', sm: '1rem' } }}>Revenue Generated</Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '2rem' }, color: 'text.primary', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              ₹{totalRevenueAcrossDrivers.toFixed(2)}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <TextField
        placeholder="Search drivers..."
        variant="outlined"
        size="small"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        sx={{ width: { xs: '100%', sm: '320px' }, mb: 3 }}
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

      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
          All Drivers
          <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
            ({visibleDrivers.length} {visibleDrivers.length === 1 ? 'driver' : 'drivers'})
          </Typography>
        </Typography>

        {showSkeleton ? (
          <ListRowsSkeleton />
        ) : visibleDrivers.length === 0 ? (
          searchTerm ? (
            <EmptyState
              icon={<PersonSearch />}
              title="No drivers match your search"
              description="Try a different name or phone number."
              action={{ label: 'Clear search', onClick: () => setSearchTerm('') }}
            />
          ) : (
            <EmptyState
              icon={<Groups />}
              title="No drivers have joined yet"
              description={`Share your group code (${group?.code}) with a driver so they can join.`}
            />
          )
        ) : (
          <List sx={{ p: 0 }}>
            {visibleDrivers.map((driver, index) => (
              <Box
                key={driver.id}
                onClick={() => navigate(`/driver/${driver.id}`)}
                sx={{
                  mb: 1.5, p: 2, borderRadius: 2,
                  backgroundColor: index % 2 === 0 ? 'action.hover' : 'background.paper',
                  border: `1px solid ${theme.palette.divider}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 1, sm: 0 },
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': { backgroundColor: 'divider', borderLeft: '4px solid #F0B90B' },
                }}
              >
                <Avatar sx={{ bgcolor: 'rgba(240, 185, 11, 0.1)', color: '#F0B90B', mr: 2 }}>
                  <LocalShipping />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {driver.name}
                    {driver.userCode && (
                      <Box component="span" sx={{ ml: 1, color: '#F0B90B', fontWeight: 700, fontSize: '0.8rem' }}>
                        {driver.userCode}
                      </Box>
                    )}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Phone sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{driver.phone}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {driver.totalTrips} trips • ₹{driver.totalAmount.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
                {!driver.active && (
                  <Chip label="Inactive" size="small" sx={{ mr: 2, backgroundColor: 'rgba(246, 70, 93, 0.1)', color: '#F6465D', fontWeight: 600 }} />
                )}
                <IconButton edge="end" aria-label="details" sx={{ color: 'text.secondary' }}>
                  <ArrowForward />
                </IconButton>
              </Box>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default DriverList;
