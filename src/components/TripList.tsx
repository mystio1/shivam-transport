import React from 'react';
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
} from '@mui/material';
import {
  CalendarMonth,
  LocationOn,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import type { Trip } from '../types';
import { useAppContext } from '../context/AppContext';

interface TripListProps {
  trips: Trip[];
  customerName: string;
  onUpdatePaymentStatus?: (tripId: string, isPaid: boolean) => void;
}

const TripList = ({ trips, customerName, onUpdatePaymentStatus }: TripListProps) => {
  useAppContext();

  const sortedTrips = [...trips].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleTogglePaymentStatus = (tripId: string, currentStatus: boolean) => {
    if (onUpdatePaymentStatus) {
      onUpdatePaymentStatus(tripId, !currentStatus);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
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
          <Typography variant="body2" sx={{ color: '#848E9C' }}>
            Add your first trip using the form above.
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
                  px: 3,
                  borderRadius: 2, 
                  bgcolor: index % 2 === 0 ? '#1E2329' : '#161A1E',
                  border: '1px solid #2B3139',
                  '&:hover': { bgcolor: '#2B3139' }, 
                  transition: 'background-color 0.2s ease-in-out' 
                }}
                secondaryAction={
                  onUpdatePaymentStatus && (
                    <Tooltip title={trip.isPaid ? 'Mark as unpaid' : 'Mark as paid'}>
                      <IconButton
                        edge="end"
                        onClick={() => handleTogglePaymentStatus(trip.id, trip.isPaid)}
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
                  )
                }
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: trip.isPaid ? 'rgba(14, 203, 129, 0.1)' : 'rgba(246, 70, 93, 0.1)', color: trip.isPaid ? '#0ECB81' : '#F6465D' }}>
                    {trip.isPaid ? '₹' : '!'}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 }, mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CalendarMonth sx={{ mr: 1, color: '#848E9C', fontSize: 20 }} />
                        <Typography variant="body1" sx={{ fontWeight: 600, letterSpacing: '0.2px', color: '#EAECEF' }}>
                          {new Date(trip.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 800,
                            mr: 2,
                            letterSpacing: '0.2px',
                            color: '#EAECEF'
                          }}
                        >
                          ₹{typeof trip.amount === 'number' ? trip.amount.toFixed(2) : '0.00'}
                        </Typography>
                        <Chip 
                          label={trip.isPaid ? 'Paid' : 'Unpaid'}
                          sx={{ 
                            fontWeight: 600, 
                            fontSize: '0.9rem',
                            backgroundColor: trip.isPaid ? 'rgba(14, 203, 129, 0.1)' : 'rgba(246, 70, 93, 0.1)',
                            color: trip.isPaid ? '#0ECB81' : '#F6465D',
                            border: `1px solid ${trip.isPaid ? 'rgba(14, 203, 129, 0.2)' : 'rgba(246, 70, 93, 0.2)'}`,
                            borderRadius: '16px',
                            '& .MuiChip-label': { px: 1.5, py: 0.5 }
                          }}
                        />
                      </Box>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LocationOn sx={{ mr: 1, color: '#848E9C', fontSize: 20 }} />
                      <Box>
                        <Typography variant="body2" sx={{ color: '#848E9C', fontWeight: 500, letterSpacing: '0.1px' }}>
                          {trip.pickupLocation} → {trip.dropLocation}
                        </Typography>
                        {typeof trip.advanceAmount === 'number' && trip.advanceAmount > 0 && (
                          <Typography variant="body2" sx={{ color: '#848E9C', fontWeight: 500, letterSpacing: '0.1px', mt: 0.5 }}>
                            Advance: ₹{trip.advanceAmount.toFixed(2)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default TripList;
