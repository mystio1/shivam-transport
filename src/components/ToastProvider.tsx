import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';
import type { SlideProps } from '@mui/material';

type ToastSeverity = 'success' | 'error' | 'info' | 'warning';
interface ToastState {
  open: boolean;
  message: string;
  severity: ToastSeverity;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

function SlideUp(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

// Transient, non-blocking feedback for actions that already have somewhere else to show a real
// error (a form's own inline Alert, say) — success toasts are what this is mainly for. Kept
// separate from the per-page inline `<Alert>` pattern already used for validation/error messages,
// which stay on screen until the user acts rather than auto-dismissing.
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ToastState>({ open: false, message: '', severity: 'success' });

  const show = useCallback((message: string, severity: ToastSeverity) => {
    setState({ open: true, message, severity });
  }, []);

  const api: ToastApi = {
    success: useCallback((message: string) => show(message, 'success'), [show]),
    error: useCallback((message: string) => show(message, 'error'), [show]),
    info: useCallback((message: string) => show(message, 'info'), [show]),
    warning: useCallback((message: string) => show(message, 'warning'), [show]),
  };

  const handleClose = () => setState((s) => ({ ...s, open: false }));

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={3500}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slots={{ transition: SlideUp }}
        sx={{ mb: 'env(safe-area-inset-bottom)' }}
      >
        <Alert
          onClose={handleClose}
          severity={state.severity}
          variant="filled"
          sx={{ fontWeight: 600, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', alignItems: 'center' }}
        >
          {state.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
