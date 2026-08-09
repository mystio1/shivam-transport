import { Box, Typography, Button, useTheme } from '@mui/material';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: ReactNode };
  /** Vertical padding — smaller (`compact`) for empty states nested inside an already-padded card. */
  size?: 'default' | 'compact';
}

// Standard "nothing here yet" treatment used across every list/table in the app (customers,
// trips, bills, drivers, advance payments) — an icon in a soft tinted circle, a clear heading,
// a short explanation, and — where there's an obvious next step — a button to take it, instead
// of a bare line of gray text.
const EmptyState = ({ icon, title, description, action, size = 'default' }: EmptyStateProps) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: size === 'compact' ? 4 : 7,
        px: 2,
        animation: 'fade-scale-in 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <Box
        sx={{
          width: size === 'compact' ? 56 : 72,
          height: size === 'compact' ? 56 : 72,
          borderRadius: '50%',
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(240,185,11,0.1)' : 'rgba(240,185,11,0.12)',
          color: '#F0B90B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
          fontSize: size === 'compact' ? 26 : 32,
          '& svg': { fontSize: size === 'compact' ? 26 : 32 },
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: size === 'compact' ? 15 : 17, mb: description ? 0.5 : 0 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360, mx: 'auto' }}>
          {description}
        </Typography>
      )}
      {action && (
        <Button
          variant="outlined"
          onClick={action.onClick}
          startIcon={action.icon}
          sx={{ mt: 2.5, borderColor: 'divider', color: 'text.primary', fontWeight: 700 }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
