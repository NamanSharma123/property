'use client';

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Building2, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BankAccount {
    id: string;
    bankName: string;
    accountName: string;
    bsb: string;
    accountNumber: string;
    accountType: string;
    balance: number;
    status: string;
    lastSync: string;
}

// Mock bank account for demo
const initialBankAccounts: BankAccount[] = [
    // {
    //   id: "bank-1",
    //   bankName: "Commonwealth Bank",
    //   accountName: "Property Investment Account",
    //   bsb: "064-000",
    //   accountNumber: "XXXX-XXXX-8094",
    //   accountType: "Savings",
    //   balance: 45230.50,
    //   status: "Connected",
    //   lastSync: new Date().toISOString(),
    // },
];

export default function BankPage() {
    const [accounts, setAccounts] = useState<BankAccount[]>(initialBankAccounts);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        bankName: '',
        accountName: '',
        bsb: '',
        accountNumber: '',
        accountType: 'Savings',
        balance: '0',
    });

    const handleAddAccount = () => {
        if (!formData.bankName || !formData.accountName) {
            alert('Please fill in at least Bank Name and Account Name');
            return;
        }

        const newAccount: BankAccount = {
            id: `bank-${Date.now()}`,
            bankName: formData.bankName,
            accountName: formData.accountName,
            bsb: formData.bsb || 'N/A',
            accountNumber: formData.accountNumber ? `XXXX-XXXX-${formData.accountNumber.slice(-4)}` : 'N/A',
            accountType: formData.accountType,
            balance: parseFloat(formData.balance) || 0,
            status: 'Connected',
            lastSync: new Date().toISOString(),
        };

        setAccounts([...accounts, newAccount]);
        setShowAddModal(false);
        setFormData({
            bankName: '',
            accountName: '',
            bsb: '',
            accountNumber: '',
            accountType: 'Savings',
            balance: '0',
        });
    };

    const handleDeleteAccount = (id: string) => {
        if (confirm('Are you sure you want to remove this bank account?')) {
            setAccounts(accounts.filter(acc => acc.id !== id));
        }
    };

    return (
        <>
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Add Bank Account</h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Bank Name *</label>
                                <Input
                                    placeholder="e.g., ANZ Bank"
                                    value={formData.bankName}
                                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Account Name *</label>
                                <Input
                                    placeholder="e.g., Business Transaction Account"
                                    value={formData.accountName}
                                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">BSB</label>
                                    <Input
                                        placeholder="XXX-XXX"
                                        value={formData.bsb}
                                        onChange={(e) => setFormData({ ...formData, bsb: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Account Number</label>
                                    <Input
                                        placeholder="XXXXXXXX"
                                        value={formData.accountNumber}
                                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Account Type</label>
                                <Select value={formData.accountType} onValueChange={(value) => setFormData({ ...formData, accountType: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Savings">Savings</SelectItem>
                                        <SelectItem value="Checking">Checking</SelectItem>
                                        <SelectItem value="Business">Business</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Current Balance</label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={formData.balance}
                                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button onClick={handleAddAccount} className="flex-1 bg-blue-600 hover:bg-blue-700">
                                    Add Account
                                </Button>
                                <Button onClick={() => setShowAddModal(false)} variant="outline" className="flex-1">
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Bank Accounts</h1>
                        <p className="text-muted-foreground">
                            Manage your connected bank accounts for automatic transaction imports
                        </p>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowAddModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Bank Account
                    </Button>
                </div>

                <div className="grid gap-4">
                    {accounts.map((account) => (
                        <Card key={account.id}>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-blue-100 rounded-lg">
                                            <Building2 className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold">{account.bankName}</h3>
                                            <p className="text-sm text-muted-foreground">{account.accountName}</p>
                                            <div className="flex items-center gap-4 mt-2">
                                                <span className="text-sm text-muted-foreground">
                                                    BSB: {account.bsb}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    Account: {account.accountNumber}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                            {account.status}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDeleteAccount(account.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Account Type</p>
                                        <p className="font-medium">{account.accountType}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Current Balance</p>
                                        <p className="font-medium text-green-600">
                                            ${account.balance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Last Synced</p>
                                        <p className="font-medium">
                                            {new Date(account.lastSync).toLocaleDateString('en-AU', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 flex gap-2">
                                    <Button variant="outline" size="sm">
                                        Sync Transactions
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        View Transactions
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card className="border-dashed">
                    <CardContent className="p-6 text-center">
                        <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Connect More Banks</h3>
                        <p className="text-muted-foreground mb-4">
                            Link additional bank accounts to automatically import transactions
                        </p>
                        <Button variant="outline" onClick={() => setShowAddModal(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Another Bank
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
