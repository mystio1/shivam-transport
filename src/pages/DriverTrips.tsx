import {
  Avatar,
  Box,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { CheckCircle, HourglassTop, Cancel, LocalShipping } from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';
import type { Trip, TripStatus } from '../types';

function statusMeta(status: TripStatus | undefined) {
  if (status === 'approved') {
    return { label: 'Approved', color: '#0ECB81', icon: <CheckCircle /> };
  }
  if (status === 'rejected') {
    return { label: 'Rejected', color: '#F6465D', icon: <Cancel /> };
  }
  return { label: 'Pending', color: '#F0B90B', icon: <HourglassTop /> };
}

const DriverTrips = () => {
  const { allTrips, user, group } = useAppContext();
  const myTrips = allTrips.filter((trip: Trip) => trip.driverId === user?.id || user?.role === 'driver');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper elevation={0} sx={{ p: 3, bgcolor: '#161A1E', border: '1px solid #2B3139' }}>
        <Typography variant="h5" sx={{ color: '#F0B90B', fontWeight: 800 }}>
          My Trips
        </Typography>
        <Typography variant="body2" sx={{ color: '#848E9C' }}>
          Group code: <strong>{group?.code}</strong>. Status updates appear automatically.
        </Typography>
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#161A1E', border: '1px solid #2B3139' }}>
        {myTrips.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center', color: '#848E9C' }}>
            <LocalShipping sx={{ fontSize: 48, mb: 1 }} />
            <Typography>No trips submitted yet.</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {myTrips.map(trip => {
              const meta = statusMeta(trip.status);
              return (
                <ListItem
                  key={trip.id}
                  sx={{
                    mb: 1.5,
                    bgcolor: '#1E2329',
                    border: '1px solid #2B3139',
                    borderRadius: 2,
                    alignItems: 'flex-start',
                  }}
                  secondaryAction={
                    <Chip
                      label={meta.label}
                      sx={{ bgcolor: `${meta.color}22`, color: meta.color, fontWeight: 800 }}
                    />
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: `${meta.color}22`, color: meta.color }}>
                      {meta.icon}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography sx={{ color: '#EAECEF', fontWeight: 800, pr: 10 }}>
                        {trip.customerName || 'Customer'} - ₹{Number(trip.amount || 0).toFixed(2)}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ color: '#848E9C', mt: 0.5 }}>
                        <Typography variant="body2" sx={{ color: '#848E9C' }}>
                          {new Date(trip.date).toLocaleDateString('en-IN')} | {trip.pickupLocation} to {trip.dropLocation}
                        </Typography>
                        {trip.rejectionReason && (
                          <Typography variant="body2" sx={{ color: '#F6465D', mt: 0.5 }}>
                            Reason: {trip.rejectionReason}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default DriverTrips;
