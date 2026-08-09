import { Box, Skeleton, Card, CardContent } from '@mui/material';

// Shown only during the FIRST load of a list (no cached data yet) — never during a background
// refresh (SSE 'data-changed' events refetch everything periodically; re-skeletoning a list that
// already has data on screen would just be an annoying flicker for no benefit). Callers gate this
// with `isLoading && list.length === 0`, not `isLoading` alone.

// A handful of rows shaped like the avatar + two-line-of-text list items used across
// Customers/Drivers/Trips/Bills, so the loading state previews the eventual layout instead of a
// generic spinner.
export const ListRowsSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    {Array.from({ length: rows }).map((_, i) => (
      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2 }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant="text" width={`${45 + (i % 3) * 10}%`} height={20} />
          <Skeleton variant="text" width={`${25 + (i % 4) * 8}%`} height={16} />
        </Box>
        <Skeleton variant="rounded" width={64} height={24} />
      </Box>
    ))}
  </Box>
);

// Matches the Dashboard KPI cards / DriverList stat cards grid shape.
export const StatCardsSkeleton = ({ count = 4 }: { count?: number }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: `repeat(${count}, 1fr)` }, gap: { xs: 1.5, sm: 2.5 } }}>
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} sx={{ borderRadius: { xs: 3, sm: 4 } }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2.25 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Skeleton variant="text" width="50%" height={16} />
            <Skeleton variant="circular" width={32} height={32} />
          </Box>
          <Skeleton variant="text" width="70%" height={32} />
          <Skeleton variant="text" width="40%" height={16} />
        </CardContent>
      </Card>
    ))}
  </Box>
);

// A simple card-shaped block for the chart/summary panels (Dashboard's revenue chart, etc).
export const PanelSkeleton = ({ height = 220 }: { height?: number }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    <Skeleton variant="text" width="35%" height={22} />
    <Skeleton variant="text" width="55%" height={16} sx={{ mb: 1 }} />
    <Skeleton variant="rounded" width="100%" height={height} />
  </Box>
);

// Generic "detail page" shape (a profile-ish header block plus a couple of content sections) —
// used for pages like CustomerDetails/DriverDetails while their record is still loading, instead
// of a bare "Loading..." line.
export const DetailPageSkeleton = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <Card sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Skeleton variant="circular" width={56} height={56} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="35%" height={28} />
          <Skeleton variant="text" width="25%" height={18} />
        </Box>
      </Box>
    </Card>
    <ListRowsSkeleton rows={3} />
  </Box>
);
