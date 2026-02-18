
export enum IntensityLevel {
  FRIENDLY = 'Friendly Reminder',
  FIRM = 'Firm Demand',
  FINAL = 'Final Notice'
}

export interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
}

export interface BusinessInfo {
  name: string;
  address: string;
  state: string;
  phone: string;
  email: string;
  website: string;
}

export interface CustomerInfo {
  name: string;
  address: string;
  contactPerson: string;
}

export interface InvoiceDetails {
  invoiceNumber: string;
  invoiceDate: string;
  originalDueDate: string;
  newDeadline: string;
  items: InvoiceItem[];
  lateFees: number;
  paymentInstructions: string;
  paymentLink?: string;
  paymentPhone?: string;
}

export interface LetterData {
  business: BusinessInfo;
  customer: CustomerInfo;
  invoice: InvoiceDetails;
  intensity: IntensityLevel;
}

export interface SubscriptionStatus {
  isPremium: boolean;
  creditsRemaining: number;
}
