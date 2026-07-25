import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  AppGroup,
  AppUser,
  Branding,
  Customer,
  CustomerWithBalance,
  SavedBill,
  Trip,
  TripInput,
} from '../types';
import type { PaletteMode } from '@mui/material';
import { enqueueTrip, getQueueCount, getQueuedTrips, removeQueuedTrip } from '../utils/offlineQueue';

const TOKEN_KEY = 'shivam_session_token';
const SERVER_URL_KEY = 'shivam_server_url';

const BUILT_IN_DEFAULT_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.port !== '5173'
    ? ''
    : 'http://localhost:4000');

// The server address a driver/admin's phone talks to is resolved at RUNTIME (not baked into
// the build) so the same installed app can be pointed at whichever server the admin runs —
// e.g. a Cloudflare Tunnel URL shared via the join screen. Falls back to the build-time default.
function getApiBase(): string {
  if (typeof window === 'undefined') return BUILT_IN_DEFAULT_BASE;
  const stored = window.localStorage.getItem(SERVER_URL_KEY);
  return (stored && stored.trim()) || BUILT_IN_DEFAULT_BASE;
}

function setApiBase(url: string) {
  if (typeof window === 'undefined') return;
  const trimmed = url.trim().replace(/\/+$/, '');
  if (trimmed) window.localStorage.setItem(SERVER_URL_KEY, trimmed);
  else window.localStorage.removeItem(SERVER_URL_KEY);
}

export interface SignupInput {
  name: string;
  phone: string;
  password: string;
  role: 'admin' | 'driver';
  groupCode?: string;
  groupName?: string;
}

export interface LoginInput {
  phone: string;
  password: string;
  groupCode: string;
}

interface AppContextType {
  customers: Customer[];
  trips: Trip[];
  pendingTrips: Trip[];
  allTrips: Trip[];
  drivers: AppUser[];
  getDriverTrips: (driverId: string) => Trip[];
  user: AppUser | null;
  group: AppGroup | null;
  branding: Branding | null;
  authLoading: boolean;
  isLoading: boolean;
  addCustomer: (customer: Omit<Customer, 'id'> | string) => Promise<string>;
  addCustomerWithCallback: (customer: Omit<Customer, 'id'>, callback: (id: string) => void) => void;
  updateCustomer: (customerId: string, updates: Partial<Customer>) => Promise<void>;
  addCustomerAdvance: (customerId: string, amount: number, note?: string, date?: string) => Promise<void>;
  deleteCustomerAdvance: (customerId: string, advanceId: string) => Promise<void>;
  permanentlyDeleteCustomerAdvance: (customerId: string, advanceId: string) => Promise<void>;
  mergeCustomer: (sourceId: string, intoCustomerId: string) => Promise<void>;
  recordTripPayment: (
    tripId: string,
    input: { amount?: number; fullyPaid?: boolean; fromAdvance?: boolean; paymentMode?: string },
  ) => Promise<void>;
  addTrip: (trip: Omit<Trip, 'id'>) => Promise<string>;
  submitDriverTrip: (trip: Omit<Trip, 'id' | 'customerId'> & { customerId?: string }) => Promise<{ queued: boolean }>;
  pendingSyncCount: number;
  isSyncingOffline: boolean;
  flushPendingTrips: () => Promise<void>;
  approveTrip: (tripId: string) => Promise<void>;
  rejectTrip: (tripId: string, reason: string) => Promise<void>;
  updateTrip: (tripId: string, updates: Partial<Trip>) => Promise<void>;
  getCustomerTrips: (customerId: string) => Trip[];
  getFilteredTrips: (date: string | null) => Trip[];
  deleteCustomer: (customerId: string) => Promise<void>;
  searchCustomers: (query: string) => CustomerWithBalance[];
  updateTripPaymentStatus: (tripId: string, isPaid: boolean, paymentMode?: string) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<{ groupCode: string | null }>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
  updateBranding: (updates: Partial<Branding>) => Promise<void>;
  getNextInvoiceNumber: () => Promise<number>;
  sendBillEmail: (to: string, subject: string, text: string) => Promise<void>;
  serverUrl: string;
  saveServerUrl: (url: string) => void;
  themeMode: PaletteMode;
  toggleThemeMode: () => void;
  bills: SavedBill[];
  saveBill: (input: Omit<SavedBill, 'id' | 'groupCode' | 'createdAt' | 'createdBy' | 'customerName'>) => Promise<SavedBill>;
  deleteBill: (billId: string) => Promise<void>;
  permanentlyDeleteBill: (billId: string) => Promise<void>;
  restoreBackup: (customers: unknown[], trips: unknown[]) => Promise<{ customersImported: number; tripsImported: number }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

// Thrown when the server was reached but rejected the request (validation, auth, etc.).
// Any OTHER error out of apiRequest (fetch itself throwing) means the server was unreachable —
// that distinction is what lets submitDriverTrip decide "queue for later" vs "show the error now".
export class ApiError extends Error {}

async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const storedToken = options.token !== undefined ? options.token : localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${getApiBase()}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError((data as { message?: string }).message || 'Request failed');
  }
  return data as T;
}

function approvedTrip(trip: Trip) {
  return (trip.status || 'approved') === 'approved';
}

function normalizeTripInput(tripData: Omit<Trip, 'id'>): TripInput {
  return {
    ...tripData,
    amount: Number(tripData.amount) || 0,
    advanceAmount: Number(tripData.advanceAmount || 0),
  };
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allTrips, setAllTrips]   = useState<Trip[]>([]);
  const [drivers, setDrivers]     = useState<AppUser[]>([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [themeMode, setThemeMode]   = useState<PaletteMode>('dark');
  const [user, setUser]   = useState<AppUser | null>(null);
  const [group, setGroup] = useState<AppGroup | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [serverUrl, setServerUrlState] = useState<string>(getApiBase());
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => getQueueCount());
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [bills, setBills] = useState<SavedBill[]>([]);

  const trips = useMemo(() => allTrips.filter(approvedTrip), [allTrips]);
  const pendingTrips = useMemo(
    () => allTrips.filter(t => t.status === 'pending'),
    [allTrips],
  );

  // ── Token helpers ──────────────────────────────────────────────────────
  const getToken = useCallback(() => localStorage.getItem(TOKEN_KEY), []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setGroup(null);
    setCustomers([]);
    setAllTrips([]);
    setBranding(null);
    setDrivers([]);
    setBills([]);
  }, []);

  // ── Data loading ───────────────────────────────────────────────────────
  const refreshData = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setIsLoading(true);
    try {
      const [customersResp, tripsResp, brandingResp, driversResp, billsResp] = await Promise.all([
        apiRequest<{ customers: Customer[] }>('/api/customers'),
        apiRequest<{ trips: Trip[] }>('/api/trips'),
        apiRequest<{ branding: Branding }>('/api/branding').catch(() => null),
        apiRequest<{ drivers: AppUser[] }>('/api/drivers').catch(() => null),
        apiRequest<{ bills: SavedBill[] }>('/api/bills').catch(() => null),
      ]);
      setCustomers(customersResp.customers);
      setAllTrips(tripsResp.trips);
      if (brandingResp) setBranding(brandingResp.branding);
      if (driversResp) setDrivers(driversResp.drivers);
      if (billsResp) setBills(billsResp.bills);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  // ── Restore session on mount ───────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setAuthLoading(false);
      return;
    }
    apiRequest<{ user: AppUser; group: AppGroup }>('/api/me')
      .then(me => {
        setUser(me.user);
        setGroup(me.group);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY); // expired or invalid
      })
      .finally(() => setAuthLoading(false));
  }, []);

  // ── Refresh data when user logs in ────────────────────────────────────
  useEffect(() => {
    if (user) refreshData();
  }, [user, refreshData]);

  // ── Real-time updates via SSE ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;
    const events = new EventSource(`${getApiBase()}/api/events?token=${encodeURIComponent(token)}`);
    const handleChange = () => refreshData();
    events.addEventListener('data-changed',   handleChange);
    events.addEventListener('trip-submitted', handleChange);
    events.addEventListener('trip-updated',   handleChange);
    events.onerror = () => events.close();
    return () => events.close();
  }, [user, getToken, refreshData]);

  // ── Auth actions ───────────────────────────────────────────────────────
  const login = async (input: LoginInput): Promise<void> => {
    const result = await apiRequest<{ token: string; user: AppUser; group: AppGroup }>(
      '/api/auth/login',
      { method: 'POST', body: input, token: null },
    );
    localStorage.setItem(TOKEN_KEY, result.token);
    setUser(result.user);
    setGroup(result.group);
  };

  const signup = async (input: SignupInput): Promise<{ groupCode: string | null }> => {
    const result = await apiRequest<{ token: string; user: AppUser; group: AppGroup }>(
      '/api/auth/signup',
      { method: 'POST', body: input, token: null },
    );
    localStorage.setItem(TOKEN_KEY, result.token);
    setUser(result.user);
    setGroup(result.group);
    return { groupCode: input.role === 'admin' ? result.group.code : null };
  };

  const logout = async (): Promise<void> => {
    clearSession();
  };

  // ── Customer actions ───────────────────────────────────────────────────
  const addCustomer = async (customerData: Omit<Customer, 'id'> | string): Promise<string> => {
    const body =
      typeof customerData === 'string'
        ? { name: customerData, phone: '', address: '' }
        : customerData;
    const response = await apiRequest<{ customer: Customer }>('/api/customers', {
      method: 'POST',
      body,
    });
    await refreshData();
    return response.customer.id;
  };

  const addCustomerWithCallback = (
    customerData: Omit<Customer, 'id'>,
    callback: (id: string) => void,
  ) => {
    addCustomer(customerData)
      .then(callback)
      .catch(err => console.error('Error adding customer:', err));
  };

  const updateCustomer = async (customerId: string, updates: Partial<Customer>) => {
    await apiRequest<{ customer: Customer }>(`/api/customers/${customerId}`, {
      method: 'PATCH',
      body: updates,
    });
    await refreshData();
  };

  const deleteCustomer = async (customerId: string) => {
    await apiRequest<{ ok: boolean }>(`/api/customers/${customerId}`, { method: 'DELETE' });
    await refreshData();
  };

  const addCustomerAdvance = async (customerId: string, amount: number, note?: string, date?: string) => {
    await apiRequest<{ customer: Customer }>(`/api/customers/${customerId}/advance`, {
      method: 'POST',
      body: { amount, note, date },
    });
    await refreshData();
  };

  const deleteCustomerAdvance = async (customerId: string, advanceId: string) => {
    await apiRequest<{ customer: Customer }>(`/api/customers/${customerId}/advance/${advanceId}`, {
      method: 'DELETE',
    });
    await refreshData();
  };

  const permanentlyDeleteCustomerAdvance = async (customerId: string, advanceId: string) => {
    await apiRequest<{ customer: Customer }>(`/api/customers/${customerId}/advance/${advanceId}/permanent`, {
      method: 'DELETE',
    });
    await refreshData();
  };

  const mergeCustomer = async (sourceId: string, intoCustomerId: string) => {
    await apiRequest<{ customer: Customer }>(`/api/customers/${sourceId}/merge`, {
      method: 'POST',
      body: { intoCustomerId },
    });
    await refreshData();
  };

  // ── Trip actions ───────────────────────────────────────────────────────
  const addTrip = async (tripData: Omit<Trip, 'id'>): Promise<string> => {
    const customer = customers.find(c => c.id === tripData.customerId);
    const response = await apiRequest<{ trip: Trip }>('/api/trips', {
      method: 'POST',
      body: normalizeTripInput({
        ...tripData,
        customerName: tripData.customerName || customer?.name || '',
        customerPhone: tripData.customerPhone || customer?.phone || '',
        customerAddress: tripData.customerAddress || customer?.address || '',
      }),
    });
    await refreshData();
    return response.trip.id;
  };

  // Sends every locally-queued trip (saved when a driver submitted with no connection to the
  // server). Stops at the first item that still fails due to no connection — those stay queued
  // and we'll try the whole batch again on the next trigger (reconnect event / periodic timer /
  // next successful submission). A trip the server actively rejects (ApiError) is also left in
  // place rather than silently discarded, since the driver's data shouldn't just vanish.
  const flushPendingTrips = useCallback(async () => {
    const queue = getQueuedTrips();
    if (!queue.length) return;
    setIsSyncingOffline(true);
    let sentAny = false;
    try {
      for (const item of queue) {
        try {
          await apiRequest<{ trip: Trip }>('/api/trips', { method: 'POST', body: item.payload });
          removeQueuedTrip(item.localId);
          sentAny = true;
        } catch {
          break; // still unreachable (or rejected) — stop this round, try again later
        }
      }
    } finally {
      setPendingSyncCount(getQueueCount());
      setIsSyncingOffline(false);
    }
    if (sentAny) await refreshData();
  }, [refreshData]);

  const submitDriverTrip = async (
    tripData: Omit<Trip, 'id' | 'customerId'> & { customerId?: string },
  ): Promise<{ queued: boolean }> => {
    const body = {
      ...tripData,
      amount: Number(tripData.amount) || 0,
      advanceAmount: Number(tripData.advanceAmount || 0),
    };
    try {
      await apiRequest<{ trip: Trip }>('/api/trips', { method: 'POST', body });
      await refreshData();
      flushPendingTrips(); // opportunistically clear out any older queued trips too
      return { queued: false };
    } catch (error) {
      if (error instanceof ApiError) throw error; // server reached and rejected it — surface now
      enqueueTrip(body); // no connection — save it and let background sync handle it
      setPendingSyncCount(getQueueCount());
      return { queued: true };
    }
  };

  // ── Offline queue: retry on reconnect, and keep nudging it periodically ────
  useEffect(() => {
    if (!user) return;
    flushPendingTrips();
    const handleOnline = () => flushPendingTrips();
    window.addEventListener('online', handleOnline);
    const interval = window.setInterval(() => flushPendingTrips(), 20000);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.clearInterval(interval);
    };
  }, [user, flushPendingTrips]);

  const updateTrip = async (tripId: string, updates: Partial<Trip>) => {
    await apiRequest<{ trip: Trip }>(`/api/trips/${tripId}`, {
      method: 'PATCH',
      body: updates,
    });
    await refreshData();
  };

  const approveTrip = async (tripId: string) => {
    await apiRequest<{ trip: Trip }>(`/api/trips/${tripId}/approve`, { method: 'POST' });
    await refreshData();
  };

  const rejectTrip = async (tripId: string, reason: string) => {
    await apiRequest<{ trip: Trip }>(`/api/trips/${tripId}/reject`, {
      method: 'POST',
      body: { reason },
    });
    await refreshData();
  };

  const updateTripPaymentStatus = async (tripId: string, isPaid: boolean, paymentMode?: string) => {
    await updateTrip(tripId, { isPaid, ...(paymentMode ? { paymentMode } : {}) } as Partial<Trip>);
  };

  const recordTripPayment = async (
    tripId: string,
    input: { amount?: number; fullyPaid?: boolean; fromAdvance?: boolean; paymentMode?: string },
  ) => {
    await apiRequest<{ trip: Trip }>(`/api/trips/${tripId}/payment`, {
      method: 'POST',
      body: input,
    });
    await refreshData();
  };

  // ── Branding / bill theme ───────────────────────────────────────────────
  const updateBranding = async (updates: Partial<Branding>) => {
    const response = await apiRequest<{ branding: Branding }>('/api/branding', {
      method: 'PUT',
      body: updates,
    });
    setBranding(response.branding);
  };

  const getNextInvoiceNumber = async (): Promise<number> => {
    const response = await apiRequest<{ invoiceNumber: number }>('/api/branding/next-invoice-number', {
      method: 'POST',
    });
    return response.invoiceNumber;
  };

  // ── Saved bills ("My Bills") ─────────────────────────────────────────────
  const saveBill = async (
    input: Omit<SavedBill, 'id' | 'groupCode' | 'createdAt' | 'createdBy' | 'customerName'>,
  ): Promise<SavedBill> => {
    const response = await apiRequest<{ bill: SavedBill }>('/api/bills', {
      method: 'POST',
      body: input,
    });
    setBills(prev => [response.bill, ...prev]);
    return response.bill;
  };

  const deleteBill = async (billId: string) => {
    const response = await apiRequest<{ bill: SavedBill }>(`/api/bills/${billId}`, { method: 'DELETE' });
    setBills(prev => prev.map(b => (b.id === billId ? response.bill : b)));
  };

  const permanentlyDeleteBill = async (billId: string) => {
    await apiRequest<{ ok: boolean }>(`/api/bills/${billId}/permanent`, { method: 'DELETE' });
    setBills(prev => prev.filter(b => b.id !== billId));
  };

  // ── Restore from a downloaded backup file ───────────────────────────────
  const restoreBackup = async (customers: unknown[], trips: unknown[]) => {
    const response = await apiRequest<{ customersImported: number; tripsImported: number }>('/api/restore', {
      method: 'POST',
      body: { customers, trips },
    });
    await refreshData();
    return response;
  };

  // ── Notifications ───────────────────────────────────────────────────────
  const sendBillEmail = async (to: string, subject: string, text: string) => {
    await apiRequest<{ ok: boolean }>('/api/notify/email', {
      method: 'POST',
      body: { to, subject, text },
    });
  };

  // ── Server address (which machine this app talks to) ───────────────────
  const saveServerUrl = (url: string) => {
    setApiBase(url);
    setServerUrlState(getApiBase());
  };

  // ── Query helpers ──────────────────────────────────────────────────────
  const getCustomerTrips = (customerId: string): Trip[] =>
    trips.filter(t => t.customerId === customerId);

  const getDriverTrips = (driverId: string): Trip[] =>
    trips.filter(t => t.driverId === driverId);

  const getFilteredTrips = (date: string | null): Trip[] => {
    if (!date) return trips;
    return trips.filter(t => t.date.slice(0, 10) === date.slice(0, 10));
  };

  const searchCustomers = (query: string): CustomerWithBalance[] => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return customers
      .filter(c => c.name.toLowerCase().includes(lowerQuery) || c.phone.includes(query))
      .map(customer => {
        const customerTrips = getCustomerTrips(customer.id);
        const totalAmount = customerTrips.reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const paidAmount  = customerTrips
          .filter(t => t.isPaid)
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        return { ...customer, balance: totalAmount - paidAmount };
      });
  };

  const toggleThemeMode = () => setThemeMode(prev => (prev === 'light' ? 'dark' : 'light'));

  return (
    <AppContext.Provider
      value={{
        customers, trips, pendingTrips, allTrips,
        drivers, getDriverTrips,
        user, group, branding,
        authLoading, isLoading,
        addCustomer, addCustomerWithCallback, updateCustomer,
        addCustomerAdvance, deleteCustomerAdvance, permanentlyDeleteCustomerAdvance, mergeCustomer,
        addTrip, submitDriverTrip,
        pendingSyncCount, isSyncingOffline, flushPendingTrips,
        approveTrip, rejectTrip, updateTrip, recordTripPayment,
        getCustomerTrips, getFilteredTrips,
        searchCustomers, updateTripPaymentStatus,
        deleteCustomer,
        updateBranding, getNextInvoiceNumber, sendBillEmail,
        bills, saveBill, deleteBill, permanentlyDeleteBill, restoreBackup,
        serverUrl, saveServerUrl,
        themeMode, toggleThemeMode,
        login, signup, logout,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
}
