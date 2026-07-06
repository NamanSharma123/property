// Database types for the property manager application

export interface Property {
  id: string;
  name: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  full_address?: string;
  type?: string;
  sub_type?: string;
  units: number;
  occupancy: number;
  purchase_price?: number;
  current_value?: number;
  monthly_rent?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Tenant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  property_id: string;
  propertyId?: string; // Alias for compatibility
  unit: string;
  lease_start: string;
  lease_end: string;
  leaseStart?: Date; // Alias for compatibility
  leaseEnd?: Date;
  monthly_rent: number;
  monthlyRent?: number; // Alias for compatibility
  status: 'active' | 'inactive' | 'pending' | 'evicted';
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  date: string | Date;
  property_id: string;
  propertyId?: string; // Alias for compatibility
  tenant_id?: string;
  tenantId?: number; // Alias for compatibility
  description: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'pending' | 'paid' | 'cancelled' | 'overdue';
  category_id?: string;
  categoryId?: string;
  receipt_url?: string;
  receiptUrl?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id: string;
  date: string | Date;
  property_id: string;
  propertyId?: number; // Alias for compatibility
  category_id?: string;
  categoryId?: number;
  description: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  receipt_url?: string;
  receiptUrl?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Document {
  id: string;
  name: string;
  property_id?: string;
  propertyId?: number;
  tenant_id?: string;
  tenantId?: number;
  type: 'lease' | 'invoice' | 'receipt' | 'other';
  url: string;
  uploaded_at?: string;
  uploadedAt?: Date;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'staff';
  uniqueId?: string;
  phone?: string;
  avatar?: string;
  isEmailVerified?: boolean;
  accountStatus?: string;
  lastLogin?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  description?: string;
  icon?: string;
  color?: string;
  is_system?: boolean;
  is_tax_deductible?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Session {
  email: string;
  name: string;
  uniqueId: string;
}