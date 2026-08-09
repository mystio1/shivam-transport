import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, List, TextField, InputAdornment, IconButton, Chip, useTheme,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Menu, MenuItem,
} from '@mui/material';
import {
  Search, Clear, Add, DirectionsCar, MoreVert, Delete, Edit, VerifiedUser, WarningAmber, ErrorOutline,
} from '@mui/icons-material';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../components/ToastProvider';
import EmptyState from '../components/EmptyState';
import { ListRowsSkeleton } from '../components/Skeletons';
import type { Vehicle, VehicleDocument } from '../types';
import { documentStatus, DEFAULT_REMINDER_DAYS, type DocumentStatus } from '../utils/documentStatus';

const SUGGESTED_LABELS = ['Insurance', 'PUC', 'Fitness Certificate', 'Permit', 'National Permit', 'Road Tax'];

function statusMeta(status: DocumentStatus) {
  if (status.state === 'expired') {
    return { color: '#F6465D', bg: 'rgba(246,70,93,0.12)', icon: <ErrorOutline sx={{ fontSize: 16 }} />, label: `Expired ${Math.abs(status.daysUntilExpiry)}d ago` };
  }
  if (status.state === 'due-soon') {
    return { color: '#F0B90B', bg: 'rgba(240,185,11,0.12)', icon: <WarningAmber sx={{ fontSize: 16 }} />, label: status.daysUntilExpiry === 0 ? 'Expires today' : `Due in ${status.daysUntilExpiry}d` };
  }
  return { color: '#0ECB81', bg: 'rgba(14,203,129,0.12)', icon: <VerifiedUser sx={{ fontSize: 16 }} />, label: `Valid · ${status.daysUntilExpiry}d left` };
}

const EMPTY_DOC_FORM = { label: '', expiryDate: '', reminderDaysBefore: String(DEFAULT_REMINDER_DAYS) };

const DocumentReminders = () => {
  const theme = useTheme();
  const toast = useToast();
  const {
    vehicles, isLoading, addVehicle, deleteVehicle,
    addVehicleDocument, updateVehicleDocument, deleteVehicleDocument,
  } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const showSkeleton = isLoading && vehicles.length === 0;

  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [newVehicleNumber, setNewVehicleNumber] = useState('');
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [vehicleError, setVehicleError] = useState('');

  const [docDialog, setDocDialog] = useState<{ vehicleId: string; document?: VehicleDocument } | null>(null);
  const [docForm, setDocForm] = useState(EMPTY_DOC_FORM);
  const [docError, setDocError] = useState('');
  const [savingDoc, setSavingDoc] = useState(false);

  const [vehicleMenu, setVehicleMenu] = useState<{ anchor: HTMLElement; vehicleId: string } | null>(null);

  const visibleVehicles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(v => v.vehicleNumber.toLowerCase().includes(q) || v.documents.some(d => d.label.toLowerCase().includes(q)));
  }, [vehicles, searchTerm]);

  const handleAddVehicle = async () => {
    const number = newVehicleNumber.trim();
    if (!number) {
      setVehicleError('Vehicle number is required');
      return;
    }
    setSavingVehicle(true);
    setVehicleError('');
    try {
      await addVehicle(number);
      toast.success('Vehicle added.');
      setAddVehicleOpen(false);
      setNewVehicleNumber('');
    } catch (error) {
      setVehicleError(error instanceof Error ? error.message : 'Could not add vehicle');
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    setVehicleMenu(null);
    try {
      await deleteVehicle(vehicleId);
      toast.success('Vehicle removed.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove vehicle');
    }
  };

  const openAddDocument = (vehicleId: string) => {
    setDocForm(EMPTY_DOC_FORM);
    setDocError('');
    setDocDialog({ vehicleId });
  };

  const openEditDocument = (vehicleId: string, document: VehicleDocument) => {
    setDocForm({
      label: document.label,
      expiryDate: document.expiryDate.slice(0, 10),
      reminderDaysBefore: String(document.reminderDaysBefore ?? DEFAULT_REMINDER_DAYS),
    });
    setDocError('');
    setDocDialog({ vehicleId, document });
  };

  const handleSaveDocument = async () => {
    if (!docDialog) return;
    const label = docForm.label.trim();
    const expiryDate = docForm.expiryDate.trim();
    if (!label) { setDocError('Document name is required'); return; }
    if (!expiryDate) { setDocError('Expiry date is required'); return; }
    const reminderDaysBefore = Math.max(0, Math.round(Number(docForm.reminderDaysBefore) || 0));

    setSavingDoc(true);
    setDocError('');
    try {
      if (docDialog.document) {
        await updateVehicleDocument(docDialog.vehicleId, docDialog.document.id, { label, expiryDate, reminderDaysBefore });
        toast.success('Document updated.');
      } else {
        await addVehicleDocument(docDialog.vehicleId, { label, expiryDate, reminderDaysBefore });
        toast.success('Document added.');
      }
      setDocDialog(null);
    } catch (error) {
      setDocError(error instanceof Error ? error.message : 'Could not save document');
    } finally {
      setSavingDoc(false);
    }
  };

  const handleDeleteDocument = async (vehicleId: string, documentId: string) => {
    try {
      await deleteVehicleDocument(vehicleId, documentId);
      toast.success('Document removed.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove document');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Document Reminders
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Track insurance, PUC, and any other expiring document per vehicle — you'll get a reminder {DEFAULT_REMINDER_DAYS} days before it expires by default.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setAddVehicleOpen(true)} sx={{ color: 'primary.contrastText', fontWeight: 700, whiteSpace: 'nowrap' }}>
          Add Vehicle
        </Button>
      </Box>

      <TextField
        placeholder="Search by vehicle number or document..."
        variant="outlined"
        size="small"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        sx={{ width: { xs: '100%', sm: '400px' } }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment>,
          endAdornment: searchTerm && (
            <InputAdornment position="end">
              <IconButton aria-label="clear search" onClick={() => setSearchTerm('')} edge="end" size="small" sx={{ color: 'text.secondary' }}>
                <Clear fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
        {showSkeleton ? (
          <ListRowsSkeleton />
        ) : visibleVehicles.length === 0 ? (
          searchTerm ? (
            <EmptyState
              icon={<Search />}
              title="No vehicles match your search"
              description="Try a different vehicle number or document name."
              action={{ label: 'Clear search', onClick: () => setSearchTerm('') }}
            />
          ) : (
            <EmptyState
              icon={<DirectionsCar />}
              title="No vehicles added yet"
              description="Add a vehicle, then track its insurance, PUC, and any other document that expires."
              action={{ label: 'Add Vehicle', onClick: () => setAddVehicleOpen(true), icon: <Add /> }}
            />
          )
        ) : (
          <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {visibleVehicles.map((vehicle: Vehicle) => (
              <Box
                key={vehicle.id}
                sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: 'action.hover' }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DirectionsCar sx={{ color: '#F0B90B' }} />
                    <Typography sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '0.5px' }}>
                      {vehicle.vehicleNumber}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button size="small" startIcon={<Add />} onClick={() => openAddDocument(vehicle.id)} sx={{ color: '#F0B90B', fontWeight: 700 }}>
                      Add Document
                    </Button>
                    <IconButton size="small" onClick={e => setVehicleMenu({ anchor: e.currentTarget, vehicleId: vehicle.id })} sx={{ color: 'text.secondary' }}>
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {vehicle.documents.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>
                    No documents tracked yet for this vehicle.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {vehicle.documents.map(document => {
                      const status = documentStatus(document);
                      const meta = statusMeta(status);
                      return (
                        <Box
                          key={document.id}
                          sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5,
                            p: 1.25, borderRadius: 1.5, bgcolor: 'background.paper',
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: 14 }}>{document.label}</Typography>
                            <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                              Expires {new Date(document.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                            <Chip icon={meta.icon} label={meta.label} size="small" sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 700 }} />
                            <IconButton size="small" onClick={() => openEditDocument(vehicle.id, document)} sx={{ color: 'text.secondary' }}>
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDeleteDocument(vehicle.id, document.id)} sx={{ color: 'text.secondary', '&:hover': { color: '#F6465D' } }}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>
            ))}
          </List>
        )}
      </Paper>

      <Menu anchorEl={vehicleMenu?.anchor} open={Boolean(vehicleMenu)} onClose={() => setVehicleMenu(null)}>
        <MenuItem onClick={() => vehicleMenu && handleDeleteVehicle(vehicleMenu.vehicleId)} sx={{ color: '#F6465D' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} /> Remove Vehicle
        </MenuItem>
      </Menu>

      {/* Add Vehicle */}
      <Dialog open={addVehicleOpen} onClose={() => setAddVehicleOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Vehicle</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Vehicle Number"
            placeholder="e.g. MH12AB1234"
            fullWidth
            value={newVehicleNumber}
            onChange={e => setNewVehicleNumber(e.target.value)}
            error={Boolean(vehicleError)}
            helperText={vehicleError}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddVehicleOpen(false)}>Cancel</Button>
          <Button onClick={handleAddVehicle} variant="contained" disabled={savingVehicle} sx={{ color: 'primary.contrastText', fontWeight: 700 }}>
            {savingVehicle ? 'Adding...' : 'Add Vehicle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Document */}
      <Dialog open={Boolean(docDialog)} onClose={() => setDocDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{docDialog?.document ? 'Edit Document' : 'Add Document'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Autocomplete
              freeSolo
              options={SUGGESTED_LABELS}
              value={docForm.label}
              onInputChange={(_e, value) => setDocForm(prev => ({ ...prev, label: value }))}
              renderInput={params => (
                <TextField {...params} autoFocus label="Document Name" placeholder="Insurance, PUC, or anything else" error={Boolean(docError) && !docForm.label.trim()} />
              )}
            />
            <TextField
              label="Expiry Date"
              type="date"
              fullWidth
              value={docForm.expiryDate}
              onChange={e => setDocForm(prev => ({ ...prev, expiryDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              error={Boolean(docError) && !docForm.expiryDate.trim()}
            />
            <TextField
              label="Remind me this many days before it expires"
              type="number"
              fullWidth
              value={docForm.reminderDaysBefore}
              onChange={e => setDocForm(prev => ({ ...prev, reminderDaysBefore: e.target.value }))}
              inputProps={{ min: 0 }}
              helperText={`Defaults to ${DEFAULT_REMINDER_DAYS} days if left blank`}
            />
            {docError && <Typography variant="body2" sx={{ color: '#F6465D' }}>{docError}</Typography>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocDialog(null)}>Cancel</Button>
          <Button onClick={handleSaveDocument} variant="contained" disabled={savingDoc} sx={{ color: 'primary.contrastText', fontWeight: 700 }}>
            {savingDoc ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentReminders;
