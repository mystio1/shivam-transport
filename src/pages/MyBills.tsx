import { useRef, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Avatar, List, Paper,
  TextField, InputAdornment, IconButton, Chip, Tooltip, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  GridLegacy as Grid, useMediaQuery, useTheme,
} from '@mui/material';
import { ReceiptLong, Search, Clear, ArrowForward, AccountBalanceWallet, Delete, Close, Download } from '@mui/icons-material';
import { Capacitor } from '@capacitor/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import type { SavedBill } from '../types';

// Same figures the live bill preview computes, just read straight off the saved snapshot
// instead of recalculated from (possibly since-changed) live trip data.
const getSavedBillTotals = (bill: SavedBill) => ({
  subTotal: bill.subTotal,
  received: bill.received,
  discount: bill.discount,
  gstEnabled: bill.isGstBill,
  gstPct: bill.gstPercent,
  gstAmount: bill.gstAmount,
  grandTotal: bill.grandTotal,
  advanceApplied: bill.advanceApplied,
  netPayable: bill.netPayable,
  showBreakdown: bill.discount > 0 || bill.isGstBill || bill.received > 0 || bill.advanceApplied > 0,
});

const MyBills = () => {
  const { bills, group, branding, deleteBill, permanentlyDeleteBill } = useAppContext();
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const previewRef = useRef<HTMLDivElement>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState<SavedBill | null>(null);
  const [deleteBillEntry, setDeleteBillEntry] = useState<SavedBill | null>(null);
  const [deletingBill, setDeletingBill] = useState(false);
  const [permanentDeleteBillEntry, setPermanentDeleteBillEntry] = useState<SavedBill | null>(null);
  const [permanentlyDeletingBill, setPermanentlyDeletingBill] = useState(false);

  // Search matches customer, bill number, net payable, or date.
  const matchesFilters = (bill: SavedBill) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const dateStr = new Date(bill.billDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' }).toLowerCase();
    return (
      bill.customerName.toLowerCase().includes(term) ||
      bill.billNo.toLowerCase().includes(term) ||
      String(bill.netPayable).includes(term) ||
      dateStr.includes(term)
    );
  };
  const isFiltered = Boolean(searchTerm);

  const activeBills = bills.filter(b => !b.deleted).filter(matchesFilters);
  const deletedBills = bills.filter(b => b.deleted).filter(matchesFilters);

  const totalNetPayable = activeBills.reduce((s, b) => s + Number(b.netPayable || 0), 0);
  const gstBillCount = activeBills.filter(b => b.isGstBill).length;

  const handleConfirmDeleteBill = async () => {
    if (!deleteBillEntry) return;
    setDeletingBill(true);
    try {
      await deleteBill(deleteBillEntry.id);
      setDeleteBillEntry(null);
    } finally {
      setDeletingBill(false);
    }
  };

  const handleConfirmPermanentDeleteBill = async () => {
    if (!permanentDeleteBillEntry) return;
    setPermanentlyDeletingBill(true);
    try {
      await permanentlyDeleteBill(permanentDeleteBillEntry.id);
      setPermanentDeleteBillEntry(null);
    } finally {
      setPermanentlyDeletingBill(false);
    }
  };

  // Rasterizes the on-screen bill preview and downloads it as a real PDF file — same technique
  // used for the WhatsApp share on the live Customer Details bill preview.
  const handleDownloadPdf = async () => {
    if (!selectedBill) return;
    const node = previewRef.current;
    if (!node) return;
    setDownloadingPdf(true);
    try {
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const blob = pdf.output('blob');
      const fileName = `Invoice-${selectedBill.customerName}-${selectedBill.billNo || selectedBill.id}.pdf`;
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 30000);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: '#EAECEF' }}>
          My Bills
        </Typography>
        <Typography variant="body2" sx={{ color: '#848E9C', mt: 0.5 }}>
          Every bill saved from a "View & Print Bill" preview for {group?.name || 'your business'}.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: { xs: 1.5, sm: 3 }, mb: 4 }}>
        <Card sx={{ height: { xs: '116px', sm: '140px' }, borderRadius: 2, background: '#161A1E', borderTop: '3px solid #F0B90B', color: '#EAECEF', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#848E9C', fontSize: { xs: '0.75rem', sm: '1rem' } }}>Total Bills</Typography>
              <Avatar sx={{ bgcolor: 'rgba(240, 185, 11, 0.1)', color: '#F0B90B', width: { xs: 28, sm: 36 }, height: { xs: 28, sm: 36 } }}>
                <ReceiptLong sx={{ fontSize: { xs: 15, sm: 18 } }} />
              </Avatar>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', sm: '2.2rem' }, color: '#EAECEF', lineHeight: 1 }}>
              {bills.filter(b => !b.deleted).length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ height: { xs: '116px', sm: '140px' }, borderRadius: 2, background: '#161A1E', borderTop: '3px solid #2B3139', color: '#EAECEF', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#848E9C', fontSize: { xs: '0.75rem', sm: '1rem' } }}>GST Bills</Typography>
              <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', color: '#848E9C', width: { xs: 28, sm: 36 }, height: { xs: 28, sm: 36 } }}>
                <ReceiptLong sx={{ fontSize: { xs: 15, sm: 18 } }} />
              </Avatar>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', sm: '2.2rem' }, color: '#EAECEF', lineHeight: 1 }}>
              {gstBillCount}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ height: { xs: '116px', sm: '140px' }, borderRadius: 2, background: '#161A1E', borderTop: '3px solid #0ECB81', color: '#EAECEF', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gridColumn: { xs: 'span 2', md: 'span 1' } }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#848E9C', fontSize: { xs: '0.75rem', sm: '1rem' } }}>Total Net Payable</Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '2rem' }, color: '#EAECEF', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              ₹{totalNetPayable.toFixed(2)}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <TextField
        placeholder="Search by customer, bill number, amount, or date..."
        variant="outlined"
        size="small"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        sx={{ width: { xs: '100%', sm: '420px' }, mb: 3 }}
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
          All Bills
          <Typography component="span" variant="body2" sx={{ ml: 1, color: '#848E9C' }}>
            ({activeBills.length} {activeBills.length === 1 ? 'bill' : 'bills'})
          </Typography>
        </Typography>

        {activeBills.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <ReceiptLong sx={{ fontSize: 48, color: '#848E9C', mb: 1 }} />
            <Typography variant="h6" sx={{ color: '#848E9C', mb: 1 }}>
              {isFiltered ? 'No bills match these filters' : 'No bills saved yet'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#848E9C' }}>
              {isFiltered ? 'Try a different search or widen the filters' : 'Open a customer, click "View & Print Bill", then "Save to My Bills".'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {activeBills.map((bill, index) => (
              <Box
                key={bill.id}
                onClick={() => setSelectedBill(bill)}
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
                  <ReceiptLong />
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#EAECEF' }}>
                    {bill.customerName}
                    <Box component="span" sx={{ ml: 1, color: '#F0B90B', fontWeight: 700, fontSize: '0.8rem' }}>
                      Bill #{bill.billNo || '—'}
                    </Box>
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ color: '#848E9C' }}>
                      {new Date(bill.billDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' })}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#848E9C' }}>
                      {bill.trips.length} trip{bill.trips.length === 1 ? '' : 's'}
                    </Typography>
                    {bill.isGstBill && (
                      <Chip label={`GST ${bill.gstPercent}%`} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'rgba(11,78,166,0.15)', color: '#58A6FF' }} />
                    )}
                  </Box>
                </Box>
                <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, mr: { xs: 0, sm: 2 } }}>
                  <Typography variant="caption" sx={{ color: '#5C6470', display: 'block' }}>Net Payable</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0ECB81' }}>
                    ₹{bill.netPayable.toFixed(2)}
                  </Typography>
                </Box>
                <Tooltip title="Delete this bill">
                  <IconButton
                    aria-label="Delete this bill"
                    onClick={e => { e.stopPropagation(); setDeleteBillEntry(bill); }}
                    sx={{ color: '#848E9C', '&:hover': { color: '#F6465D' } }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
                <IconButton edge="end" aria-label="details" sx={{ color: '#848E9C' }}>
                  <ArrowForward />
                </IconButton>
              </Box>
            ))}
          </List>
        )}

        {deletedBills.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#848E9C', mb: 1 }}>
              Deleted Bills (kept for record only)
            </Typography>
            <List sx={{ p: 0 }}>
              {deletedBills.map(bill => (
                <Box
                  key={bill.id}
                  sx={{
                    mb: 1.5, p: 2, borderRadius: 2,
                    border: '1px dashed #2B3139',
                    opacity: 0.65,
                    display: 'flex',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 1, sm: 0 },
                  }}
                >
                  <Avatar sx={{ bgcolor: 'rgba(132,142,156,0.1)', color: '#848E9C', mr: 2 }}>
                    <ReceiptLong />
                  </Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, textDecoration: 'line-through' }}>
                      {bill.customerName}
                      <Box component="span" sx={{ ml: 1, fontWeight: 700, fontSize: '0.8rem' }}>
                        Bill #{bill.billNo || '—'}
                      </Box>
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#848E9C' }}>
                      {new Date(bill.billDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' })}
                      {bill.deletedAt ? ` · Deleted ${new Date(bill.deletedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' })}` : ''}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, mr: { xs: 0, sm: 2 } }}>
                    <Typography variant="caption" sx={{ color: '#5C6470', display: 'block' }}>Net Payable</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, textDecoration: 'line-through', color: '#848E9C' }}>
                      ₹{bill.netPayable.toFixed(2)}
                    </Typography>
                  </Box>
                  <Tooltip title="Permanently delete this bill">
                    <IconButton
                      aria-label="Permanently delete this bill"
                      onClick={() => setPermanentDeleteBillEntry(bill)}
                      sx={{ color: '#848E9C', '&:hover': { color: '#F6465D' } }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </List>
          </Box>
        )}
      </Paper>

      {/* Bill preview — rendered in the same branded style as the live Customer Details bill,
          from the saved snapshot (trip lines + totals as they were when saved), with a one-click
          PDF download using the same html2canvas + jsPDF technique as the WhatsApp share there. */}
      <Dialog
        open={Boolean(selectedBill)}
        onClose={() => setSelectedBill(null)}
        maxWidth="md"
        fullWidth
        fullScreen={Capacitor.isNativePlatform() || isSmallScreen}
        PaperProps={{ sx: { bgcolor: '#ffffff', color: '#1a1a1a', p: { xs: 0, sm: 3 }, backgroundImage: 'none' } }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f5f5f5', color: '#333', borderBottom: '1px solid #ddd' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a1a1a' }}>Invoice Bill Preview</Typography>
          <IconButton aria-label="close" onClick={() => setSelectedBill(null)} sx={{ color: '#666' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1, sm: 3 }, bgcolor: '#fafafa' }}>
          {selectedBill && (() => {
            const totals = getSavedBillTotals(selectedBill);
            const bankName = selectedBill.bankName || '';
            const branch = selectedBill.bankBranch || '';
            const accountNumber = selectedBill.accountNumber || '';
            const ifscCode = selectedBill.ifscCode || '';
            return (
              <Box
                ref={previewRef}
                sx={{
                  maxWidth: '194mm',
                  margin: '0 auto',
                  p: { xs: 2, sm: 4 },
                  bgcolor: '#ffffff',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  borderRadius: '4px',
                  border: '1px solid #E2E8F0',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: '200mm',
                  ...(branding?.logoDataUrl ? {
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      bottom: '25mm',
                      left: '10mm',
                      width: '85mm',
                      height: '52mm',
                      backgroundImage: `url("${branding.logoDataUrl}")`,
                      backgroundPosition: 'center',
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      opacity: 0.05,
                      pointerEvents: 'none',
                      zIndex: 0,
                    },
                  } : {}),
                }}
              >
                <Box sx={{ height: '4px', bgcolor: branding?.accentColor || '#F0B90B', mb: 2, zIndex: 1, position: 'relative' }} />

                <Box sx={{ borderBottom: '3px double #CBD5E1', pb: 2, mb: 2, textAlign: 'center', zIndex: 1, position: 'relative' }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: branding?.primaryColor || '#0B2B5E', letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: { xs: '1.4rem', sm: '2.1rem' } }}>
                    {branding?.companyName || 'Shivam Transport'}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#8a8a8a', letterSpacing: '2px', textTransform: 'uppercase', mt: 0.5, fontSize: { xs: '0.7rem', sm: '0.9rem' } }}>
                    {branding?.tagline || 'Transport & Logistics Solutions'}
                  </Typography>
                  {(branding?.proprietorName || branding?.phone1 || branding?.phone2) && (
                    <Typography variant="body2" sx={{ mt: 1, color: '#555', fontSize: '9pt', fontWeight: 500 }}>
                      {[
                        branding?.proprietorName ? `Prop.: ${branding.proprietorName}` : '',
                        [branding?.phone1, branding?.phone2].filter(Boolean).join(' / ') ? `Mob.: ${[branding?.phone1, branding?.phone2].filter(Boolean).join(' / ')}` : '',
                      ].filter(Boolean).join('  |  ')}
                    </Typography>
                  )}
                </Box>

                <Grid container spacing={2} sx={{ mb: 3, fontSize: '9.5pt', color: '#333', zIndex: 1, position: 'relative' }}>
                  <Grid item xs={12} sm={6}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '2px 8px 2px 0', color: '#666', fontWeight: 600, width: '70px' }}>M/s.:</td>
                          <td style={{ padding: '2px 0', fontWeight: 700, color: branding?.primaryColor || '#0B2B5E' }}>{selectedBill.customerName}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '2px 8px 2px 0', color: '#666', fontWeight: 600 }}>Address:</td>
                          <td style={{ padding: '2px 0' }}>{selectedBill.customerAddress || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '2px 8px 2px 0', color: '#666', fontWeight: 600 }}>Phone:</td>
                          <td style={{ padding: '2px 0' }}>{selectedBill.customerPhone || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '2px 8px 2px 0', color: '#666', fontWeight: 600 }}>GST No.:</td>
                          <td style={{ padding: '2px 0' }}>{selectedBill.customerGst || '—'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '2px 8px 2px 0', color: '#666', fontWeight: 600, width: '70px' }}>Bill No.:</td>
                          <td style={{ padding: '2px 0', fontWeight: 700, color: branding?.primaryColor || '#0B2B5E' }}>{selectedBill.billNo || '01'}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '2px 8px 2px 0', color: '#666', fontWeight: 600 }}>Date:</td>
                          <td style={{ padding: '2px 0' }}>
                            {new Date(selectedBill.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </Grid>
                </Grid>

                <Box sx={{ width: '100%', overflowX: 'auto', mb: 3, zIndex: 1, position: 'relative' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', color: '#1a1a1a', minWidth: '500px' }}>
                    <thead>
                      <tr style={{ backgroundColor: branding?.primaryColor || '#0B2B5E', color: '#ffffff' }}>
                        <th style={{ padding: '6px 8px', border: '1px solid #E2E8F0', textAlign: 'center', width: '15%' }}>Date</th>
                        <th style={{ padding: '6px 8px', border: '1px solid #E2E8F0', textAlign: 'left', width: '25%' }}>Pickup</th>
                        <th style={{ padding: '6px 8px', border: '1px solid #E2E8F0', textAlign: 'left', width: '25%' }}>Drop</th>
                        <th style={{ padding: '6px 8px', border: '1px solid #E2E8F0', textAlign: 'right', width: '17%' }}>Paid</th>
                        <th style={{ padding: '6px 8px', border: '1px solid #E2E8F0', textAlign: 'right', width: '18%' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBill.trips.map((trip, idx) => (
                        <tr key={trip.tripId || idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                          <td style={{ padding: '5px 8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                            {new Date(trip.date).toLocaleDateString('en-IN')}
                          </td>
                          <td style={{ padding: '5px 8px', border: '1px solid #E2E8F0' }}>{trip.pickupLocation}</td>
                          <td style={{ padding: '5px 8px', border: '1px solid #E2E8F0' }}>{trip.dropLocation}</td>
                          <td style={{ padding: '5px 8px', border: '1px solid #E2E8F0', textAlign: 'right' }}>₹{(trip.paidAmount || 0).toFixed(2)}</td>
                          <td style={{ padding: '5px 8px', border: '1px solid #E2E8F0', textAlign: 'right' }}>₹{trip.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={3} style={{ padding: '6px 8px', border: '1px solid #E2E8F0', fontWeight: 700, textAlign: 'right', color: branding?.primaryColor || '#0B2B5E' }}>Sub Total</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #E2E8F0', fontWeight: 700, textAlign: 'right', color: branding?.primaryColor || '#0B2B5E' }}>
                          ₹{totals.received.toFixed(2)}
                        </td>
                        <td style={{ padding: '6px 8px', border: '1px solid #E2E8F0', fontWeight: 700, textAlign: 'right', color: branding?.primaryColor || '#0B2B5E' }}>
                          ₹{totals.subTotal.toFixed(2)}
                        </td>
                      </tr>
                      {totals.discount > 0 && (
                        <tr>
                          <td colSpan={4} style={{ padding: '6px 8px', border: '1px solid #E2E8F0', fontWeight: 700, textAlign: 'right', color: '#A61B1B' }}>Discount</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #E2E8F0', fontWeight: 800, textAlign: 'right', color: '#A61B1B' }}>
                            - ₹{totals.discount.toFixed(2)}
                          </td>
                        </tr>
                      )}
                      {totals.gstEnabled && (
                        <tr>
                          <td colSpan={4} style={{ padding: '6px 8px', border: '1px solid #E2E8F0', fontWeight: 700, textAlign: 'right', color: '#0B4EA6' }}>GST ({totals.gstPct}%)</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #E2E8F0', fontWeight: 800, textAlign: 'right', color: '#0B4EA6' }}>
                            + ₹{totals.gstAmount.toFixed(2)}
                          </td>
                        </tr>
                      )}
                      {(totals.discount > 0 || totals.gstEnabled) && (
                        <tr style={{ backgroundColor: '#F1F1F1' }}>
                          <td colSpan={4} style={{ padding: '6px 8px', border: '1px solid #E2E8F0', fontWeight: 800, textAlign: 'right', color: '#1a1a1a' }}>Grand Total</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #E2E8F0', fontWeight: 800, textAlign: 'right', color: '#1a1a1a' }}>
                            ₹{totals.grandTotal.toFixed(2)}
                          </td>
                        </tr>
                      )}
                      {totals.received > 0 && (
                        <tr>
                          <td colSpan={4} style={{ padding: '6px 8px', border: '1px solid #E2E8F0', fontWeight: 700, textAlign: 'right', color: '#7A5A00' }}>Less: Amount Received</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #E2E8F0', fontWeight: 800, textAlign: 'right', color: '#7A5A00' }}>
                            - ₹{totals.received.toFixed(2)}
                          </td>
                        </tr>
                      )}
                      {totals.advanceApplied > 0 && (
                        <tr>
                          <td colSpan={4} style={{ padding: '6px 8px', border: '1px solid #E2E8F0', fontWeight: 700, textAlign: 'right', color: '#7A5A00' }}>Less: Advance Balance Applied</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #E2E8F0', fontWeight: 800, textAlign: 'right', color: '#7A5A00' }}>
                            - ₹{totals.advanceApplied.toFixed(2)}
                          </td>
                        </tr>
                      )}
                      {totals.showBreakdown && (
                        <tr style={{ backgroundColor: '#EBF5EC' }}>
                          <td colSpan={4} style={{ padding: '8px 8px', border: '1px solid #E2E8F0', fontWeight: 900, textAlign: 'right', color: '#0B5E1F', fontSize: '10pt' }}>NET PAYABLE</td>
                          <td style={{ padding: '8px 8px', border: '1px solid #E2E8F0', fontWeight: 900, textAlign: 'right', color: '#0B5E1F', fontSize: '10.5pt' }}>
                            ₹{totals.netPayable.toFixed(2)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Box>

                <Box sx={{ mb: 3, p: 1, bgcolor: '#fcfcfc', border: '1px dashed #ddd', borderRadius: '4px', fontSize: '9pt', color: '#555', zIndex: 1, position: 'relative' }}>
                  <strong>Amount in Words:</strong> &nbsp;
                  <span style={{ fontStyle: 'italic', textTransform: 'capitalize' }}>{selectedBill.amountInWords}</span>
                </Box>

                <Box sx={{ borderTop: '2px double #CBD5E1', pt: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, fontSize: '9pt', color: '#444', zIndex: 1, position: 'relative' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: branding?.primaryColor || '#0B2B5E', mb: 0.5 }}>BANK DETAILS</Typography>
                    <table style={{ width: '100%', fontSize: '8.5pt' }}>
                      <tbody>
                        <tr>
                          <td style={{ color: '#666', fontWeight: 600, width: '100px' }}>Bank Name:</td>
                          <td style={{ fontWeight: 500 }}>{bankName || '—'}</td>
                        </tr>
                        <tr>
                          <td style={{ color: '#666', fontWeight: 600 }}>Branch:</td>
                          <td style={{ fontWeight: 500 }}>{branch || '—'}</td>
                        </tr>
                        <tr>
                          <td style={{ color: '#666', fontWeight: 600 }}>Account No:</td>
                          <td style={{ fontWeight: 700, color: '#111' }}>{accountNumber || '—'}</td>
                        </tr>
                        <tr>
                          <td style={{ color: '#666', fontWeight: 600 }}>IFSC Code:</td>
                          <td style={{ fontWeight: 700, color: '#111' }}>{ifscCode || '—'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </Box>
                  <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-end' }, minWidth: '150px' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#333', fontStyle: 'italic', mb: 1 }}>
                      For {branding?.companyName || 'Shivam Transport'}
                    </Typography>
                    {branding?.signatureDataUrl ? (
                      <Box component="img" src={branding.signatureDataUrl} alt="Signature" sx={{ maxWidth: 140, maxHeight: 50, objectFit: 'contain', mb: 0.5 }} />
                    ) : (
                      <Box sx={{ height: 38 }} />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 700, borderTop: '1px solid #666', pt: 0.5, width: '140px', textAlign: 'center', fontSize: '8.5pt' }}>
                      Authorized Signatory
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ textAlign: 'center', mt: 2.5, zIndex: 1, position: 'relative' }}>
                  <Typography variant="body2" sx={{ color: '#888', fontStyle: 'italic', fontSize: '8.5pt' }}>
                    {branding?.footerNote || 'Thank you for your business!'}
                  </Typography>
                </Box>
              </Box>
            );
          })()}
          {selectedBill && (
            <Box sx={{ maxWidth: '194mm', margin: '8px auto 0', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Typography
                variant="caption"
                sx={{ color: '#F0B90B', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => navigate(`/customer/${selectedBill.customerId}`)}
              >
                Open {selectedBill.customerName}'s customer page →
              </Typography>
              <Typography variant="caption" sx={{ color: '#888', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccountBalanceWallet sx={{ fontSize: 12 }} />
                Saved {new Date(selectedBill.createdAt).toLocaleString('en-IN')}{selectedBill.createdBy ? ` by ${selectedBill.createdBy}` : ''}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: '#f5f5f5', borderTop: '1px solid #ddd', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" onClick={() => setSelectedBill(null)} color="secondary" sx={{ fontWeight: 600 }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            startIcon={<Download />}
            sx={{ fontWeight: 700, color: '#000' }}
          >
            {downloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete-bill confirmation */}
      <Dialog open={Boolean(deleteBillEntry)} onClose={() => setDeleteBillEntry(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete This Bill?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to delete Bill #{deleteBillEntry?.billNo || '—'} for {deleteBillEntry?.customerName}
            (₹{deleteBillEntry?.netPayable.toFixed(2)})? It will be kept in Deleted Bills as a record.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteBillEntry(null)}>Cancel</Button>
          <Button
            onClick={handleConfirmDeleteBill}
            variant="contained"
            color="error"
            disabled={deletingBill}
            sx={{ fontWeight: 700 }}
          >
            {deletingBill ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permanent delete confirmation — irreversible, so it gets a stronger warning */}
      <Dialog open={Boolean(permanentDeleteBillEntry)} onClose={() => setPermanentDeleteBillEntry(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Permanently Delete This Bill?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will be permanently deleted and cannot be restored.
          </Alert>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to permanently delete Bill #{permanentDeleteBillEntry?.billNo || '—'} for{' '}
            {permanentDeleteBillEntry?.customerName} (₹{permanentDeleteBillEntry?.netPayable.toFixed(2)})?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermanentDeleteBillEntry(null)}>Cancel</Button>
          <Button
            onClick={handleConfirmPermanentDeleteBill}
            variant="contained"
            color="error"
            disabled={permanentlyDeletingBill}
            sx={{ fontWeight: 700 }}
          >
            {permanentlyDeletingBill ? 'Deleting...' : 'Yes, Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyBills;
