import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Avatar, List, Paper,
  TextField, InputAdornment, IconButton, Chip,
} from '@mui/material';
import { LocalShipping, Search, Phone, ArrowForward, Clear, Groups } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const DriverList = () => {
  const { drivers, getDriverTrips, group } = useAppContext();
  const navigate = useNavigate();
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
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: '#EAECEF' }}>
          Drivers
        </Typography>
        <Typography variant="body2" sx={{ color: '#848E9C', mt: 0.5 }}>
          Everyone who has joined your group using code <strong>{group?.code}</strong>.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: { xs: 1.5, sm: 3 }, mb: 4 }}>
        <Card sx={{ height: { xs: '116px', sm: '140px' }, borderRadius: 2, background: '#161A1E', borderTop: '3px solid #F0B90B', color: '#EAECEF', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#848E9C', fontSize: { xs: '0.75rem', sm: '1rem' } }}>Total Drivers</Typography>
              <Avatar sx={{ bgcolor: 'rgba(240, 185, 11, 0.1)', color: '#F0B90B', width: { xs: 28, sm: 36 }, height: { xs: 28, sm: 36 } }}>
                <Groups sx={{ fontSize: { xs: 15, sm: 18 } }} />
              </Avatar>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', sm: '2.2rem' }, color: '#EAECEF', lineHeight: 1 }}>
              {drivers.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ height: { xs: '116px', sm: '140px' }, borderRadius: 2, background: '#161A1E', borderTop: '3px solid #2B3139', color: '#EAECEF', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#848E9C', fontSize: { xs: '0.75rem', sm: '1rem' } }}>Total Trips</Typography>
              <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', color: '#848E9C', width: { xs: 28, sm: 36 }, height: { xs: 28, sm: 36 } }}>
                <LocalShipping sx={{ fontSize: { xs: 15, sm: 18 } }} />
              </Avatar>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', sm: '2.2rem' }, color: '#EAECEF', lineHeight: 1 }}>
              {totalTripsAcrossDrivers}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ height: { xs: '116px', sm: '140px' }, borderRadius: 2, background: '#161A1E', borderTop: '3px solid #0ECB81', color: '#EAECEF', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gridColumn: { xs: 'span 2', md: 'span 1' } }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#848E9C', fontSize: { xs: '0.75rem', sm: '1rem' } }}>Revenue Generated</Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '2rem' }, color: '#EAECEF', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, background: '#161A1E', border: '1px solid #2B3139' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#EAECEF' }}>
          All Drivers
          <Typography component="span" variant="body2" sx={{ ml: 1, color: '#848E9C' }}>
            ({visibleDrivers.length} {visibleDrivers.length === 1 ? 'driver' : 'drivers'})
          </Typography>
        </Typography>

        {visibleDrivers.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Groups sx={{ fontSize: 48, color: '#848E9C', mb: 1 }} />
            <Typography variant="h6" sx={{ color: '#848E9C', mb: 1 }}>
              {searchTerm ? 'No drivers match your search' : 'No drivers have joined yet'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#848E9C' }}>
              {searchTerm ? 'Try a different name or phone number' : `Share your group code (${group?.code}) with a driver so they can join.`}
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {visibleDrivers.map((driver, index) => (
              <Box
                key={driver.id}
                onClick={() => navigate(`/driver/${driver.id}`)}
                sx={{
                  mb: 1.5, p: 2, borderRadius: 2,
                  backgroundColor: index % 2 === 0 ? '#1E2329' : '#161A1E',
                  border: '1px solid #2B3139',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 1, sm: 0 },
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': { backgroundColor: '#2B3139', borderLeft: '4px solid #F0B90B' },
                }}
              >
                <Avatar sx={{ bgcolor: 'rgba(240, 185, 11, 0.1)', color: '#F0B90B', mr: 2 }}>
                  <LocalShipping />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#EAECEF' }}>
                    {driver.name}
                    {driver.userCode && (
                      <Box component="span" sx={{ ml: 1, color: '#F0B90B', fontWeight: 700, fontSize: '0.8rem' }}>
                        {driver.userCode}
                      </Box>
                    )}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Phone sx={{ fontSize: 14, mr: 0.5, color: '#848E9C' }} />
                      <Typography variant="body2" sx={{ color: '#848E9C' }}>{driver.phone}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#848E9C' }}>
                      {driver.totalTrips} trips • ₹{driver.totalAmount.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
                {!driver.active && (
                  <Chip label="Inactive" size="small" sx={{ mr: 2, backgroundColor: 'rgba(246, 70, 93, 0.1)', color: '#F6465D', fontWeight: 600 }} />
                )}
                <IconButton edge="end" aria-label="details" sx={{ color: '#848E9C' }}>
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
