import { useState } from 'react';
import {
  Box, Typography, Paper, Autocomplete, TextField, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert,
} from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import TripForm from '../components/TripForm';
import type { Customer } from '../types';

const EMPTY_NEW_CUSTOMER = { name: '', phone: '', address: '', email: '', gstNumber: '' };

const AddTrip = () => {
  const { customers, addCustomer } = useAppContext();
  const [searchParams] = useSearchParams();
  const preselectId = searchParams.get('customerId');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    () => customers.find(c => c.id === preselectId) || null
  );

  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState(EMPTY_NEW_CUSTOMER);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [newCustomerError, setNewCustomerError] = useState('');

  const handleCreateCustomer = async () => {
    const name = newCustomer.name.trim();
    if (!name) {
      setNewCustomerError('Name is required');
      return;
    }
    setSavingCustomer(true);
    setNewCustomerError('');
    try {
      const id = await addCustomer({
        name,
        phone: newCustomer.phone.trim(),
        address: newCustomer.address.trim(),
        email: newCustomer.email.trim(),
        gstNumber: newCustomer.gstNumber.trim(),
      });
      setSelectedCustomer({ id, name, phone: newCustomer.phone.trim(), address: newCustomer.address.trim() });
      setIsNewCustomerOpen(false);
      setNewCustomer(EMPTY_NEW_CUSTOMER);
    } catch (error) {
      setNewCustomerError(error instanceof Error ? error.message : 'Could not create customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: '#EAECEF' }}>
          Add Trip
        </Typography>
        <Typography variant="body2" sx={{ color: '#848E9C', mt: 0.5 }}>
          Pick a customer, then fill in the trip details. This adds the trip already approved.
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, background: '#161A1E', border: '1px solid #2B3139' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Autocomplete
            options={customers}
            getOptionLabel={(option: Customer) => `${option.name}${option.phone ? ` — ${option.phone}` : ''}`}
            value={selectedCustomer}
            onChange={(_, value) => setSelectedCustomer(value)}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            sx={{ flex: 1, minWidth: 240 }}
            renderInput={params => <TextField {...params} label="Customer" placeholder="Search customers..." />}
          />
          <Button
            variant="outlined"
            startIcon={<PersonAdd />}
            onClick={() => setIsNewCustomerOpen(true)}
            sx={{ height: 56, fontWeight: 700 }}
          >
            New Customer
          </Button>
        </Box>
      </Paper>

      {selectedCustomer ? (
        <TripForm customerId={selectedCustomer.id} onTripAdded={() => {}} />
      ) : (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 2, background: '#161A1E', border: '1px dashed #2B3139', textAlign: 'center' }}>
          <Typography sx={{ color: '#848E9C' }}>Select or create a customer above to add a trip for them.</Typography>
        </Paper>
      )}

      {/* Create New Customer Dialog */}
      <Dialog open={isNewCustomerOpen} onClose={() => setIsNewCustomerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Customer</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {newCustomerError && <Alert severity="error">{newCustomerError}</Alert>}
            <TextField
              autoFocus
              label="Customer Name"
              value={newCustomer.name}
              onChange={e => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Phone Number"
              value={newCustomer.phone}
              onChange={e => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Address (Optional)"
              value={newCustomer.address}
              onChange={e => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Email (Optional)"
              value={newCustomer.email}
              onChange={e => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
              fullWidth
            />
            <TextField
              label="GST Number (Optional)"
              value={newCustomer.gstNumber}
              onChange={e => setNewCustomer(prev => ({ ...prev, gstNumber: e.target.value }))}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsNewCustomerOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateCustomer} variant="contained" disabled={savingCustomer} sx={{ color: '#0B0E11', fontWeight: 700 }}>
            {savingCustomer ? 'Creating...' : 'Create & Select'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddTrip;
