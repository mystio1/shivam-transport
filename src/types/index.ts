export interface Customer {
  id: string;
  groupCode?: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
  gstNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type UserRole = 'admin' | 'driver';

export interface AppUser {
  id: string;
  groupCode: string;
  role: UserRole;
  name: string;
  phone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppGroup {
  code: string;
  name: string;
  createdAt: string;
}

export type TripStatus = 'pending' | 'approved' | 'rejected';

export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | '';

export interface Trip {
  id: string;
  groupCode?: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  driverId?: string;
  driverName?: string;
  date: string;
  pickupLocation: string;
  dropLocation: string;
  amount: number;
  advanceAmount?: number;
  isPaid: boolean;
  paymentMode?: PaymentMode;
  paidAt?: string;
  vehicleType: string;
  vehicleNumber?: string;
  materialType?: string;
  status?: TripStatus;
  rejectionReason?: string;
  submittedAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface Branding {
  companyName: string;
  tagline: string;
  proprietorName: string;
  phone1: string;
  phone2: string;
  address: string;
  gstNumber: string;
  footerNote: string;
  primaryColor: string;
  accentColor: string;
  logoDataUrl: string;
  bankName: string;
  bankBranch: string;
  bankAccountNumber: string;
  bankIfsc: string;
  publicServerUrl: string;
  nextInvoiceNumber: number;
}

export interface CustomerWithBalance extends Customer {
  balance: number;
}

export type TripInput = Omit<Trip, 'id' | 'status'> & {
  status?: TripStatus;
};
