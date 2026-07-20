'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Building2,
    Info,
    FileText,
    Plus,
    RotateCcw,
    Eye,
    AlertCircle
} from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { propertiesApi, transactionsApi } from '@/lib/api';

interface LoanDocument {
    name: string;
    size: number;
    url?: string;
}

interface LoanBankDetail {
    id?: string;
    bankName?: string;
    loanAmount?: number;
    loanAllocationPercent?: string;
    document?: LoanDocument | null;
}

interface PropertyData {
    id: string;
    name: string;
    type: string;
    usage?: string;
    sub_type?: string;
    status: string;
    full_address?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
    };
    ownership?: string;
    ownershipDetails?: string;
    hasDepreciation?: boolean;
    depreciation_schedule?: string;
    purchase_price?: number;
    current_value?: number;
    monthly_rent?: number;
    // The API serializes DB columns as-is (snake_case) — this is a real JSON
    // array/object already, not a JSON string, despite the "Details" naming
    // suggesting otherwise.
    loan_details?: LoanBankDetail[] | LoanBankDetail | Record<string, never>;
    connectedBank?: string;
}

interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: string;
    date: string;
    category_name?: string;
    transactionSource?: string;
    created_at?: string;
}

interface PropertyDashboardProps {
    propertyId: string;
}

// Financial Card Component
const FinancialCard = ({
    title,
    value,
    isNegative = false,
    isHighlight = false,
    tooltip
}: {
    title: string;
    value: string | number;
    icon?: React.ElementType;
    isNegative?: boolean;
    isHighlight?: boolean;
    tooltip?: string;
}) => {
    const formattedValue = typeof value === 'number'
        ? `$${value.toLocaleString()}`
        : value;

    return (
        <div className={`bg-white rounded-xl border border-gray-200 p-4 ${isHighlight ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200' : ''}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">{title}</span>
                {tooltip && (
                    <div className="relative group">
                        <Info size={14} className="text-gray-400 cursor-help" />
                        <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {tooltip}
                        </div>
                    </div>
                )}
            </div>
            <div className={`text-xl font-bold ${isNegative ? 'text-red-600' : isHighlight ? 'text-amber-600' : 'text-gray-900'}`}>
                {isNegative && typeof value === 'number' && value > 0 ? '-' : ''}{formattedValue}
            </div>
        </div>
    );
};

// Tab Component
const Tab = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${active
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
    >
        {label}
    </button>
);

export default function PropertyDashboard({ propertyId }: PropertyDashboardProps) {
    const router = useRouter();
    const [property, setProperty] = useState<PropertyData | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('transaction');
    const [filters, setFilters] = useState<{
        fromDate: string;
        toDate: string;
        source: string;
        category: string[];
    }>({
        fromDate: '',
        toDate: '',
        source: '',
        category: [],
    });

    // Calculate financial metrics - ensure amounts are parsed as numbers
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (parseFloat(String(t.amount)) || 0), 0);

    const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (parseFloat(String(t.amount)) || 0), 0);

    const netIncome = income - expenses;
    const marketValue = parseFloat(String(property?.current_value)) || parseFloat(String(property?.purchase_price)) || 0;

    // Bank name mapping (value to label)
    const BANKS: Record<string, string> = {
        'commonwealth': 'CBA',
        'westpac': 'WBC',
        'anz': 'ANZ',
        'nab': 'NAB',
        'macquarie': 'MAC',
        'ing': 'ING',
        'other': 'OTH',
    };

    // Parse loan details and extract bank info
    let loanAmount = 0;
    let netEquity = marketValue;
    let connectedBankNames: string[] = [];
    try {
        // Already a real array/object from the API (DB JSONField serialized
        // as-is) — not a JSON string, so no JSON.parse here.
        const loanData = property?.loan_details;
        if (loanData) {
            // Handle array of banks (multiple loans)
            if (Array.isArray(loanData)) {
                loanAmount = loanData.reduce((sum: number, loan: LoanBankDetail) => {
                    const amount = loan.loanAmount || (loan.loanAllocationPercent ? parseFloat(loan.loanAllocationPercent) : 0);
                    return sum + amount;
                }, 0);
                connectedBankNames = loanData
                    .filter((loan: LoanBankDetail) => loan.bankName && loan.bankName.trim() !== '')
                    .map((loan: LoanBankDetail) => BANKS[loan.bankName!] || loan.bankName!.toUpperCase().substring(0, 3));
            } else if ('bankName' in loanData && loanData.bankName && loanData.bankName.trim() !== '') {
                if (loanData.loanAmount) {
                    loanAmount = loanData.loanAmount || 0;
                }
                connectedBankNames = [BANKS[loanData.bankName] || loanData.bankName.toUpperCase().substring(0, 3)];
            }
            netEquity = marketValue - loanAmount;
        }
    } catch { }

    const purchaseCost = property?.purchase_price || 0;

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch property details
                const propResponse = await propertiesApi.getOne(propertyId);
                if (propResponse.success && propResponse.data) {
                    setProperty((propResponse.data as { property: PropertyData }).property);
                }

                // Fetch transactions for this property
                const transResponse = await transactionsApi.getAll({ propertyId, limit: 100 });
                if (transResponse.success && transResponse.data) {
                    const data = transResponse.data as { transactions: Transaction[] };
                    setTransactions(data.transactions || []);
                }
            } catch (error) {
                console.error('Failed to fetch property data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (propertyId) {
            fetchData();
        }
    }, [propertyId]);

    const handleResetFilters = () => {
        setFilters({
            fromDate: '',
            toDate: '',
            source: '',
            category: [],
        });
    };

    // Date filter validation - auto-correct if from > to
    const handleFromDateChange = (value: string) => {
        if (filters.toDate && value > filters.toDate) {
            // If from date is after to date, set to date to from date
            setFilters(prev => ({ ...prev, fromDate: value, toDate: value }));
        } else {
            setFilters(prev => ({ ...prev, fromDate: value }));
        }
    };

    const handleToDateChange = (value: string) => {
        if (filters.fromDate && value < filters.fromDate) {
            // If to date is before from date, set from date to to date
            setFilters(prev => ({ ...prev, toDate: value, fromDate: value }));
        } else {
            setFilters(prev => ({ ...prev, toDate: value }));
        }
    };

    // Badge style - black text on gray background, rectangular
    const getBadgeStyle = () => {
        return 'bg-gray-100 text-gray-900 border border-gray-300';
    };

    // Map kebab-case category names to human-readable labels
    const categoryLabels: Record<string, string> = {
        // Income
        'rental-income': 'Rental Income',
        'other-rental-income': 'Other rental related income',
        'variable-outgoings-received': 'Variable Outgoings Received',

        // Expense
        'council-rates': 'Council rates',
        'water-rates': 'Water Rates',
        'gardening': 'Gardening',
        'accounting-legal': 'Accounting & Legal Expense',
        'pest-control': 'Pest Control',
        'management-fees': 'Management fees',
        'property-agent-fees': 'Property agent other fees',
        'adjustment-at-purchase': 'Adjustment at purchase',
        'gas-electricity': 'Gas and Electricity',
        'repairs-maintenance': 'Repair & Maintenance',
        'land-tax': 'Land Tax',
        'sundry-rental-expenses': 'Sundry rental expenses',
        'depreciation': 'Depreciation (from Schedule)',
        'interest-on-loans': 'Interest on loans',
        'loan-setup-cost': 'Loan Set Up Cost',
        'lmi': 'LMI (Lender Mortgage Insurance)',
        'bank-fees': 'Bank Fees',
        'insurance': 'Insurance',
        'compliance-testing': 'Compliance & Testing',
        'advertising': 'Advertising for Tenant',
        'body-corporate': 'Body Corporate Fees',
        'borrowing-expenses': 'Borrowing Expenses',
        'cleaning': 'Cleaning',
        'variable-outgoings-paid': 'Variable Outgoings Paid',
        'water-usage': 'Water Usage',
        'utility-levy': 'Utility Levy',
        'internet': 'Internet',

        // Cost
        'purchase-cost': 'Purchase Cost',
        'stamp-duty': 'Stamp Duty',
        'conveyancer-fees': 'Conveyancer Fees',

        // Fallback
        'other': 'Other',
    };

    // Helper to get human-readable category label
    const getCategoryLabel = (categoryName: string | undefined): string => {
        if (!categoryName) return 'Unknown';
        return categoryLabels[categoryName] || categoryName;
    };

    // Parse ownership
    let ownershipName = 'N/A';
    try {
        if (property?.ownershipDetails) {
            const ownership = JSON.parse(property.ownershipDetails);
            ownershipName = ownership.entityName || ownership.trusteeName || property.ownership || 'N/A';
        } else if (property?.ownership) {
            ownershipName = property.ownership;
        }
    } catch { }

    // Monthly rental income chart data (mock for now)
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const rentalData = months.map(() => Math.random() * 0.5);

    const tabs = [
        { id: 'pending', label: 'Pending Tasks' },
        { id: 'transaction', label: 'Transaction' },
        { id: 'document', label: 'Document' },
        { id: 'loan', label: 'Loan' },
        { id: 'report', label: 'Report' },
        { id: 'depreciation', label: 'Depreciation' },
        { id: 'ownership', label: 'Ownership' },
    ];

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-6">
                    <div className="h-24 bg-gray-200 rounded-xl"></div>
                    <div className="grid grid-cols-3 gap-4">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
                        ))}
                    </div>
                    <div className="h-64 bg-gray-200 rounded-xl"></div>
                </div>
            </div>
        );
    }

    if (!property) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-4 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Building2 className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Property Not Found</h2>
                    <p className="text-gray-500 mb-6">
                        This property may have been deleted or you don&apos;t have permission to view it.
                    </p>
                    <button
                        onClick={() => router.push('/dashboard/property')}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Back to Properties
                    </button>
                </div>
            </div>
        );
    }

    // Helper to truncate long property names
    const truncateName = (name: string, maxLength: number = 50) => {
        if (!name) return 'Unnamed Property';
        if (name.length <= maxLength) return name;
        return name.substring(0, maxLength - 3) + '...';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="px-6 py-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <button
                                onClick={() => router.push('/dashboard/property')}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
                            >
                                <ArrowLeft size={20} className="text-gray-600" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <Building2 className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h1
                                            className="text-xl font-bold text-gray-900 max-w-md truncate"
                                            title={property.name}
                                        >
                                            {truncateName(property.name)}
                                        </h1>
                                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded ${getBadgeStyle()}`}>
                                            {property.type}
                                        </span>
                                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded ${getBadgeStyle()}`}>
                                            {property.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {property.full_address || `${property.address?.street}, ${property.address?.city} ${property.address?.state} ${property.address?.zipCode}`}
                                    </p>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                        <span>Depreciation: <strong>{property.hasDepreciation ? (property.depreciation_schedule || 'Yes') : 'N/A'}</strong></span>
                                        <span>Ownership: <strong>{ownershipName}</strong></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Connected Banks */}
                        <div className="text-right">
                            <p className="text-sm text-gray-500 mb-2">Connected Banks</p>
                            <div className="flex items-center justify-end gap-2">
                                {connectedBankNames.length > 0 ? (
                                    connectedBankNames.map((bankName, idx) => (
                                        <div key={idx} className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                            <span className="text-white text-[10px] font-bold uppercase">
                                                {bankName.substring(0, 3).toUpperCase()}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-sm text-gray-400">No bank connected</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Metrics */}
            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Financial Cards */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* First Row */}
                        <div className="grid grid-cols-3 gap-4">
                            <FinancialCard
                                title="Net Income"
                                value={netIncome}
                                isNegative={netIncome < 0}
                                tooltip="Total income minus total expenses"
                            />
                            <FinancialCard
                                title="Rent+"
                                value={income || 0}
                                tooltip="Total rental income"
                            />
                            <FinancialCard
                                title="Expense"
                                value={expenses}
                                tooltip="Total expenses"
                            />
                        </div>

                        {/* Second Row */}
                        <div className="grid grid-cols-3 gap-4">
                            <FinancialCard
                                title="Market Value"
                                value={marketValue}
                                tooltip="Current market value"
                            />
                            <FinancialCard
                                title="Loan"
                                value={loanAmount}
                                isHighlight={loanAmount > 0}
                                tooltip="Outstanding loan amount"
                            />
                            <FinancialCard
                                title="Net Equity"
                                value={netEquity}
                                tooltip="Market value minus loan"
                            />
                        </div>

                        {/* Third Row */}
                        <div className="grid grid-cols-3 gap-4">
                            <FinancialCard
                                title="Division 40"
                                value={0}
                                tooltip="Division 40 depreciation"
                            />
                            <FinancialCard
                                title="Division 43"
                                value={0}
                                tooltip="Division 43 depreciation"
                            />
                            <FinancialCard
                                title="Purchase Cost"
                                value={purchaseCost || 'N/A'}
                                tooltip="Original purchase price"
                            />
                        </div>
                    </div>

                    {/* Right: Chart */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-4">Rental Income (FY 25-26)</h3>
                        <div className="h-48 flex items-end justify-between gap-1">
                            {months.map((month, i) => (
                                <div key={month} className="flex-1 flex flex-col items-center">
                                    <div
                                        className="w-full bg-blue-100 rounded-t"
                                        style={{ height: `${rentalData[i] * 100}%`, minHeight: '4px' }}
                                    ></div>
                                    <span className="text-[10px] text-gray-400 mt-1">{month}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-6 border-b border-gray-200">
                    <div className="flex gap-2 overflow-x-auto">
                        {tabs.map(tab => (
                            <Tab
                                key={tab.id}
                                label={tab.label}
                                active={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Transactions Section */}
                {activeTab === 'transaction' && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
                                <p className="text-sm text-gray-500">List of all the transactions</p>
                            </div>
                            <button
                                onClick={() => router.push(`/dashboard/ocr?propertyId=${propertyId}`)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus size={16} />
                                Add Income / Expense
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">From Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={filters.fromDate}
                                        onChange={(e) => handleFromDateChange(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">To Date</label>
                                <input
                                    type="date"
                                    value={filters.toDate}
                                    onChange={(e) => handleToDateChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Transaction Source</label>
                                <select
                                    value={filters.source}
                                    onChange={(e) => setFilters(f => ({ ...f, source: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- All Sources --</option>
                                    <option value="Manual Entry">Manual Entry</option>
                                    <option value="OCR Upload">OCR Upload</option>
                                    <option value="Bank Feed">Bank Feed</option>
                                    <option value="Rental Summary">Rental Summary</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Category</label>
                                <MultiSelect
                                    options={Array.from(new Set(transactions.map(t => t.category_name).filter((c): c is string => !!c))).map(cat => ({
                                        value: cat,
                                        label: getCategoryLabel(cat)
                                    }))}
                                    selected={filters.category}
                                    onChange={(selected) => setFilters(f => ({ ...f, category: selected }))}
                                    placeholder="Choose Category"
                                    className="bg-white border-gray-300"
                                    showSearch={true}
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={handleResetFilters}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    <RotateCcw size={14} />
                                    Reset
                                </button>
                            </div>
                        </div>

                        {/* Transactions Table */}
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-blue-600 text-white">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Transaction Source</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                                        <th className="px-4 py-3 text-center text-sm font-medium">Edit/View</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(() => {
                                        // Apply filters to transactions
                                        let filteredTransactions = transactions;

                                        if (filters.fromDate) {
                                            filteredTransactions = filteredTransactions.filter(t =>
                                                new Date(t.date) >= new Date(filters.fromDate)
                                            );
                                        }
                                        if (filters.toDate) {
                                            filteredTransactions = filteredTransactions.filter(t =>
                                                new Date(t.date) <= new Date(filters.toDate)
                                            );
                                        }
                                        if (filters.source) {
                                            filteredTransactions = filteredTransactions.filter(t =>
                                                (t.transactionSource || 'Manual Entry') === filters.source
                                            );
                                        }
                                        if (filters.category && filters.category.length > 0) {
                                            filteredTransactions = filteredTransactions.filter(t =>
                                                t.category_name && filters.category.includes(t.category_name)
                                            );
                                        }

                                        if (filteredTransactions.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                                        No transactions found {filters.fromDate || filters.toDate || filters.source || filters.category.length > 0 ? 'matching filters' : 'for this property'}
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return filteredTransactions.map((transaction) => (
                                            <tr key={transaction.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {getCategoryLabel(transaction.category_name) || transaction.description}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {transaction.transactionSource || 'Manual Entry'}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${transaction.type === 'income'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {transaction.type === 'income' ? 'Income' : 'Expense'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    <div className="flex flex-col">
                                                        <span>{new Date(transaction.date).toLocaleDateString('en-AU', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric'
                                                        })}</span>
                                                        {transaction.created_at && (
                                                            <span className="text-xs text-gray-400">
                                                                Saved: {new Date(transaction.created_at).toLocaleString('en-AU', {
                                                                    timeZone: 'Australia/Sydney',
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                    hour12: true
                                                                })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className={`px-4 py-3 text-sm font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {transaction.type === 'expense' ? '-' : ''}${(parseFloat(String(transaction.amount)) || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1">
                                                        <Eye size={14} />
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {/* Ownership Tab */}
                {activeTab === 'ownership' && (
                    <div className="mt-6">
                        {/* eslint-disable @typescript-eslint/no-explicit-any */}
                        {(() => {
                            try {
                                // Robust parsing of ownership details (camelCase or snake_case)
                                // @ts-expect-error - ownership_details might exist on the raw object
                                const rawDetails = property?.ownershipDetails || property?.ownership_details;
                                const ownershipData = rawDetails
                                    ? (typeof rawDetails === 'string' ? JSON.parse(rawDetails) : rawDetails)
                                    : null;

                                const ownershipTypeLabels: Record<string, string> = {
                                    'individual': 'Individual',
                                    'joint-spouse': 'Joint - Spouse',
                                    'joint-other': 'Joint - Other',
                                    'family-trust': 'Family Trust',
                                    'trust-partnership': 'Trust - Partnership',
                                    'smsf': 'Self Managed Super Fund (SMSF)',
                                };

                                const ownershipType = ownershipData?.type || property?.ownership || 'individual';
                                const displayType = ownershipTypeLabels[ownershipType] || property?.ownership || 'Individual';

                                // Get owners array - handle different structures
                                let owners = ownershipData?.owners || [];
                                const trustOwners = ownershipData?.trustOwners || [];

                                const validOwners = owners.filter((o: any) => o.name);
                                const validTrustOwners = trustOwners.filter((o: any) => o.trustName);
                                const hasOwners = validOwners.length > 0 || validTrustOwners.length > 0;
                                const pieColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

                                let pieSegments: any[] = [];
                                let totalOwnership = 0;
                                const processingOwners = validTrustOwners.length > 0 ? validTrustOwners : validOwners;

                                if (processingOwners.length > 0) {
                                    pieSegments = processingOwners.map((item: any, index: number) => {
                                        const ownership = parseFloat(item.ownership || '0');
                                        totalOwnership += ownership;
                                        return {
                                            name: item.trustName || item.name,
                                            value: ownership,
                                            color: pieColors[index % pieColors.length]
                                        };
                                    });
                                }

                                // Calculate paths for donut chart
                                let currentAngle = 0;
                                pieSegments = pieSegments.map(segment => {
                                    const sliceAngle = (segment.value / 100) * 360;
                                    // Handle full 100% circle edge case
                                    if (sliceAngle >= 359.9) {
                                        const path = `M 100 20 A 80 80 0 1 1 100 180 A 80 80 0 1 1 100 20 Z`; // Full circle path approximation
                                        return { ...segment, path };
                                    }

                                    const x1 = 100 + 80 * Math.cos(Math.PI * (currentAngle - 90) / 180);
                                    const y1 = 100 + 80 * Math.sin(Math.PI * (currentAngle - 90) / 180);
                                    const x2 = 100 + 80 * Math.cos(Math.PI * (currentAngle + sliceAngle - 90) / 180);
                                    const y2 = 100 + 80 * Math.sin(Math.PI * (currentAngle + sliceAngle - 90) / 180);

                                    const largeArcFlag = sliceAngle > 180 ? 1 : 0;

                                    const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                                    currentAngle += sliceAngle;
                                    return { ...segment, path };
                                });

                                // Legacy fallback for individual
                                if (ownershipType === 'individual' && owners.length === 0) {
                                    if (ownershipData?.ownerName) {
                                        owners = [{ name: ownershipData.ownerName, ownership: '100' }];
                                    }
                                }

                                // Handle display logic based on type
                                return (
                                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                                        {/* Header */}
                                        <div className="mb-6">
                                            <h2 className="text-lg font-semibold text-gray-900">Ownership Details</h2>
                                            <p className="text-sm text-gray-500">Property ownership structure and allocation</p>
                                        </div>

                                        {/* Ownership Type Badge */}
                                        <div className="mb-6">
                                            <span className="text-xs text-gray-500 uppercase tracking-wider">Ownership Type</span>
                                            <div className="mt-1">
                                                <span className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                                                    {displayType}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Main Content with Pie Chart and Owner List */}
                                        {hasOwners && (
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {/* Pie Chart */}
                                                <div className="flex flex-col items-center">
                                                    <h3 className="text-sm font-medium text-gray-700 mb-4">Ownership Distribution</h3>
                                                    <div className="relative">
                                                        <svg width="200" height="200" viewBox="0 0 200 200">
                                                            {pieSegments.length > 0 ? (
                                                                pieSegments.map((segment, index) => (
                                                                    <path
                                                                        key={index}
                                                                        d={segment.path}
                                                                        fill={segment.color}
                                                                        stroke="white"
                                                                        strokeWidth="2"
                                                                    />
                                                                ))
                                                            ) : (
                                                                <circle cx="100" cy="100" r="80" fill="#E5E7EB" />
                                                            )}
                                                            {/* Center circle for donut effect */}
                                                            <circle cx="100" cy="100" r="50" fill="white" />
                                                            <text x="100" y="95" textAnchor="middle" className="text-2xl font-bold" fill="#1F2937">
                                                                {totalOwnership}%
                                                            </text>
                                                            <text x="100" y="115" textAnchor="middle" className="text-xs" fill="#6B7280">
                                                                Allocated
                                                            </text>
                                                        </svg>
                                                    </div>

                                                    {/* Legend */}
                                                    <div className="mt-4 flex flex-wrap justify-center gap-3">
                                                        {pieSegments.map((segment, index) => (
                                                            <div key={index} className="flex items-center gap-2">
                                                                <div
                                                                    className="w-3 h-3 rounded-full"
                                                                    style={{ backgroundColor: segment.color }}
                                                                />
                                                                <span className="text-xs text-gray-600">{segment.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Owner Details Table */}
                                                <div>
                                                    <h3 className="text-sm font-medium text-gray-700 mb-4">
                                                        {validTrustOwners.length > 0 ? 'Trust Partners' : 'Owners'}
                                                    </h3>
                                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                        <table className="w-full">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                                        {validTrustOwners.length > 0 ? 'Trust Name' : 'Name'}
                                                                    </th>
                                                                    {validTrustOwners.length > 0 && (
                                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company Trustee</th>
                                                                    )}
                                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Share</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {validTrustOwners.length > 0 ? (
                                                                    // Trust Partnership table
                                                                    validTrustOwners.map((item: { trustName?: string; companyTrustee?: string; ownership?: string }, index: number) => (
                                                                        <tr key={index} className="hover:bg-gray-50">
                                                                            <td className="px-4 py-3">
                                                                                <div
                                                                                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                                                                                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                                                                                >
                                                                                    {index + 1}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                                                                {item.trustName || 'Not specified'}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                                                {item.companyTrustee || 'Not specified'}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                                                                {item.ownership || 0}%
                                                                            </td>
                                                                        </tr>
                                                                    ))
                                                                ) : (
                                                                    // Regular owners table
                                                                    validOwners.map((item: { name?: string; ownership?: string }, index: number) => (
                                                                        <tr key={index} className="hover:bg-gray-50">
                                                                            <td className="px-4 py-3">
                                                                                <div
                                                                                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                                                                                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                                                                                >
                                                                                    {index + 1}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                                                                {item.name || 'Not specified'}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                                                                {item.ownership || 0}%
                                                                            </td>
                                                                        </tr>
                                                                    ))
                                                                )}
                                                            </tbody>
                                                            <tfoot className="bg-gray-50">
                                                                <tr>
                                                                    <td colSpan={validTrustOwners.length > 0 ? 3 : 2} className="px-4 py-3 text-sm font-medium text-gray-700">Total</td>
                                                                    <td className={`px-4 py-3 text-sm font-bold text-right ${totalOwnership === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                                                                        {totalOwnership}%
                                                                    </td>
                                                                </tr>
                                                            </tfoot>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Family Trust Details */}
                                        {ownershipData?.familyTrust && (
                                            <div className="mt-6 pt-6 border-t border-gray-200">
                                                <h3 className="text-sm font-medium text-gray-700 mb-4">Family Trust Details</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-gray-50 rounded-lg p-4">
                                                        <span className="text-xs text-gray-500 uppercase tracking-wider">Trust Name</span>
                                                        <p className="mt-1 text-sm font-medium text-gray-900">
                                                            {ownershipData.familyTrust.trustName || 'Not specified'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-lg p-4">
                                                        <span className="text-xs text-gray-500 uppercase tracking-wider">Company Trustee</span>
                                                        <p className="mt-1 text-sm font-medium text-gray-900">
                                                            {ownershipData.familyTrust.companyTrustee || 'Not specified'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* SMSF Details */}
                                        {ownershipData?.smsf && (
                                            <div className="mt-6 pt-6 border-t border-gray-200">
                                                <h3 className="text-sm font-medium text-gray-700 mb-4">SMSF Details</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-gray-50 rounded-lg p-4">
                                                        <span className="text-xs text-gray-500 uppercase tracking-wider">SMSF Trust Name</span>
                                                        <p className="mt-1 text-sm font-medium text-gray-900">
                                                            {ownershipData.smsf.trustName || 'Not specified'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-lg p-4">
                                                        <span className="text-xs text-gray-500 uppercase tracking-wider">Company Trustee</span>
                                                        <p className="mt-1 text-sm font-medium text-gray-900">
                                                            {ownershipData.smsf.companyTrustee || 'Not specified'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-lg p-4">
                                                        <span className="text-xs text-gray-500 uppercase tracking-wider">Bare Trust</span>
                                                        <p className="mt-1 text-sm font-medium text-gray-900">
                                                            {ownershipData.smsf.bareTrust || 'Not specified'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-lg p-4">
                                                        <span className="text-xs text-gray-500 uppercase tracking-wider">Bare Trustee</span>
                                                        <p className="mt-1 text-sm font-medium text-gray-900">
                                                            {ownershipData.smsf.bareTrustee || 'Not specified'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}


                                    </div>
                                );
                            } catch {
                                return (
                                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <AlertCircle className="w-8 h-8 text-red-500" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Ownership Details</h3>
                                        <p className="text-sm text-gray-500">There was an error parsing the ownership data. Please try editing the property.</p>
                                    </div>
                                );
                            }
                        })()}
                    </div>
                )
                }


                {/* Document tab — loan documents attached to this property's bank/loan entries */}
                {
                    activeTab === 'document' && (() => {
                        const loanData = property?.loan_details;
                        const banks: LoanBankDetail[] = Array.isArray(loanData)
                            ? loanData
                            : (loanData && 'bankName' in loanData ? [loanData] : []);
                        const docs: { bank?: string; doc: LoanDocument }[] = banks
                            .filter(b => Boolean(b.document))
                            .map(b => ({ bank: b.bankName, doc: b.document as LoanDocument }));

                        if (docs.length === 0) {
                            return (
                                <div className="mt-6 bg-white rounded-xl border border-gray-200 p-8 text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FileText className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Document</h3>
                                    <p className="text-sm text-gray-500">No documents uploaded yet. Add a loan document from Edit Property → Loan Details.</p>
                                </div>
                            );
                        }

                        return (
                            <div className="mt-6 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                                {docs.map(({ bank, doc }, idx) => (
                                    <div key={idx} className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                <FileText className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{doc.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {(doc.size / 1024).toFixed(1)} KB
                                                    {bank && <> · Loan document{BANKS[bank] ? ` (${BANKS[bank]})` : ''}</>}
                                                </p>
                                            </div>
                                        </div>
                                        {doc.url ? (
                                            <a
                                                href={doc.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline text-sm font-medium"
                                            >
                                                View
                                            </a>
                                        ) : (
                                            <span className="text-xs text-gray-400">Not available</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        );
                    })()
                }

                {/* Other tabs placeholder */}
                {
                    activeTab !== 'transaction' && activeTab !== 'ownership' && activeTab !== 'document' && (
                        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-8 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">{tabs.find(t => t.id === activeTab)?.label}</h3>
                            <p className="text-sm text-gray-500">This section is coming soon</p>
                        </div>
                    )
                }
            </div >
        </div >
    );
}
