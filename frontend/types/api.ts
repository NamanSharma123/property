// API response types for the property manager application

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PropertyResponse {
  id: number;
  name: string;
  address: string;
  units: number;
  occupancy: number;
  tenants: TenantResponse[];
  transactions: TransactionResponse[];
  expenses: ExpenseResponse[];
}

export interface TenantResponse {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  property: {
    id: number;
    name: string;
  };
  unit: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  status: 'active' | 'inactive' | 'pending';
  payments: TransactionResponse[];
}

export interface TransactionResponse {
  id: number;
  date: string;
  property: {
    id: number;
    name: string;
  };
  tenant?: {
    id: number;
    name: string;
  };
  description: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'pending' | 'paid' | 'cancelled';
  category?: {
    id: number;
    name: string;
  };
}

export interface ExpenseResponse {
  id: number;
  date: string;
  property: {
    id: number;
    name: string;
  };
  category: {
    id: number;
    name: string;
  };
  description: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
}

export interface DocumentResponse {
  id: number;
  name: string;
  property?: {
    id: number;
    name: string;
  };
  tenant?: {
    id: number;
    name: string;
  };
  type: 'lease' | 'invoice' | 'receipt' | 'other';
  url: string;
  uploadedAt: string;
}

export interface ReportResponse {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  incomeBreakdown: {
    category: string;
    amount: number;
  }[];
  expenseBreakdown: {
    category: string;
    amount: number;
  }[];
}

export interface AuthResponse {
  user: {
    id: number;
    name: string;
    email: string;
    role: 'manager' | 'staff';
  };
  token: string;
}