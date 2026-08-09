import { useState } from 'react';
import {
  Badge, Box, IconButton, Popover, Typography, Tooltip, Button, Divider, useTheme,
} from '@mui/material';
import {
  NotificationsNone, ErrorOutline, WarningAmber, Snooze, Close, DirectionsCar,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const NotificationCenter = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { activeDocumentReminders, snoozeDocumentReminder, dismissDocumentReminder } = useAppContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Document reminders">
        <IconButton
          onClick={e => setAnchorEl(e.currentTarget)}
          aria-label="notifications"
          sx={{
            color: 'text.secondary',
            transition: 'all 0.2s ease-in-out',
            '&:hover': { color: '#F0B90B', backgroundColor: 'divider' },
          }}
        >
          <Badge
            badgeContent={activeDocumentReminders.length}
            color="error"
            max={99}
            sx={{ '& .MuiBadge-badge': { fontWeight: 700 } }}
          >
            <NotificationsNone />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxWidth: '92vw',
              maxHeight: '70vh',
              backgroundColor: 'background.paper',
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
            },
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>Document Reminders</Typography>
          <Button
            size="small"
            onClick={() => { setAnchorEl(null); navigate('/document-reminders'); }}
            sx={{ color: '#F0B90B', fontWeight: 700 }}
          >
            View all
          </Button>
        </Box>
        <Divider sx={{ borderColor: 'divider' }} />

        {activeDocumentReminders.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              You're all caught up — no documents due soon.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 'calc(70vh - 56px)', overflowY: 'auto' }}>
            {activeDocumentReminders.map(reminder => {
              const isExpired = reminder.status.state === 'expired';
              const color = isExpired ? '#F6465D' : '#F0B90B';
              const bg = isExpired ? 'rgba(246,70,93,0.1)' : 'rgba(240,185,11,0.1)';
              const label = isExpired
                ? `Expired ${Math.abs(reminder.status.daysUntilExpiry)}d ago`
                : reminder.status.daysUntilExpiry === 0
                  ? 'Expires today'
                  : `Due in ${reminder.status.daysUntilExpiry}d`;

              return (
                <Box
                  key={reminder.document.id}
                  sx={{
                    p: 1.5, px: 2,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    '&:last-of-type': { borderBottom: 'none' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    {isExpired ? <ErrorOutline sx={{ color, fontSize: 20, mt: 0.25 }} /> : <WarningAmber sx={{ color, fontSize: 20, mt: 0.25 }} />}
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 14 }}>
                        {reminder.document.label}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                        <DirectionsCar sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12.5 }}>
                          {reminder.vehicleNumber}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{ display: 'inline-block', mt: 0.75, px: 1, py: 0.25, borderRadius: 1, bgcolor: bg, color, fontWeight: 700, fontSize: 11.5 }}
                      >
                        {label}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, ml: 3.5 }}>
                    <Button
                      size="small"
                      startIcon={<Snooze sx={{ fontSize: 16 }} />}
                      onClick={() => snoozeDocumentReminder(reminder.document.id, reminder.document.expiryDate)}
                      sx={{ color: 'text.secondary', fontSize: 12, minWidth: 0, textTransform: 'none' }}
                    >
                      Remind me later
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Close sx={{ fontSize: 16 }} />}
                      onClick={() => dismissDocumentReminder(reminder.document.id, reminder.document.expiryDate)}
                      sx={{ color: 'text.secondary', fontSize: 12, minWidth: 0, textTransform: 'none' }}
                    >
                      Don't show again
                    </Button>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Popover>
    </>
  );
};

export default NotificationCenter;
