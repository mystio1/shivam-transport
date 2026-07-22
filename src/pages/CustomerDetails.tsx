import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Printer } from '@capgo/capacitor-printer';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  GridLegacy as Grid ,
  Card,
  CardContent,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  ArrowBack,
  Phone,
  LocationOn,
  LocalShipping,
  AccountBalanceWallet,
  ErrorOutline,
  Receipt,
  Close,
  Print,
  Share as ShareIcon,
  Email,
  WhatsApp,
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';
import TripForm from '../components/TripForm';
import TripList from '../components/TripList';
import { openWhatsApp } from '../utils/whatsapp';

const CustomerDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    customers, getCustomerTrips, updateTripPaymentStatus, isLoading,
    branding, updateCustomer, getNextInvoiceNumber, sendBillEmail,
  } = useAppContext();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triedRedirect = useRef(false);
  // Add a state to track if data is loaded
  const [dataLoaded, setDataLoaded] = useState(false);

  // State for GST numbers (optional)
  const [customerGst, setCustomerGst] = useState('');
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [bankName, setBankName] = useState('');
  const [branch, setBranch] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [amountInWords, setAmountInWords] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [dialogMessage, setDialogMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Ref for the bill section
  const billRef = useRef<HTMLDivElement>(null);

  // Find customer by ID
  console.log('CustomerDetails: id param =', id, 'customers =', customers);
  console.log('isLoading:', isLoading);
  const customer = customers.find(c => c.id === id);
  console.log('Found customer:', customer);
  console.log('Customer ID from useParams:', id);
  console.log('Customer object after find:', customer);
  
  // If we have an ID but no customers loaded yet, don't redirect immediately
  const shouldShowLoading = id && (customers.length === 0 || isLoading) && !dataLoaded;

  // Debug log when component mounts - keep this as the first useEffect
  useEffect(() => {
    console.log('CustomerDetails component mounted, id:', id);
    console.log('Current customers in context:', customers);
  }, [id, customers]);
  
  // Update the useEffect to set dataLoaded when customers are loaded
  useEffect(() => {
    if (customers.length > 0) {
      setDataLoaded(true);
    }
  }, [customers]);

  // Improved redirect logic with better debugging
  useEffect(() => {
    console.log('Redirect check - dataLoaded:', dataLoaded, 'customer:', customer, 'triedRedirect:', triedRedirect.current);
    
    if (dataLoaded && !customer && !triedRedirect.current) {
      console.log('Customer not found, redirecting to home');
      triedRedirect.current = true;
      navigate('/');
    }
  }, [customer, dataLoaded, navigate]);
  
  // Refresh effect (if needed for your context/store)
  useEffect(() => {
    // This effect will run whenever refreshTrigger or id changes
    // If you need to reload data from a server or context, do it here
  }, [refreshTrigger, id]);

  // Prefill GST from the saved customer record, and bank details from the admin's branding
  // settings, so the bill doesn't rely on hardcoded test data.
  useEffect(() => {
    if (customer?.gstNumber) setCustomerGst(customer.gstNumber);
  }, [customer?.gstNumber]);

  useEffect(() => {
    if (!branding) return;
    setBankName(prev => prev || branding.bankName);
    setBranch(prev => prev || branding.bankBranch);
    setAccountNumber(prev => prev || branding.bankAccountNumber);
    setIfscCode(prev => prev || branding.bankIfsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branding]);

  // Handle back navigation
  const handleBack = () => {
    navigate('/');
  };

  console.log('CustomerDetails: Before rendering, customer is:', customer);
  
  // Show loading indicator if data is still loading
  if (shouldShowLoading) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Loading customer data...
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please wait while we retrieve the customer information.
        </Typography>
      </Box>
    );
  }
  
  // If customer not found, show error message
  if (!customer) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <ErrorOutline sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom color="error.main">
          Customer Not Found
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          The customer you are looking for does not exist or has been removed.
        </Typography>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={handleBack}
        >
          Back to Home
        </Button>
      </Box>
    );
  }

  // Get customer trips
  const customerTrips = getCustomerTrips(id || '');

  // Calculate statistics
  const totalTrips = customerTrips.length;
  
  const totalAmount = customerTrips.reduce((sum, trip) => {
    const amount = typeof trip.amount === 'number' ? trip.amount : parseFloat(trip.amount) || 0;
    return sum + amount;
  }, 0);
  
  const paidAmount = customerTrips
    .filter(trip => trip.isPaid)
    .reduce((sum, trip) => {
      const amount = typeof trip.amount === 'number' ? trip.amount : parseFloat(trip.amount) || 0;
      return sum + amount;
    }, 0);
    
  const pendingAmount = totalAmount - paidAmount;

  // Handle trip added with improved debugging
  const handleTripAdded = () => {
    console.log('Trip added, refreshing customer details');
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle back navigation
  const handleBackToHome = () => {
    navigate('/');
  };

  // Handle payment status update
  const handlePaymentStatusUpdate = (tripId: string, isPaid: boolean) => {
    updateTripPaymentStatus(tripId, isPaid);
    setRefreshTrigger(prev => prev + 1);
  };

  const convertNumberToWords = (num: number): string => {
    const units = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertHundreds = (value: number): string => {
      let words = '';
      if (value >= 100) {
        words += `${units[Math.floor(value / 100)]} Hundred `;
        value %= 100;
      }
      if (value >= 20) {
        words += `${tens[Math.floor(value / 10)]} `;
        if (value % 10) words += `${units[value % 10]} `;
      } else if (value >= 10) {
        words += `${teens[value - 10]} `;
      } else if (value > 0) {
        words += `${units[value]} `;
      }
      return words.trim();
    };

    const sections = [];
    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const remainder = num % 1000;

    if (crore) sections.push(`${convertHundreds(crore)} Crore`);
    if (lakh) sections.push(`${convertHundreds(lakh)} Lakh`);
    if (thousand) sections.push(`${convertHundreds(thousand)} Thousand`);
    if (remainder) sections.push(`${convertHundreds(remainder)}`);
    return sections.length ? sections.join(' ') : 'Zero';
  };

  // Opens the bill preview. Assigns a real, server-issued invoice number the first time
  // (instead of always defaulting to "01"), and saves any GST number entered here onto the
  // customer record so it's remembered next time.
  const handleOpenPreview = async () => {
    if (!billNo) {
      try {
        const nextNumber = await getNextInvoiceNumber();
        setBillNo(String(nextNumber));
      } catch (error) {
        console.error('Could not fetch next invoice number:', error);
      }
    }
    if (customer && customerGst.trim() && customerGst.trim() !== (customer.gstNumber || '')) {
      updateCustomer(customer.id, { gstNumber: customerGst.trim() }).catch(err =>
        console.error('Could not save customer GST number:', err)
      );
    }
    setIsPreviewOpen(true);
  };

  const buildBillText = () => {
    const company = branding?.companyName || 'Shivam Transport';
    const totalAdvance = customerTrips.reduce((s, t) => s + (t.advanceAmount || 0), 0);
    const netPayable = totalAmount - totalAdvance;
    const lineBreak = '─'.repeat(40);
    const tripLines = customerTrips.map((trip, i) =>
      `${i + 1}. ${new Date(trip.date).toLocaleDateString('en-IN')} | ${trip.pickupLocation} → ${trip.dropLocation}\n   Amount: Rs.${trip.amount.toFixed(2)}  Advance: Rs.${(trip.advanceAmount || 0).toFixed(2)}`
    ).join('\n');
    const phones = [branding?.phone1, branding?.phone2].filter(Boolean).join(' / ');

    return `${company.toUpperCase()}
${branding?.tagline || ''}
${branding?.proprietorName ? `Prop.: ${branding.proprietorName}` : ''}${phones ? `\nMob.: ${phones}` : ''}
${lineBreak}
INVOICE
${lineBreak}
Bill To: ${customer?.name}
Phone:   ${customer?.phone || 'N/A'}
Address: ${customer?.address || 'N/A'}
Bill No: ${billNo || '01'}    Date: ${billDate}
${lineBreak}
TRIP DETAILS:
${tripLines}
${lineBreak}
Sub Total:      Rs. ${totalAmount.toFixed(2)}
${totalAdvance > 0 ? `Advance Paid:  -Rs. ${totalAdvance.toFixed(2)}
NET PAYABLE:    Rs. ${netPayable.toFixed(2)}` : `TOTAL:          Rs. ${totalAmount.toFixed(2)}`}
${lineBreak}
${bankName ? `Bank: ${bankName}${branch ? ` | Branch: ${branch}` : ''}\n` : ''}${accountNumber ? `A/c: ${accountNumber}\n` : ''}${ifscCode ? `IFSC: ${ifscCode}\n` : ''}${lineBreak}
${branding?.footerNote || 'Thank you for your business!'}`;
  };

  const handleEmailBill = async () => {
    if (!customer?.email) return;
    setSendingEmail(true);
    setDialogMessage(null);
    try {
      await sendBillEmail(
        customer.email,
        `Invoice ${billNo || ''} from ${branding?.companyName || 'Shivam Transport'}`,
        buildBillText(),
      );
      setDialogMessage({ type: 'success', text: `Bill emailed to ${customer.email}` });
    } catch (error) {
      setDialogMessage({ type: 'error', text: error instanceof Error ? error.message : 'Could not send email' });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleWhatsAppBill = () => {
    if (!customer?.phone) return;
    openWhatsApp(customer.phone, buildBillText());
  };

  const handlePrintBill = () => {
    const formattedBillDate = billDate
      ? new Date(billDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const amountWords = amountInWords.trim() || `${convertNumberToWords(Math.round(totalAmount))} Rupees Only`;
    const totalAdvance = customerTrips.reduce((s, t) => s + (t.advanceAmount || 0), 0);
    const netPayable = totalAmount - totalAdvance;
    const escapeHtml = (value: string | number) =>
      String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
    const printValue = (value: string | number | undefined) => escapeHtml(value || '');
    const bankNameToPrint = bankName.trim();
    const branchToPrint = branch.trim();
    const accountToPrint = accountNumber.trim();
    const ifscToPrint = ifscCode.trim();

    // Brand theme — set by the admin under Bill Branding & Settings (falls back to a default
    // navy/gold look if the admin hasn't customized it yet).
    const primaryColor = branding?.primaryColor || '#0B2B5E';
    const accentColor = branding?.accentColor || '#F0B90B';
    const companyName = (branding?.companyName || 'Shivam Transport').toUpperCase();
    const tagline = branding?.tagline || 'Transport & Logistics Solutions';
    const proprietorLine = branding?.proprietorName ? `Prop.: ${branding.proprietorName}` : '';
    const phones = [branding?.phone1, branding?.phone2].filter(Boolean).join(' &nbsp;/&nbsp; ');
    const contactLine = [proprietorLine, phones ? `Mob.: ${phones}` : ''].filter(Boolean).join(' &nbsp;&nbsp;|&nbsp;&nbsp; ');
    const addressLine = branding?.address || '';
    const footerNote = branding?.footerNote || 'Thank you for your business!';
    const logoUrl = branding?.logoDataUrl || '';

    const rowsHtml = customerTrips.map((trip, index) => {
      const bg = index % 2 === 0 ? '#fff' : '#fdf6f0';
      return `
        <tr style="background:${bg};">
          <td style="padding:5px 7px;border:1px solid #c8b8a2;font-size:9.5pt;text-align:center;">${printValue(new Date(trip.date).toLocaleDateString('en-IN'))}</td>
          <td style="padding:5px 7px;border:1px solid #c8b8a2;font-size:9.5pt;">${printValue(trip.pickupLocation)}</td>
          <td style="padding:5px 7px;border:1px solid #c8b8a2;font-size:9.5pt;">${printValue(trip.dropLocation)}</td>
          <td style="padding:5px 7px;border:1px solid #c8b8a2;font-size:9.5pt;text-align:right;">${printValue((trip.advanceAmount || 0).toFixed(2))}</td>
          <td style="padding:5px 7px;border:1px solid #c8b8a2;font-size:9.5pt;text-align:right;">${printValue(trip.amount.toFixed(2))}</td>
        </tr>`;
    }).join('');

    const css = `
      @page { size: A4 portrait; margin: 14mm 12mm; }
      * { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      body { margin:0; padding:0; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; font-size:10pt; color:#1a1a1a; background:#fff; }
      .page { width:100%; max-width:190mm; margin:0 auto; position:relative; background:#fff; }
      ${logoUrl ? `
      /* watermark */
      .page::before {
        content:''; position:fixed; bottom:25mm; left:10mm; width:85mm; height:52mm;
        background:url('${logoUrl}') center/contain no-repeat; opacity:0.05; pointer-events:none; z-index:0;
      }` : ''}
      .page > * { position:relative; z-index:1; }
      /* header */
      .accent-bar { height:4px; background:${accentColor}; margin-bottom:16px; }
      .header { text-align:center; padding-bottom:14px; margin-bottom:16px; border-bottom:3px double #CBD5E1; }
      .company-name { font-size:24pt; font-weight:800; letter-spacing:0.5px; text-transform:uppercase; color:${primaryColor}; }
      .tagline { font-size:9.5pt; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#8a8a8a; margin-top:4px; }
      .contact-line { font-size:9pt; color:#555; margin-top:6px; font-weight:500; }
      .address-line { font-size:8.5pt; color:#777; margin-top:2px; }
      /* bill-to / invoice-details */
      .info-grid { display:flex; gap:24px; margin-bottom:20px; }
      .info-col { flex:1; }
      .info-col table { width:100%; border-collapse:collapse; }
      .info-col td { font-size:9.5pt; padding:2px 0; vertical-align:top; color:#333; }
      .info-col td.label { color:#666; font-weight:600; width:78px; white-space:nowrap; padding-right:8px; }
      .info-col td.strong { font-weight:700; color:${primaryColor}; }
      /* trip table */
      .tt { width:100%; border-collapse:collapse; margin-bottom:16px; font-size:9pt; }
      .tt th { background:${primaryColor}; color:#fff; padding:7px 8px; border:1px solid #E2E8F0; font-weight:700; text-align:center; }
      .tt th.l { text-align:left; }
      .tt th.r, .tt td.r { text-align:right; }
      .tt td { padding:6px 8px; border:1px solid #E2E8F0; color:#1a1a1a; }
      .tt tbody tr:nth-child(even) { background:#F8FAFC; }
      .subtotal-row td { font-weight:700; color:${primaryColor}; }
      .advance-row td { background:#FFF9E6; color:#7A5A00; font-weight:700; }
      .net-row td { background:#EBF5EC; color:#0B5E1F; font-weight:900; font-size:10pt; }
      /* amount in words */
      .words-box { margin-bottom:16px; padding:8px 10px; background:#fcfcfc; border:1px dashed #ddd; border-radius:4px; font-size:9pt; color:#555; }
      .words-box b { color:#1a1a1a; }
      /* bank + signature footer */
      .footer-row { display:flex; gap:24px; border-top:2px double #CBD5E1; padding-top:14px; font-size:9pt; color:#444; }
      .bank-col { flex:1; }
      .bank-title { font-weight:700; color:${primaryColor}; margin-bottom:4px; font-size:9.5pt; }
      .bank-col table { width:100%; font-size:8.5pt; }
      .bank-col td.label { color:#666; font-weight:600; width:95px; }
      .bank-col td.strong { font-weight:700; color:#111; }
      .sign-col { flex:0 0 160px; text-align:right; display:flex; flex-direction:column; justify-content:space-between; }
      .for-company { font-weight:600; color:#333; font-style:italic; margin-bottom:28px; }
      .sign-line { font-weight:700; border-top:1px solid #666; padding-top:4px; width:140px; margin-left:auto; text-align:center; font-size:8.5pt; }
      /* footer note */
      .footer-note { text-align:center; margin-top:18px; font-size:8.5pt; color:#888; font-style:italic; }
      @media print {
        body { background:#fff; }
        .page { max-width:100%; }
        .page::before { position:fixed; }
      }
    `;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Invoice - ${printValue(customer.name)}</title>
  <style>${css}</style>
</head>
<body>
<div class="page">
  <div class="accent-bar"></div>
  <div class="header">
    <div class="company-name">${printValue(companyName)}</div>
    <div class="tagline">${printValue(tagline)}</div>
    ${contactLine ? `<div class="contact-line">${contactLine}</div>` : ''}
    ${addressLine ? `<div class="address-line">${printValue(addressLine)}</div>` : ''}
  </div>

  <div class="info-grid">
    <div class="info-col">
      <table>
        <tr><td class="label">M/s.:</td><td class="strong">${printValue(customer.name)}</td></tr>
        <tr><td class="label">Address:</td><td>${printValue(customer.address || 'N/A')}</td></tr>
        <tr><td class="label">Phone:</td><td>${printValue(customer.phone || 'N/A')}</td></tr>
        <tr><td class="label">GST No.:</td><td>${printValue(customerGst || '—')}</td></tr>
      </table>
    </div>
    <div class="info-col">
      <table>
        <tr><td class="label">Bill No.:</td><td class="strong">${printValue(billNo || '01')}</td></tr>
        <tr><td class="label">Date:</td><td>${printValue(formattedBillDate)}</td></tr>
        <tr><td class="label">Total Trips:</td><td>${customerTrips.length}</td></tr>
      </table>
    </div>
  </div>

  <table class="tt">
    <thead>
      <tr>
        <th style="width:15%;">Date</th>
        <th class="l" style="width:25%;">Pickup</th>
        <th class="l" style="width:25%;">Drop</th>
        <th class="r" style="width:17.5%;">Advance</th>
        <th class="r" style="width:17.5%;">Amount</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
      <tr class="subtotal-row">
        <td colspan="3" class="r">Sub Total</td>
        <td class="r">₹${printValue(totalAdvance.toFixed(2))}</td>
        <td class="r">₹${printValue(totalAmount.toFixed(2))}</td>
      </tr>
      ${totalAdvance > 0 ? `
      <tr class="advance-row">
        <td colspan="4" class="r">Less: Advance Paid</td>
        <td class="r">- ₹${printValue(totalAdvance.toFixed(2))}</td>
      </tr>
      <tr class="net-row">
        <td colspan="4" class="r">NET PAYABLE</td>
        <td class="r">₹${printValue(netPayable.toFixed(2))}</td>
      </tr>` : ''}
    </tfoot>
  </table>

  <div class="words-box"><b>Amount in Words:</b> ${printValue(amountWords)}</div>

  <div class="footer-row">
    <div class="bank-col">
      <div class="bank-title">BANK DETAILS</div>
      <table>
        <tr><td class="label">Bank Name:</td><td>${printValue(bankNameToPrint || '—')}</td></tr>
        <tr><td class="label">Branch:</td><td>${printValue(branchToPrint || '—')}</td></tr>
        <tr><td class="label">Account No:</td><td class="strong">${printValue(accountToPrint || '—')}</td></tr>
        <tr><td class="label">IFSC Code:</td><td class="strong">${printValue(ifscToPrint || '—')}</td></tr>
      </table>
    </div>
    <div class="sign-col">
      <div class="for-company">For ${printValue(companyName)}</div>
      <div class="sign-line">Authorized Signatory</div>
    </div>
  </div>

  <div class="footer-note">${printValue(footerNote)}</div>
</div>
<script>window.addEventListener("load",function(){setTimeout(function(){window.focus();window.print();},450);});</script>
</body>
</html>`;

    if (Capacitor.isNativePlatform()) {
      const cleanHtml = html.replace('<script>window.addEventListener("load",function(){setTimeout(function(){window.focus();window.print();},450);});</script>', '');
      Printer.printHtml({
        name: `Invoice_${customer.name}`,
        html: cleanHtml
      }).catch(err => {
        console.error("Print error:", err);
      });
    } else {
      const printWindow = window.open('', '', 'width=960,height=900');
      if (!printWindow) return;
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  // Handle download/share bill on mobile (Android/iOS)
  const handleShareBill = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: `Invoice - ${customer?.name}`,
          text: buildBillText(),
          dialogTitle: 'Share Invoice',
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      handlePrintBill();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <IconButton
          onClick={handleBackToHome}
          sx={{ mr: 2, bgcolor: 'action.hover' }}
          aria-label="back"
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" color="primary.dark" sx={{ fontWeight: 800 }}>
          Customer Details
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenPreview}
          sx={{ ml: 'auto', fontWeight: 750, color: '#000', '&:hover': { bgcolor: 'primary.dark' } }}
          startIcon={<Receipt />}
        >
          View & Print Bill
        </Button>
      </Box>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 2,
          background: '#161A1E',
          border: '1px solid #2B3139',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Box sx={{ mr: 4, mb: 2 }}>
            <Typography
              variant="h5"
              gutterBottom
              sx={{
                fontWeight: 700,
                color: '#EAECEF'
              }}
            >
              {customer.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Phone sx={{ fontSize: 20, mr: 1, color: '#F0B90B' }} />
              <Typography variant="body1" sx={{ color: '#848E9C' }}>
                {customer.phone || 'No phone number'}
              </Typography>
            </Box>
            {customer.address && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 1 }}>
                <LocationOn sx={{ fontSize: 20, mr: 1, mt: 0.5, color: '#0ECB81' }} />
                <Typography variant="body1" sx={{ color: '#848E9C' }}>
                  {customer.address}
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, ml: 'auto' }}>
            <Chip 
              icon={<LocalShipping />} 
              label={`${totalTrips} Trips`} 
              sx={{ fontWeight: 600, backgroundColor: 'rgba(240, 185, 11, 0.1)', color: '#F0B90B', border: '1px solid rgba(240, 185, 11, 0.2)' }}
            />
            <Chip 
              icon={<AccountBalanceWallet />} 
              label={`₹${totalAmount.toFixed(2)} Total`} 
              sx={{ fontWeight: 600, backgroundColor: 'rgba(14, 203, 129, 0.1)', color: '#0ECB81', border: '1px solid rgba(14, 203, 129, 0.2)' }}
            />
            {pendingAmount > 0 && (
              <Chip 
                icon={<AccountBalanceWallet />} 
                label={`₹${pendingAmount.toFixed(2)} Pending`} 
                sx={{ fontWeight: 600, backgroundColor: 'rgba(246, 70, 93, 0.1)', color: '#F6465D', border: '1px solid rgba(246, 70, 93, 0.2)' }}
              />
            )}
          </Box>
        </Box>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
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
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#848E9C', fontWeight: 600, fontSize: '1rem' }}>
                Total Trips
              </Typography>
              <Typography variant="h3" sx={{ color: '#EAECEF', fontWeight: 800 }}>{totalTrips}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
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
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#848E9C', fontWeight: 600, fontSize: '1rem' }}>Total Revenue</Typography>
              <Typography variant="h3" sx={{ color: '#EAECEF', fontWeight: 800 }}>₹{totalAmount.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{
            height: '100%',
            borderRadius: 2,
            background: '#161A1E',
            borderTop: '3px solid #F6465D',
            color: '#EAECEF',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            transition: 'transform 0.3s, box-shadow 0.3s',
            '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(246, 70, 93, 0.15)' },
            p: 2
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#848E9C', fontWeight: 600, fontSize: '1rem' }}>Pending Amount</Typography>
              <Typography variant="h3" sx={{ color: '#F6465D', fontWeight: 800 }}>₹{pendingAmount.toFixed(2)}</Typography>
              <Typography variant="body2" sx={{ color: '#0ECB81', mt: 1, fontWeight: 500 }}>
                {Math.round((paidAmount / (totalAmount || 1)) * 100)}% collected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>


{/* Printable Bill Section */}
<Box ref={billRef} sx={{ marginBottom: 4 }}>
  <Paper
    elevation={0}
    sx={{
      p: 3,
      mb: 3,
      bgcolor: '#161A1E',
      borderRadius: 2,
      border: '1px solid',
      borderColor: '#2B3139',
    }}
  >
    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2, color: '#EAECEF', fontWeight: 600 }}>
      <Receipt sx={{ mr: 1, color: '#F0B90B' }} />
      Bill Inputs
    </Typography>
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Bill Number"
          value={billNo}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setBillNo(e.target.value)}
          placeholder="Enter bill number"
          variant="outlined"
          size="small"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Bill Date"
          type="date"
          value={billDate}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setBillDate(e.target.value)}
          variant="outlined"
          size="small"
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Customer GST Number"
          value={customerGst}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomerGst(e.target.value)}
          placeholder="Enter customer GSTIN"
          variant="outlined"
          size="small"
          InputProps={{
            startAdornment: <InputAdornment position="start">GSTIN</InputAdornment>,
          }}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Bank Name"
          value={bankName}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setBankName(e.target.value)}
          placeholder="Bank Name"
          variant="outlined"
          size="small"
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Branch"
          value={branch}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setBranch(e.target.value)}
          placeholder="Bank Branch"
          variant="outlined"
          size="small"
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Account Number"
          value={accountNumber}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setAccountNumber(e.target.value)}
          placeholder="Account Number"
          variant="outlined"
          size="small"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="IFSC Code"
          value={ifscCode}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setIfscCode(e.target.value)}
          placeholder="IFSC Code"
          variant="outlined"
          size="small"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Amount in Words"
          value={amountInWords}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setAmountInWords(e.target.value)}
          placeholder="Enter amount in words"
          variant="outlined"
          size="small"
        />
      </Grid>
    </Grid>
  </Paper>

  <Paper
    elevation={0}
    sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: '#2B3139', bgcolor: '#161A1E' }}
  >
    <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#EAECEF' }}>Billing Preview</Typography>
      <Typography variant="body2" sx={{ color: '#848E9C' }}>
        The printed bill will use these columns: Date, From, To, Advance, Amount, Status.
      </Typography>
    </Box>

    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#EAECEF' }}>Customer</Typography>
      <Typography variant="body2" sx={{ color: '#848E9C' }}><strong>Name:</strong> <span style={{ color: '#EAECEF' }}>{customer.name}</span></Typography>
      <Typography variant="body2" sx={{ color: '#848E9C' }}><strong>Phone:</strong> <span style={{ color: '#EAECEF' }}>{customer.phone || 'N/A'}</span></Typography>
      <Typography variant="body2" sx={{ color: '#848E9C' }}><strong>Address:</strong> <span style={{ color: '#EAECEF' }}>{customer.address || 'N/A'}</span></Typography>
    </Box>

    <Box component="div" sx={{ width: '100%', mt: 2, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', minWidth: '500px', borderCollapse: 'collapse', fontSize: '0.93rem', color: '#EAECEF' }}>
        <thead>
          <tr>
            <th style={{ padding: '10px', borderBottom: '2px solid #2B3139', textAlign: 'left', width: '15%' }}>Date</th>
            <th style={{ padding: '10px', borderBottom: '2px solid #2B3139', textAlign: 'left', width: '22%' }}>From</th>
            <th style={{ padding: '10px', borderBottom: '2px solid #2B3139', textAlign: 'left', width: '23%' }}>To</th>
            <th style={{ padding: '10px', borderBottom: '2px solid #2B3139', textAlign: 'right', width: '14%' }}>Advance</th>
            <th style={{ padding: '10px', borderBottom: '2px solid #2B3139', textAlign: 'right', width: '14%' }}>Amount</th>
            <th style={{ padding: '10px', borderBottom: '2px solid #2B3139', textAlign: 'center', width: '12%' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {customerTrips.map((trip, idx) => (
            <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#1E2329' : '#161A1E' }}>
              <td style={{ padding: '10px', borderBottom: '1px solid #2B3139' }}>{new Date(trip.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' })}</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #2B3139' }}>{trip.pickupLocation}</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #2B3139' }}>{trip.dropLocation}</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #2B3139', textAlign: 'right' }}>₹{(trip.advanceAmount || 0).toFixed(2)}</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #2B3139', textAlign: 'right' }}>₹{trip.amount.toFixed(2)}</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #2B3139', textAlign: 'center', color: trip.isPaid ? '#0ECB81' : '#F6465D' }}>{trip.isPaid ? 'Paid' : 'Pending'}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} style={{ padding: '10px', fontWeight: 700, textAlign: 'right', borderTop: '2px solid #2B3139', color: '#F0B90B' }}>Sub Total</td>
            <td style={{ padding: '10px', fontWeight: 700, textAlign: 'right', borderTop: '2px solid #2B3139', color: '#F0B90B' }}>₹{customerTrips.reduce((sum, trip) => sum + (trip.advanceAmount || 0), 0).toFixed(2)}</td>
            <td style={{ padding: '10px', fontWeight: 700, textAlign: 'right', borderTop: '2px solid #2B3139', color: '#F0B90B' }}>₹{totalAmount.toFixed(2)}</td>
            <td style={{ padding: '10px', borderTop: '2px solid #2B3139' }} />
          </tr>
          {customerTrips.reduce((sum, trip) => sum + (trip.advanceAmount || 0), 0) > 0 && (
            <>
              <tr style={{ backgroundColor: '#2A2500' }}>
                <td colSpan={4} style={{ padding: '10px', fontWeight: 700, textAlign: 'right', color: '#C8A200' }}>Less: Advance Paid</td>
                <td style={{ padding: '10px', fontWeight: 800, textAlign: 'right', color: '#C8A200' }}>- ₹{customerTrips.reduce((sum, trip) => sum + (trip.advanceAmount || 0), 0).toFixed(2)}</td>
                <td />
              </tr>
              <tr style={{ backgroundColor: '#0D2A1A' }}>
                <td colSpan={4} style={{ padding: '10px', fontWeight: 900, textAlign: 'right', color: '#0ECB81', fontSize: '1rem' }}>NET PAYABLE</td>
                <td style={{ padding: '10px', fontWeight: 900, textAlign: 'right', color: '#0ECB81', fontSize: '1rem' }}>₹{(totalAmount - customerTrips.reduce((sum, trip) => sum + (trip.advanceAmount || 0), 0)).toFixed(2)}</td>
                <td />
              </tr>
            </>
          )}
        </tbody>
      </table>
    </Box>
    <Typography variant="body2" sx={{ mt: 2, fontWeight: 600, color: '#EAECEF' }}>Amount in words: <span style={{ color: '#848E9C' }}>{amountInWords.trim() || `${convertNumberToWords(Math.round(totalAmount))} Rupees Only`}</span></Typography>
  </Paper>
</Box>


      {/* Trip Form */}
      <TripForm customerId={id || ''} onTripAdded={handleTripAdded} />

      {/* Trip List */}
      <TripList 
        trips={customerTrips} 
        customerName={customer.name}
        onUpdatePaymentStatus={handlePaymentStatusUpdate} 
      />

      {/* Invoice Preview Dialog */}
      <Dialog
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={Capacitor.isNativePlatform()}
        PaperProps={{
          sx: {
            bgcolor: '#ffffff',
            color: '#1a1a1a',
            p: { xs: 0, sm: 3 },
            backgroundImage: 'none', // Remove default Dialog dark theme gradient overlay
          }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f5f5f5', color: '#333', borderBottom: '1px solid #ddd' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a1a1a' }}>Invoice Bill Preview</Typography>
          <IconButton
            aria-label="close"
            onClick={() => setIsPreviewOpen(false)}
            sx={{ color: '#666' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1, sm: 3 }, bgcolor: '#fafafa' }}>
          {dialogMessage && (
            <Alert severity={dialogMessage.type} sx={{ mb: 2 }} onClose={() => setDialogMessage(null)}>
              {dialogMessage.text}
            </Alert>
          )}
          {/* Printable Sheet Simulation container */}
          <Box
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
              // Watermark (only when the admin has set a logo under Bill Branding & Settings)
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
            {/* Accent bar */}
            <Box sx={{ height: '4px', bgcolor: branding?.accentColor || '#F0B90B', mb: 2, zIndex: 1, position: 'relative' }} />

            {/* Header Content */}
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

            {/* Invoice Info Layout */}
            <Grid container spacing={2} sx={{ mb: 3, fontSize: '9.5pt', color: '#333', zIndex: 1, position: 'relative' }}>
              <Grid item xs={12} sm={6}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '2px 8px 2px 0', color: '#666', fontWeight: 600, width: '70px' }}>M/s.:</td>
                      <td style={{ padding: '2px 0', fontWeight: 700, color: branding?.primaryColor || '#0B2B5E' }}>{customer.name}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '2px 8px 2px 0', color: '#666', fontWeight: 600 }}>Address:</td>
                      <td style={{ padding: '2px 0' }}>{customer.address || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '2px 8px 2px 0', color: '#666', fontWeight: 600 }}>Phone:</td>
                      <td style={{ padding: '2px 0' }}>{customer.phone || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '2px 8px 2px 0', color: '#666', fontWeight: 600 }}>GST No.:</td>
                      <td style={{ padding: '2px 0' }}>{customerGst || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </Grid>
              <Grid item xs={12} sm={6}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '2px 8px 2px 0', color: '#666', fontWeight: 600, width: '70px' }}>Bill No.:</td>
                      <td style={{ padding: '2px 0', fontWeight: 700, color: branding?.primaryColor || '#0B2B5E' }}>{billNo || '01'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '2px 8px 2px 0', color: '#666', fontWeight: 600 }}>Date:</td>
                      <td style={{ padding: '2px 0' }}>
                        {billDate
                          ? new Date(billDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Grid>
            </Grid>

            {/* Items Table */}
            <Box sx={{ width: '100%', overflowX: 'auto', mb: 3, zIndex: 1, position: 'relative' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', color: '#1a1a1a', minWidth: '500px' }}>
                <thead>
                  <tr style={{ backgroundColor: branding?.primaryColor || '#0B2B5E', color: '#ffffff' }}>
                    <th style={{ padding: '6px 8px', border: '1px solid #E2E8F0', textAlign: 'center', width: '15%' }}>Date</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #E2E8F0', textAlign: 'left', width: '25%' }}>Pickup</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #E2E8F0', textAlign: 'left', width: '25%' }}>Drop</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #E2E8F0', textAlign: 'right', width: '17%' }}>Advance</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #E2E8F0', textAlign: 'right', width: '18%' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {customerTrips.map((trip, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                      <td style={{ padding: '5px 8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                        {new Date(trip.date).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ padding: '5px 8px', border: '1px solid #E2E8F0' }}>{trip.pickupLocation}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #E2E8F0' }}>{trip.dropLocation}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #E2E8F0', textAlign: 'right' }}>
                        ₹{(trip.advanceAmount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '5px 8px', border: '1px solid #E2E8F0', textAlign: 'right' }}>
                        ₹{trip.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {/* Subtotal Row */}
                  <tr>
                    <td colSpan={3} style={{ padding: '6px 8px', border: '1px solid #E2E8F0', fontWeight: 700, textAlign: 'right', color: branding?.primaryColor || '#0B2B5E' }}>Sub Total</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #E2E8F0', fontWeight: 700, textAlign: 'right', color: branding?.primaryColor || '#0B2B5E' }}>
                      ₹{customerTrips.reduce((sum, trip) => sum + (trip.advanceAmount || 0), 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 8px', border: '1px solid #E2E8F0', fontWeight: 700, textAlign: 'right', color: branding?.primaryColor || '#0B2B5E' }}>
                      ₹{totalAmount.toFixed(2)}
                    </td>
                  </tr>
                  {/* Less Advance Row */}
                  {customerTrips.reduce((sum, trip) => sum + (trip.advanceAmount || 0), 0) > 0 && (
                    <>
                      <tr>
                        <td colSpan={4} style={{ padding: '6px 8px', border: '1px solid #E2E8F0', fontWeight: 700, textAlign: 'right', color: '#7A5A00' }}>Less: Advance Paid</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #E2E8F0', fontWeight: 800, textAlign: 'right', color: '#7A5A00' }}>
                          - ₹{customerTrips.reduce((sum, trip) => sum + (trip.advanceAmount || 0), 0).toFixed(2)}
                        </td>
                      </tr>
                      {/* Net Payable Row */}
                      <tr style={{ backgroundColor: '#EBF5EC' }}>
                        <td colSpan={4} style={{ padding: '8px 8px', border: '1px solid #E2E8F0', fontWeight: 900, textAlign: 'right', color: '#0B5E1F', fontSize: '10pt' }}>NET PAYABLE</td>
                        <td style={{ padding: '8px 8px', border: '1px solid #E2E8F0', fontWeight: 900, textAlign: 'right', color: '#0B5E1F', fontSize: '10.5pt' }}>
                          ₹{(totalAmount - customerTrips.reduce((sum, trip) => sum + (trip.advanceAmount || 0), 0)).toFixed(2)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </Box>

            {/* Word Amount */}
            <Box sx={{ mb: 3, p: 1, bgcolor: '#fcfcfc', border: '1px dashed #ddd', borderRadius: '4px', fontSize: '9pt', color: '#555', zIndex: 1, position: 'relative' }}>
              <strong>Amount in Words:</strong> &nbsp;
              <span style={{ fontStyle: 'italic', textTransform: 'capitalize' }}>
                {amountInWords.trim() || `${convertNumberToWords(Math.round(totalAmount))} Rupees Only`}
              </span>
            </Box>

            {/* Footer Bank details */}
            <Box sx={{ borderTop: '2px double #CBD5E1', pt: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, fontSize: '9pt', color: '#444', zIndex: 1, position: 'relative' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: branding?.primaryColor || '#0B2B5E', mb: 0.5 }}>BANK DETAILS</Typography>
                <table style={{ width: '100%', fontSize: '8.5pt' }}>
                  <tbody>
                    <tr>
                      <td style={{ color: '#666', fontWeight: 600, width: '100px' }}>Bank Name:</td>
                      <td style={{ fontWeight: 500 }}>{bankName.trim() || '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#666', fontWeight: 600 }}>Branch:</td>
                      <td style={{ fontWeight: 500 }}>{branch.trim() || '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#666', fontWeight: 600 }}>Account No:</td>
                      <td style={{ fontWeight: 700, color: '#111' }}>{accountNumber.trim() || '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#666', fontWeight: 600 }}>IFSC Code:</td>
                      <td style={{ fontWeight: 700, color: '#111' }}>{ifscCode.trim() || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </Box>
              <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-end' }, minWidth: '150px' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#333', fontStyle: 'italic', mb: 3 }}>
                  For {branding?.companyName || 'Shivam Transport'}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, borderTop: '1px solid #666', pt: 0.5, width: '140px', textAlign: 'center', fontSize: '8.5pt' }}>
                  Authorized Signatory
                </Typography>
              </Box>
            </Box>

            {/* Footer note */}
            <Box sx={{ textAlign: 'center', mt: 2.5, zIndex: 1, position: 'relative' }}>
              <Typography variant="body2" sx={{ color: '#888', fontStyle: 'italic', fontSize: '8.5pt' }}>
                {branding?.footerNote || 'Thank you for your business!'}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5', borderTop: '1px solid #ddd', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setIsPreviewOpen(false)}
            color="secondary"
            sx={{ fontWeight: 600 }}
          >
            Close
          </Button>

          {Capacitor.isNativePlatform() && (
            <Button
              variant="outlined"
              onClick={handleShareBill}
              color="primary"
              startIcon={<ShareIcon />}
              sx={{ fontWeight: 700 }}
            >
              Share Summary
            </Button>
          )}

          {customer?.phone && (
            <Button
              variant="outlined"
              onClick={handleWhatsAppBill}
              startIcon={<WhatsApp />}
              sx={{ fontWeight: 700, color: '#25D366', borderColor: '#25D366' }}
            >
              WhatsApp
            </Button>
          )}

          {customer?.email && (
            <Button
              variant="outlined"
              onClick={handleEmailBill}
              disabled={sendingEmail}
              startIcon={<Email />}
              sx={{ fontWeight: 700 }}
            >
              {sendingEmail ? 'Sending...' : 'Email'}
            </Button>
          )}

          <Button
            variant="contained"
            onClick={handlePrintBill}
            color="primary"
            startIcon={<Print />}
            sx={{ fontWeight: 700, color: '#000' }}
          >
            Print / Save PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerDetails;


