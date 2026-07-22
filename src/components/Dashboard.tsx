import {
  Box,
  Typography,
  Paper,
  GridLegacy as Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  useTheme,
  List,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Person,
  LocalShipping,
  AccountBalanceWallet,
  TrendingUp,
  CalendarMonth,
  LocationOn,
  Receipt,
  ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { customers, trips, getCustomerTrips } = useAppContext();

  // Calculate summary statistics
  const totalCustomers = customers.length;
  const totalTrips = trips.length;
  
  // Calculate total revenue from all trips
  const totalRevenue = trips.reduce((sum, trip) => {
    const amount = typeof trip.amount === 'number' ? trip.amount : parseFloat(trip.amount) || 0;
    return sum + amount;
  }, 0);
  
  // Calculate revenue from paid trips
  const paidRevenue = trips.filter(trip => trip.isPaid).reduce((sum, trip) => {
    const amount = typeof trip.amount === 'number' ? trip.amount : parseFloat(trip.amount) || 0;
    return sum + amount;
  }, 0);
  
  const unpaidRevenue = totalRevenue - paidRevenue;
  
  const paidPercentage = totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0;
  
  // Get recent trips (last 5)
  const recentTrips = [...trips]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Get top customers by trip count
  const customerTripCounts = customers.map(customer => {
    const customerTrips = getCustomerTrips(customer.id);
    return {
      id: customer.id,
      name: customer.name,
      tripCount: customerTrips.length,
      totalAmount: customerTrips.reduce((sum, trip) => sum + (typeof trip.amount === 'number' ? trip.amount : 0), 0),
    };
  });

  const topCustomers = [...customerTripCounts]
    .sort((a, b) => b.tripCount - a.tripCount)
    .slice(0, 5);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2, sm: 4 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 800,
              letterSpacing: '0.5px',
              color: theme.palette.primary.main,
              textShadow: '0 2px 8px rgba(25, 118, 210, 0.12)',
            }}
          >
            Business Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Quick snapshot of customers, trips and payments.
          </Typography>
        </Box>
        <Chip
          color="primary"
          label={`${totalTrips} trips • ₹${totalRevenue.toFixed(2)} revenue`}
          sx={{
            borderRadius: 999,
            fontWeight: 600,
            px: 1.5,
          }}
        />
      </Box>
      {/* Summary Cards */}
      <Grid container spacing={{ xs: 2, sm: 4 }} sx={{ mb: { xs: 2, sm: 5 } }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            height: '100%',
            borderRadius: 2,
            background: '#161A1E',
            borderTop: '3px solid #F0B90B',
            color: '#EAECEF',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            transition: 'transform 0.3s, box-shadow 0.3s',
            '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(240, 185, 11, 0.15)' },
            p: 2
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, letterSpacing: '0.3px', fontSize: '1rem', color: '#848E9C' }}>Customers</Typography>
                <Avatar sx={{ bgcolor: 'rgba(240, 185, 11, 0.1)', color: '#F0B90B', width: 48, height: 48 }}>
                  <Person sx={{ fontSize: 24 }} />
                </Avatar>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, fontSize: '2.2rem', color: '#EAECEF' }}>{totalCustomers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            height: '100%',
            borderRadius: 2,
            background: '#161A1E',
            borderTop: '3px solid #2B3139',
            color: '#EAECEF',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            transition: 'transform 0.3s, box-shadow 0.3s',
            '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(255, 255, 255, 0.05)' },
            p: 2
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, letterSpacing: '0.3px', fontSize: '1rem', color: '#848E9C' }}>Total Trips</Typography>
                <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', color: '#848E9C', width: 48, height: 48 }}>
                  <LocalShipping sx={{ fontSize: 24 }} />
                </Avatar>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, fontSize: '2.2rem', color: '#EAECEF' }}>{totalTrips}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            height: '100%',
            borderRadius: 2,
            background: '#161A1E',
            borderTop: '3px solid #0ECB81',
            color: '#EAECEF',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            transition: 'transform 0.3s, box-shadow 0.3s',
            '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(14, 203, 129, 0.15)' },
            p: 2
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, letterSpacing: '0.3px', fontSize: '1rem', color: '#848E9C' }}>Revenue</Typography>
                <Avatar sx={{ bgcolor: 'rgba(14, 203, 129, 0.1)', color: '#0ECB81', width: 48, height: 48 }}>
                  <AccountBalanceWallet sx={{ fontSize: 24 }} />
                </Avatar>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, fontSize: '2.2rem', color: '#EAECEF' }}>₹{totalRevenue.toFixed(2)}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Chip 
                  label={`${paidPercentage}% Collected`} 
                  size="small"
                  sx={{ fontWeight: 600, mr: 1, backgroundColor: 'rgba(14, 203, 129, 0.1)', color: '#0ECB81' }}
                />
                <Typography variant="body2" sx={{ color: '#F6465D', fontWeight: 500 }}>
                  ₹{unpaidRevenue.toFixed(2)} pending
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            height: '100%',
            borderRadius: 2,
            background: '#161A1E',
            borderTop: '3px solid #2B3139',
            color: '#EAECEF',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            transition: 'transform 0.3s, box-shadow 0.3s',
            '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(255, 255, 255, 0.05)' },
            p: 2
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, letterSpacing: '0.3px', fontSize: '1rem', color: '#848E9C' }}>Avg. Trip Value</Typography>
                <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', color: '#848E9C', width: 48, height: 48 }}>
                  <TrendingUp sx={{ fontSize: 24 }} />
                </Avatar>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, fontSize: '2.2rem', color: '#EAECEF' }}>
                ₹{totalTrips > 0 ? (totalRevenue / totalTrips).toFixed(2) : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, height: '100%', borderRadius: 2, background: '#161A1E', border: '1px solid #2B3139' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2, color: '#EAECEF' }}>
              Recent Trips
            </Typography>
            {recentTrips.length === 0 ? (
              <Typography variant="body2" sx={{ textAlign: 'center', py: 4, color: '#848E9C' }}>
                No trips recorded yet.
              </Typography>
            ) : (
              <List sx={{ p: 0 }}>
                {recentTrips.map((trip) => {
                  const customer = customers.find(c => c.id === trip.customerId);
                  const clickable = Boolean(trip.customerId);
                  return (
                    <Box
                      key={trip.id}
                      onClick={() => clickable && navigate(`/customer/${trip.customerId}`)}
                      sx={{
                        mb: 1.5, p: 2, borderRadius: 2, backgroundColor: '#1E2329',
                        transition: 'background-color 0.2s',
                        cursor: clickable ? 'pointer' : 'default',
                        '&:hover': clickable ? { backgroundColor: '#2B3139' } : {},
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#EAECEF' }}>
                          {customer?.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: trip.isPaid ? '#0ECB81' : '#F6465D' }}>
                            ₹{typeof trip.amount === 'number' ? trip.amount.toFixed(2) : '0.00'}
                          </Typography>
                          {clickable && (
                            <Tooltip title="View & print bill">
                              <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); navigate(`/customer/${trip.customerId}`); }}
                                sx={{ color: '#F0B90B' }}
                              >
                                <Receipt fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocationOn sx={{ fontSize: 14, mr: 0.5, color: '#848E9C' }} />
                          <Typography variant="body2" sx={{ color: '#848E9C', fontSize: '0.8rem' }}>
                            {trip.pickupLocation} → {trip.dropLocation}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CalendarMonth sx={{ fontSize: 14, mr: 0.5, color: '#848E9C' }} />
                          <Typography variant="body2" sx={{ color: '#848E9C', fontSize: '0.8rem' }}>
                            {new Date(trip.date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, height: '100%', borderRadius: 2, background: '#161A1E', border: '1px solid #2B3139' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2, color: '#EAECEF' }}>
              Top Customers
            </Typography>
            {topCustomers.length === 0 ? (
              <Typography variant="body2" sx={{ textAlign: 'center', py: 4, color: '#848E9C' }}>
                No customer data available yet.
              </Typography>
            ) : (
              <List sx={{ p: 0 }}>
                {topCustomers.map((customer, index) => (
                  <Box
                    key={customer.id}
                    onClick={() => navigate(`/customer/${customer.id}`)}
                    sx={{
                      mb: 1.5, p: 2, borderRadius: 2, backgroundColor: '#1E2329',
                      transition: 'background-color 0.2s', cursor: 'pointer',
                      '&:hover': { backgroundColor: '#2B3139' },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: 'rgba(240, 185, 11, 0.1)', color: '#F0B90B', width: 36, height: 36, mr: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{index + 1}</Typography>
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#EAECEF' }}>
                            {customer.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#848E9C', fontSize: '0.8rem' }}>
                            {customer.tripCount} trips
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#0ECB81' }}>
                          ₹{customer.totalAmount.toFixed(2)}
                        </Typography>
                        <ArrowForward sx={{ fontSize: 16, color: '#848E9C' }} />
                      </Box>
                    </Box>
                  </Box>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
