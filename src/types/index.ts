export interface AdvancePayment {
  id: string;
  amount: number;
  note: string;
  date: string;
  createdAt: string;
  deleted?: boolean;
  deletedAt?: string;
  usedInBillNo?: string;
}

export interface Customer {
  id: string;
  groupCode?: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
  gstNumber?: string;
  advanceBalance?: number;
  advanceHistory?: AdvancePayment[];
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
  userCode?: string;
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
  driverCode?: string;
  date: string;
  pickupLocation: string;
  dropLocation: string;
  amount: number;
  advanceAmount?: number;
  isPaid: boolean;
  paidAmount?: number;
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

export interface BankAccount {
  id: string;
  label: string;
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  ifscCode: string;
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
  signatureDataUrl: string;
  bankName: string;
  bankBranch: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankAccounts: BankAccount[];
  publicServerUrl: string;
  nextInvoiceNumber: number;
}

export interface CustomerWithBalance extends Customer {
  balance: number;
}

export type TripInput = Omit<Trip, 'id' | 'status'> & {
  status?: TripStatus;
};

export interface SavedBillTripLine {
  tripId: string;
  date: string;
  pickupLocation: string;
  dropLocation: string;
  amount: number;
  paidAmount: number;
}

// A saved record of a generated bill — snapshots the trip lines and totals as they were at
// save time, so it stays accurate for reference even if the underlying trips are later edited.
export interface SavedBill {
  id: string;
  groupCode?: string;
  customerId: string;
  customerName: string;
  billNo: string;
  billDate: string;
  isGstBill: boolean;
  gstPercent: number;
  discount: number;
  subTotal: number;
  received: number;
  gstAmount: number;
  grandTotal: number;
  advanceApplied: number;
  netPayable: number;
  amountInWords: string;
  trips: SavedBillTripLine[];
  createdAt: string;
  createdBy?: string;
  deleted?: boolean;
  deletedAt?: string;
  // Snapshotted so the bill can be viewed/downloaded later exactly as it looked when saved,
  // even if the customer's contact info or the admin's bank accounts change afterward.
  customerPhone?: string;
  customerAddress?: string;
  customerGst?: string;
  bankName?: string;
  bankBranch?: string;
  accountNumber?: string;
  ifscCode?: string;
}
