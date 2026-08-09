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
  email?: string;
  userCode?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppGroup {
  code: string;
  name: string;
  createdAt: string;
  frozen?: boolean;
}

// One row in the /support console's business list — a lightweight overview, not the full group
// record, so the support tool never has to load a business's actual customer/trip data just to
// show a directory of who exists.
export interface SupportBusinessSummary {
  code: string;
  name: string;
  createdAt: string;
  adminCount: number;
  driverCount: number;
  customerCount: number;
  tripCount: number;
  frozen: boolean;
  // `null` means unlimited (the default until support sets a cap).
  maxDrivers: number | null;
  maxAdmins: number | null;
  maxBillsPerDay: number | null;
  billsToday: number;
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
  // Free-text note on how a payment was received (e.g. "Cash via driver", "UPI to personal a/c")
  // — set from the Record Payment dialog, shown back wherever the trip's payment is displayed.
  paymentNote?: string;
  vehicleType: string;
  vehicleNumber?: string;
  materialType?: string;
  status?: TripStatus;
  rejectionReason?: string;
  submittedAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  // Set by the offline queue (src/utils/offlineQueue.ts) so a retried submission that actually
  // succeeded but lost its response can be recognized server-side instead of duplicated.
  clientRequestId?: string;
}

// A driver's request to change something on a trip that's already been approved (and so can no
// longer be edited directly — see Trip.status and the pending-only edit rule around it). An
// admin reviews the message and either applies the change themself or dismisses the request.
export type TripEditRequestStatus = 'pending' | 'resolved' | 'dismissed';

export interface TripEditRequest {
  id: string;
  groupCode?: string;
  tripId: string;
  driverId: string;
  driverName?: string;
  message: string;
  status: TripEditRequestStatus;
  createdAt: string;
  resolvedAt?: string;
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
  // Flank the company name on printed bills — left/right of "SHIVAM TRANSPORT" in the header.
  // Both slots share the same fixed aspect ratio (see src/utils/headerImage.ts) so the header
  // never looks lopsided whether one, both, or neither is set.
  headerLeftImageDataUrl: string;
  headerRightImageDataUrl: string;
  // UPI/payment scanner shown on the printed bill, right of "Amount in Words" below Net Payable.
  upiQrImageDataUrl: string;
  // Which bill type(s) it appears on — lets the admin scope it to GST bills, Non-GST bills, or
  // both, since not every business wants the same payment collection method on every invoice.
  upiQrShowOn: 'both' | 'gst' | 'non-gst';
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

// One expiry-tracked segment on a vehicle — Insurance and PUC are just the two suggested first;
// `label` is free text so the admin can add any number of other segments (Fitness Certificate,
// Permit, Road Tax, ...) the same way.
export interface VehicleDocument {
  id: string;
  label: string;
  expiryDate: string;
  reminderDaysBefore: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Vehicle {
  id: string;
  groupCode?: string;
  vehicleNumber: string;
  documents: VehicleDocument[];
  createdAt?: string;
  updatedAt?: string;
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
