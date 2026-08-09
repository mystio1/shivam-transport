import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Avatar,
  useTheme,
  Button,
  Popover,
  TextField,
  Chip,
} from '@mui/material';
import {
  Person,
  LocalShipping,
  AccountBalanceWallet,
  TrendingUp,
  TrendingDown,
  ArrowForward,
  CalendarMonth,
  ExpandMore,
  QueryStats,
} from '@mui/icons-material';
import EmptyState from './EmptyState';
import { StatCardsSkeleton, PanelSkeleton } from './Skeletons';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import type { Trip } from '../types';

// ── Date-range helpers ───────────────────────────────────────────────────────
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function toInputValue(d: Date) { return d.toISOString().slice(0, 10); }
function formatShort(d: Date, withYear = false) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', ...(withYear ? { year: '2-digit' } : {}) });
}
function dayKey(d: Date | string) { return new Date(d).toISOString().slice(0, 10); }

// Financial year here runs 31 March -> 30 March the following year (not the more common 1 Apr -
// 31 Mar convention) — matches how this business's own FY is defined.
function financialYearBounds(startYear: number) {
  return { from: startOfDay(new Date(startYear, 2, 31)), to: endOfDay(new Date(startYear + 1, 2, 30)) };
}
function currentFinancialYearStart(d: Date) {
  const marchThirtyFirst = new Date(d.getFullYear(), 2, 31);
  return d.getTime() >= marchThirtyFirst.getTime() ? d.getFullYear() : d.getFullYear() - 1;
}

function tripAmount(trip: Trip) {
  return typeof trip.amount === 'number' ? trip.amount : parseFloat(String(trip.amount)) || 0;
}
function tripPaid(trip: Trip) {
  return typeof trip.paidAmount === 'number' ? trip.paidAmount : (trip.isPaid ? tripAmount(trip) : 0);
}

const DONUT_COLORS = ['#0ECB81', '#F6465D'];

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { customers, trips, getCustomerTrips, user, isLoading } = useAppContext();
  // Only the very first load (no cached data on screen yet) shows skeletons — a background
  // refresh (e.g. triggered by another admin's edit via SSE) shouldn't flicker the whole
  // dashboard back to a loading state when there's already something to show.
  const showSkeleton = isLoading && customers.length === 0 && trips.length === 0;

  const today = useMemo(() => startOfDay(new Date()), []);
  const [rangeFrom, setRangeFrom] = useState(() => addDays(today, -29));
  const [rangeTo, setRangeTo] = useState(() => today);
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const [draftFrom, setDraftFrom] = useState(() => toInputValue(addDays(today, -29)));
  const [draftTo, setDraftTo] = useState(() => toInputValue(today));

  const applyPreset = (days: number) => {
    const to = today;
    const from = addDays(today, -(days - 1));
    setRangeFrom(from);
    setRangeTo(to);
    setDraftFrom(toInputValue(from));
    setDraftTo(toInputValue(to));
    setPickerAnchor(null);
  };

  const applyCustomRange = () => {
    const from = startOfDay(new Date(draftFrom));
    const to = endOfDay(new Date(draftTo));
    if (from > to) return;
    setRangeFrom(from);
    setRangeTo(to);
    setPickerAnchor(null);
  };

  const applyFinancialYear = (startYear: number) => {
    const { from, to } = financialYearBounds(startYear);
    setRangeFrom(from);
    setRangeTo(to);
    setDraftFrom(toInputValue(from));
    setDraftTo(toInputValue(to));
    setPickerAnchor(null);
  };

  const currentFyStart = currentFinancialYearStart(today);
  const financialYearOptions = Array.from({ length: 5 }, (_, i) => currentFyStart - i);

  const rangeDays = Math.max(1, Math.round((endOfDay(rangeTo).getTime() - startOfDay(rangeFrom).getTime()) / 86400000) + 1);
  const prevRangeTo = addDays(rangeFrom, -1);
  const prevRangeFrom = addDays(prevRangeTo, -(rangeDays - 1));

  const tripsInRange = useMemo(
    () => trips.filter(t => { const d = new Date(t.date).getTime(); return d >= startOfDay(rangeFrom).getTime() && d <= endOfDay(rangeTo).getTime(); }),
    [trips, rangeFrom, rangeTo],
  );
  const tripsInPrevRange = useMemo(
    () => trips.filter(t => { const d = new Date(t.date).getTime(); return d >= startOfDay(prevRangeFrom).getTime() && d <= endOfDay(prevRangeTo).getTime(); }),
    [trips, prevRangeFrom, prevRangeTo],
  );

  const totalCustomers = customers.length;
  const totalTrips = tripsInRange.length;
  const totalRevenue = tripsInRange.reduce((s, t) => s + tripAmount(t), 0);
  const avgTripValue = totalTrips > 0 ? totalRevenue / totalTrips : 0;
  const collectedRevenue = tripsInRange.reduce((s, t) => s + tripPaid(t), 0);
  const pendingRevenue = totalRevenue - collectedRevenue;
  const collectedPct = totalRevenue > 0 ? Math.round((collectedRevenue / totalRevenue) * 100) : 0;

  const prevTrips = tripsInPrevRange.length;
  const prevRevenue = tripsInPrevRange.reduce((s, t) => s + tripAmount(t), 0);
  const prevAvg = prevTrips > 0 ? prevRevenue / prevTrips : 0;

  const trend = (current: number, previous: number) => {
    if (previous <= 0) return current > 0 ? { pct: 100, up: true } : { pct: 0, up: true };
    const pct = Math.round(((current - previous) / previous) * 100);
    return { pct: Math.abs(pct), up: pct >= 0 };
  };
  const tripsTrend = trend(totalTrips, prevTrips);
  const revenueTrend = trend(totalRevenue, prevRevenue);
  const avgTrend = trend(avgTripValue, prevAvg);
  const customersTrend = trend(totalCustomers, totalCustomers); // no historical customer count kept — flat

  // Daily series across the selected range, for the sparklines and the big revenue chart.
  const dailySeries = useMemo(() => {
    const byDay = new Map<string, { collected: number; pending: number; trips: number }>();
    for (let i = 0; i < rangeDays; i++) {
      const key = dayKey(addDays(rangeFrom, i));
      byDay.set(key, { collected: 0, pending: 0, trips: 0 });
    }
    for (const t of tripsInRange) {
      const key = dayKey(t.date);
      const bucket = byDay.get(key);
      if (!bucket) continue;
      const paid = tripPaid(t);
      bucket.collected += paid;
      bucket.pending += tripAmount(t) - paid;
      bucket.trips += 1;
    }
    return Array.from(byDay.entries()).map(([key, v]) => ({
      date: formatShort(new Date(key)),
      collected: Math.round(v.collected),
      pending: Math.round(v.pending),
      trips: v.trips,
    }));
  }, [tripsInRange, rangeFrom, rangeDays]);

  const revenueSparkline = dailySeries.map(d => ({ date: d.date, value: d.collected + d.pending }));
  const tripsSparkline = dailySeries.map(d => ({ date: d.date, value: d.trips }));

  // "Today" vs "yesterday" — always the literal calendar day, independent of the range picker,
  // matching how an owner actually checks "how's today going" separately from a reporting window.
  const todaysTrips = trips.filter(t => dayKey(t.date) === dayKey(today));
  const yesterdaysTrips = trips.filter(t => dayKey(t.date) === dayKey(addDays(today, -1)));
  const todaysRevenue = todaysTrips.reduce((s, t) => s + tripAmount(t), 0);
  const yesterdaysRevenue = yesterdaysTrips.reduce((s, t) => s + tripAmount(t), 0);
  const todaysTripsTrend = trend(todaysTrips.length, yesterdaysTrips.length);
  const todaysRevenueTrend = trend(todaysRevenue, yesterdaysRevenue);

  const recentTrips = [...trips]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const topCustomers = useMemo(() => {
    return customers
      .map(customer => {
        const customerTrips = getCustomerTrips(customer.id).filter(t => {
          const d = new Date(t.date).getTime();
          return d >= startOfDay(rangeFrom).getTime() && d <= endOfDay(rangeTo).getTime();
        });
        const total = customerTrips.reduce((s, t) => s + tripAmount(t), 0);
        const paid = customerTrips.reduce((s, t) => s + tripPaid(t), 0);
        return { id: customer.id, name: customer.name, tripCount: customerTrips.length, netPayable: total - paid };
      })
      .filter(c => c.tripCount > 0)
      .sort((a, b) => b.tripCount - a.tripCount)
      .slice(0, 5);
  }, [customers, getCustomerTrips, rangeFrom, rangeTo]);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  const kpiCards = [
    {
      key: 'customers', label: 'Customers', value: totalCustomers.toLocaleString('en-IN'), icon: <Person />,
      color: '#F0B90B', trendVal: customersTrend, sparkline: null, onClick: () => navigate('/customers'),
    },
    {
      key: 'trips', label: 'Total Trips', value: totalTrips.toLocaleString('en-IN'), icon: <LocalShipping />,
      color: '#848E9C', trendVal: tripsTrend, sparkline: tripsSparkline,
      // Carries the Dashboard's own selected date range over to All Trips, so clicking through
      // lands on the same filtered view instead of resetting to "show everything".
      onClick: () => navigate('/trips', { state: { from: toInputValue(rangeFrom), to: toInputValue(rangeTo) } }),
    },
    {
      key: 'revenue', label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: <AccountBalanceWallet />,
      color: '#0ECB81', trendVal: revenueTrend, sparkline: revenueSparkline, onClick: undefined,
    },
    {
      key: 'avg', label: 'Avg. Trip Value', value: `₹${avgTripValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: <TrendingUp />,
      color: '#8B5CF6', trendVal: avgTrend, sparkline: null, onClick: undefined,
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
      {/* Header */}
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
          <Typography sx={{ color: 'text.secondary', fontSize: 'clamp(0.8rem, 1vw, 0.95rem)', fontWeight: 600 }}>
            {greeting}, {user?.name || 'there'} 👋
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontWeight: 800,
              letterSpacing: '0.3px',
              color: theme.palette.primary.main,
              fontSize: 'clamp(28px, 3vw, 40px)',
              lineHeight: 1.15,
            }}
          >
            Business Overview
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 'clamp(14px, 1vw, 16px)' }}>
            Here's what's happening with your business today.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          onClick={e => setPickerAnchor(e.currentTarget)}
          startIcon={<CalendarMonth />}
          endIcon={<ExpandMore />}
          sx={{ borderColor: 'divider', color: 'text.primary', fontWeight: 700, whiteSpace: 'nowrap' }}
        >
          {formatShort(rangeFrom, rangeFrom.getFullYear() !== rangeTo.getFullYear())} - {formatShort(rangeTo, rangeFrom.getFullYear() !== rangeTo.getFullYear())}
        </Button>
        <Popover
          open={Boolean(pickerAnchor)}
          anchorEl={pickerAnchor}
          onClose={() => setPickerAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Box sx={{ p: 2.5, bgcolor: 'background.paper', minWidth: 280 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {[{ label: '7D', days: 7 }, { label: '30D', days: 30 }, { label: '90D', days: 90 }].map(preset => (
                <Chip
                  key={preset.label}
                  label={preset.label}
                  onClick={() => applyPreset(preset.days)}
                  sx={{ bgcolor: 'rgba(240,185,11,0.1)', color: '#F0B90B', fontWeight: 700, cursor: 'pointer' }}
                />
              ))}
            </Box>
            <Typography sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700, mb: 1 }}>
              Financial Year (31 Mar – 30 Mar)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {financialYearOptions.map(startYear => (
                <Chip
                  key={startYear}
                  label={`FY ${startYear}-${String(startYear + 1).slice(-2)}`}
                  onClick={() => applyFinancialYear(startYear)}
                  sx={{ bgcolor: 'rgba(139,92,246,0.12)', color: '#8B5CF6', fontWeight: 700, cursor: 'pointer' }}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                label="From" type="date" size="small" value={draftFrom}
                onChange={e => setDraftFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="To" type="date" size="small" value={draftTo}
                onChange={e => setDraftTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <Button variant="contained" onClick={applyCustomRange} sx={{ color: 'primary.contrastText', fontWeight: 700 }}>
                Apply
              </Button>
            </Box>
          </Box>
        </Popover>
      </Box>

      {/* KPI Cards */}
      {showSkeleton ? <StatCardsSkeleton count={4} /> : (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: { xs: 1.5, sm: 2.5 },
        }}
      >
        {kpiCards.map(card => (
          <Card
            key={card.key}
            onClick={card.onClick}
            sx={{
              height: '100%',
              minHeight: 0,
              borderRadius: { xs: 3, sm: 4 },
              background: theme.palette.background.paper,
              borderTop: `3px solid ${card.color}`,
              color: 'text.primary',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              transition: 'transform 0.25s, box-shadow 0.25s',
              cursor: card.onClick ? 'pointer' : 'default',
              '&:hover': card.onClick ? { transform: 'translateY(-3px)', boxShadow: `0 8px 24px ${card.color}22` } : {},
            }}
          >
            <CardContent sx={{ p: { xs: 1.5, sm: 2.25 }, '&:last-child': { pb: { xs: 1.5, sm: 2.25 } } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, gap: 0.5 }}>
                <Typography sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 'clamp(11px, 1.1vw, 14px)' }}>
                  {card.label}
                </Typography>
                <Avatar sx={{ bgcolor: `${card.color}22`, color: card.color, width: { xs: 28, sm: 40 }, height: { xs: 28, sm: 40 }, flexShrink: 0 }}>
                  {card.icon}
                </Avatar>
              </Box>
              <Typography
                sx={{
                  fontWeight: 800, color: 'text.primary', lineHeight: 1.1,
                  fontSize: 'clamp(18px, 2.6vw, 32px)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block',
                }}
              >
                {card.value}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.75, gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  {card.trendVal.up ? (
                    <TrendingUp sx={{ fontSize: 14, color: '#0ECB81' }} />
                  ) : (
                    <TrendingDown sx={{ fontSize: 14, color: '#F6465D' }} />
                  )}
                  <Typography sx={{ fontSize: 'clamp(10px, 0.9vw, 12px)', fontWeight: 700, color: card.trendVal.up ? '#0ECB81' : '#F6465D' }}>
                    {card.trendVal.pct}%
                  </Typography>
                  <Typography sx={{ fontSize: 'clamp(9px, 0.8vw, 11px)', color: 'text.secondary', display: { xs: 'none', sm: 'inline' } }}>
                    vs last {rangeDays}d
                  </Typography>
                </Box>
                {card.sparkline && (
                  <Box sx={{ width: { xs: 44, sm: 64 }, height: 24 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={card.sparkline} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id={`spark-${card.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={card.color} stopOpacity={0.5} />
                            <stop offset="100%" stopColor={card.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="value" stroke={card.color} strokeWidth={1.5} fill={`url(#spark-${card.key})`} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
      )}

      {/* Revenue chart + Collection donut + Today's summary */}
      {showSkeleton ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr 1fr' }, gap: { xs: 2, sm: 2.5 } }}>
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}><PanelSkeleton height={260} /></Paper>
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}><PanelSkeleton height={170} /></Paper>
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}><PanelSkeleton height={170} /></Paper>
        </Box>
      ) : (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr 1fr' },
          gap: { xs: 2, sm: 2.5 },
          alignItems: 'stretch',
        }}
      >
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 'clamp(14px, 1.2vw, 18px)', mb: 0.5 }}>
            Revenue Overview
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 'clamp(12px, 1vw, 14px)', mb: 1 }}>
            Total revenue ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} · <Box component="span" sx={{ color: '#0ECB81' }}>● Collected</Box> <Box component="span" sx={{ color: '#F6465D' }}>● Pending</Box>
          </Typography>
          <Box sx={{ width: '100%', height: { xs: 200, sm: 260 } }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ECB81" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0ECB81" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F6465D" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#F6465D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                <XAxis dataKey="date" stroke={theme.palette.text.secondary} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={theme.palette.text.secondary} fontSize={11} tickLine={false} axisLine={false} width={44} />
                <RTooltip contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8, color: theme.palette.text.primary }} />
                <Area type="monotone" dataKey="collected" name="Collected" stroke="#0ECB81" strokeWidth={2} fill="url(#collectedGrad)" isAnimationActive={false} />
                <Area type="monotone" dataKey="pending" name="Pending" stroke="#F6465D" strokeWidth={2} fill="url(#pendingGrad)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 'clamp(14px, 1.2vw, 18px)', mb: 1 }}>
            Collection Summary
          </Typography>
          <Box sx={{ position: 'relative', width: '100%', height: { xs: 140, sm: 170 } }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ name: 'Collected', value: collectedRevenue || 0.0001 }, { name: 'Pending', value: pendingRevenue || 0 }]}
                  dataKey="value" innerRadius="68%" outerRadius="100%" startAngle={90} endAngle={-270} isAnimationActive={false}
                >
                  {DONUT_COLORS.map(color => <Cell key={color} fill={color} stroke="none" />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ fontWeight: 800, color: 'text.primary', fontSize: 'clamp(20px, 2vw, 26px)' }}>{collectedPct}%</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 'clamp(10px, 0.9vw, 12px)' }}>Collected</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary', fontSize: 'clamp(11px, 1vw, 13px)' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#0ECB81' }} /> Collected
              </Typography>
              <Typography sx={{ color: 'text.primary', fontWeight: 700, fontSize: 'clamp(11px, 1vw, 13px)' }}>
                ₹{collectedRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary', fontSize: 'clamp(11px, 1vw, 13px)' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#F6465D' }} /> Pending
              </Typography>
              <Typography sx={{ color: 'text.primary', fontWeight: 700, fontSize: 'clamp(11px, 1vw, 13px)' }}>
                ₹{pendingRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.75, mt: 0.5, borderTop: `1px solid ${theme.palette.divider}` }}>
              <Typography sx={{ color: 'text.secondary', fontSize: 'clamp(11px, 1vw, 13px)', fontWeight: 700 }}>Total Revenue</Typography>
              <Typography sx={{ color: '#F0B90B', fontWeight: 800, fontSize: 'clamp(11px, 1vw, 13px)' }}>
                ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 'clamp(14px, 1.2vw, 18px)' }}>
            Today's Summary
          </Typography>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
              <Avatar sx={{ bgcolor: 'rgba(240,185,11,0.12)', color: '#F0B90B', width: 36, height: 36 }}><LocalShipping fontSize="small" /></Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800, color: 'text.primary', fontSize: 'clamp(16px, 1.6vw, 20px)' }}>{todaysTrips.length}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 'clamp(10px, 0.9vw, 12px)' }}>Total Trips</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              {todaysTripsTrend.up ? <TrendingUp sx={{ fontSize: 14, color: '#0ECB81' }} /> : <TrendingDown sx={{ fontSize: 14, color: '#F6465D' }} />}
              <Typography sx={{ fontSize: 'clamp(10px, 0.9vw, 12px)', fontWeight: 700, color: todaysTripsTrend.up ? '#0ECB81' : '#F6465D' }}>{todaysTripsTrend.pct}%</Typography>
            </Box>
          </Box>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
              <Avatar sx={{ bgcolor: 'rgba(14,203,129,0.12)', color: '#0ECB81', width: 36, height: 36 }}><AccountBalanceWallet fontSize="small" /></Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800, color: 'text.primary', fontSize: 'clamp(16px, 1.6vw, 20px)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  ₹{todaysRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 'clamp(10px, 0.9vw, 12px)' }}>Total Revenue</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              {todaysRevenueTrend.up ? <TrendingUp sx={{ fontSize: 14, color: '#0ECB81' }} /> : <TrendingDown sx={{ fontSize: 14, color: '#F6465D' }} />}
              <Typography sx={{ fontSize: 'clamp(10px, 0.9vw, 12px)', fontWeight: 700, color: todaysRevenueTrend.up ? '#0ECB81' : '#F6465D' }}>{todaysRevenueTrend.pct}%</Typography>
            </Box>
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: 'clamp(10px, 0.9vw, 12px)', mt: 'auto' }}>
            Compared to yesterday
          </Typography>
        </Paper>
      </Box>
      )}

      {/* Recent Trips + Top Customers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.3fr 1fr' }, gap: { xs: 2, sm: 2.5 } }}>
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, minWidth: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 'clamp(14px, 1.2vw, 18px)' }}>Recent Trips</Typography>
            {trips.length > 0 && (
              <Button
                size="small"
                onClick={() => navigate('/trips', { state: { from: toInputValue(rangeFrom), to: toInputValue(rangeTo) } })}
                sx={{ color: '#F0B90B', fontWeight: 700 }}
              >
                View All Trips
              </Button>
            )}
          </Box>
          {recentTrips.length === 0 ? (
            <EmptyState
              size="compact"
              icon={<LocalShipping />}
              title="No trips recorded yet"
              description="Approved trips will show up here as they come in."
            />
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                <Box component="thead">
                  <Box component="tr">
                    {['Customer', 'Route', 'Date', 'Amount', 'Status'].map((h, i) => (
                      <Box component="th" key={h} sx={{ textAlign: (h === 'Amount' || h === 'Status') ? 'right' : 'left', color: 'text.secondary', fontSize: 'clamp(10px, 0.85vw, 12px)', fontWeight: 700, textTransform: 'uppercase', pb: 1, pl: i === 0 ? 0 : 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        {h}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {recentTrips.map(trip => {
                    const customer = customers.find(c => c.id === trip.customerId);
                    const clickable = Boolean(trip.customerId);
                    return (
                      <Box
                        component="tr"
                        key={trip.id}
                        onClick={() => clickable && navigate(`/customer/${trip.customerId}`)}
                        sx={{ cursor: clickable ? 'pointer' : 'default', '&:hover td': clickable ? { bgcolor: 'action.hover' } : {} }}
                      >
                        <Box component="td" sx={{ py: 1.25, pr: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 26, height: 26, fontSize: 12, bgcolor: 'rgba(240,185,11,0.15)', color: '#F0B90B' }}>
                              {(customer?.name || trip.customerName || '?').slice(0, 2).toUpperCase()}
                            </Avatar>
                            <Typography sx={{ color: 'text.primary', fontWeight: 600, fontSize: 'clamp(11px, 1vw, 13px)', whiteSpace: 'nowrap' }}>
                              {customer?.name || trip.customerName || 'Unknown'}
                            </Typography>
                          </Box>
                        </Box>
                        <Box component="td" sx={{ py: 1.25, pr: 2, borderBottom: `1px solid ${theme.palette.divider}`, color: 'text.secondary', fontSize: 'clamp(11px, 1vw, 13px)', whiteSpace: 'nowrap' }}>
                          {trip.pickupLocation} → {trip.dropLocation}
                        </Box>
                        <Box component="td" sx={{ py: 1.25, pr: 2, borderBottom: `1px solid ${theme.palette.divider}`, color: 'text.secondary', fontSize: 'clamp(11px, 1vw, 13px)', whiteSpace: 'nowrap' }}>
                          {new Date(trip.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </Box>
                        <Box component="td" sx={{ py: 1.25, pl: 2, borderBottom: `1px solid ${theme.palette.divider}`, textAlign: 'right', fontWeight: 700, color: 'text.primary', fontSize: 'clamp(11px, 1vw, 13px)', whiteSpace: 'nowrap' }}>
                          ₹{tripAmount(trip).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Box>
                        <Box component="td" sx={{ py: 1.25, pl: 2, borderBottom: `1px solid ${theme.palette.divider}`, textAlign: 'right' }}>
                          <Chip
                            label={trip.isPaid ? 'Paid' : 'Pending'}
                            size="small"
                            sx={{
                              fontWeight: 700, fontSize: 'clamp(9px, 0.8vw, 11px)',
                              bgcolor: trip.isPaid ? 'rgba(14,203,129,0.12)' : 'rgba(240,185,11,0.12)',
                              color: trip.isPaid ? '#0ECB81' : '#F0B90B',
                            }}
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          )}
        </Paper>

        <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, minWidth: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 'clamp(14px, 1.2vw, 18px)' }}>Top Customers</Typography>
            {customers.length > 0 && (
              <Button size="small" onClick={() => navigate('/customers')} sx={{ color: '#F0B90B', fontWeight: 700 }}>View All</Button>
            )}
          </Box>
          {topCustomers.length === 0 ? (
            <EmptyState
              size="compact"
              icon={<QueryStats />}
              title="Nothing in this range yet"
              description="Try a wider date range to see your top customers."
            />
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {topCustomers.map((customer, index) => (
                <Box
                  key={customer.id}
                  onClick={() => navigate(`/customer/${customer.id}`)}
                  sx={{
                    p: 1.25, borderRadius: 2, backgroundColor: 'action.hover',
                    transition: 'background-color 0.2s', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    '&:hover': { backgroundColor: 'divider' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    <Avatar sx={{ bgcolor: 'rgba(240, 185, 11, 0.1)', color: '#F0B90B', width: 32, height: 32, mr: 1.5, fontSize: 13, flexShrink: 0 }}>
                      {index + 1}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: 'clamp(12px, 1vw, 14px)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {customer.name}
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: 'clamp(10px, 0.85vw, 12px)' }}>
                        {customer.tripCount} trip{customer.tripCount === 1 ? '' : 's'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ color: 'text.secondary', fontSize: 'clamp(9px, 0.8vw, 11px)', lineHeight: 1.2 }}>Net Payable</Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: 'clamp(11px, 1vw, 13px)', color: customer.netPayable > 0 ? '#F6465D' : '#0ECB81' }}>
                        ₹{customer.netPayable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </Typography>
                    </Box>
                    <ArrowForward sx={{ fontSize: 16, color: 'text.secondary' }} />
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard;
