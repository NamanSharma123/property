'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Search, Plus, Pencil, Trash2, Loader2, AlertTriangle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MultiStepPropertyForm } from "@/app/dashboard/_components/property/MultiStepPropertyForm";
import { removeProperty, getLoanSummary, getBankLabel, type Property } from "@/lib/property";
import { usePropertiesSWR } from "@/hooks/usePropertiesSWR";
import { PropertyListSkeleton } from "@/components/ui/skeletons";

// Delete Confirmation Dialog Component
const DeleteConfirmDialog = ({
  property,
  isDeleting,
  onConfirm,
  onCancel
}: {
  property: Property;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const [confirmText, setConfirmText] = useState('');
  const canDelete = confirmText.toLowerCase() === property.name.toLowerCase();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Delete Property</h3>
            <p className="text-sm text-gray-500 mt-1">
              Are you sure you want to delete <strong>&quot;{property.name}&quot;</strong>?
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Warning: This action cannot be undone!
          </p>
          <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
            <li>The property will be permanently removed from the database</li>
            <li>All associated transactions will be unlinked</li>
            <li>This data cannot be recovered</li>
          </ul>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type <strong>&quot;{property.name}&quot;</strong> to confirm deletion:
          </label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={property.name}
            className="w-full"
            disabled={isDeleting}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!canDelete || isDeleting}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Property
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Property = () => {
  const router = useRouter();
  const { properties, isLoading, refresh } = usePropertiesSWR();
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null); // For edit mode
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

  async function handleDelete(property: Property) {
    setPropertyToDelete(property);
  }

  async function confirmDelete() {
    if (!propertyToDelete) return;

    setDeletingId(propertyToDelete.id);
    try {
      const result = await removeProperty(propertyToDelete.id);
      if (result.success) {
        refresh();
        setPropertyToDelete(null);
      } else {
        alert(result.error || 'Failed to remove property');
      }
    } catch (error) {
      console.error('Failed to delete property:', error);
      alert('Failed to remove property');
    } finally {
      setDeletingId(null);
    }
  }

  function handlePropertyAdded() {
    setShowPropertyForm(false);
    setEditingProperty(null);
    refresh(); // Refresh the list
  }

  // Handle edit button click
  function handleEditProperty(property: Property, e: React.MouseEvent) {
    e.stopPropagation(); // Prevent card click
    setEditingProperty(property);
    setShowPropertyForm(true);
  }

  // Handle property card click
  function handlePropertyClick(propertyId: string) {
    router.push(`/dashboard/property/${propertyId}`);
  }

  // Filter properties
  const filteredProperties = properties.filter(property => {
    const addressString = property.full_address || (typeof property.address === 'object' ?
      [property.address.street, property.address.city, property.address.state, property.address.zipCode].filter(Boolean).join(' ') :
      String(property.address || ''));

    const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      addressString.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || property.type.toLowerCase() === typeFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || property.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesType && matchesStatus;
  });

  if (isLoading) {
    return <PropertyListSkeleton />;
  }

  return (
    <>
      {/* Delete Confirmation Dialog */}
      {propertyToDelete && (
        <DeleteConfirmDialog
          property={propertyToDelete}
          isDeleting={deletingId === propertyToDelete.id}
          onConfirm={confirmDelete}
          onCancel={() => setPropertyToDelete(null)}
        />
      )}
      {showPropertyForm && (
        <MultiStepPropertyForm
          onClose={() => { setShowPropertyForm(false); setEditingProperty(null); }}
          onSuccess={handlePropertyAdded}
          property={editingProperty || undefined}
        />
      )}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Your Property</h1>
            <p className="text-muted-foreground">
              {properties.length === 0
                ? "No properties yet - add your first one!"
                : `${properties.length} ${properties.length === 1 ? 'property' : 'properties'} in your portfolio`}
            </p>
          </div>
          <Button
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={() => setShowPropertyForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search Property"
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Property Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="residential">Residential</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
              <SelectItem value="industrial">Industrial</SelectItem>
              <SelectItem value="land">Land</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="subscribed">Subscribed</SelectItem>
              <SelectItem value="active">Active</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredProperties.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {properties.length === 0 ? "No properties yet" : "No matching properties"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {properties.length === 0
                ? "Add your first property to get started tracking your portfolio"
                : "Try adjusting your search or filters"}
            </p>
            {properties.length === 0 && (
              <Button onClick={() => setShowPropertyForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredProperties.map((property) => {
              const loanSummary = getLoanSummary(property);
              return (
              <Card
                key={property.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handlePropertyClick(property.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold mb-1">{property.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {property.full_address || (typeof property.address === 'object' ?
                            [property.address.street, property.address.city, property.address.state, property.address.zipCode].filter(Boolean).join(', ') :
                            String(property.address || ''))}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge variant="secondary">{property.type}</Badge>
                      <Badge className="bg-accent text-accent-foreground">{property.status}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleDelete(property); }}
                        disabled={deletingId === property.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {deletingId === property.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Net Income</div>
                      <div className="font-semibold">${(property.monthly_rent || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Market Value</div>
                      <div className="font-semibold">${property.current_value?.toLocaleString() || '0'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Loan</div>
                      <div className="font-semibold">${loanSummary.totalLoan.toLocaleString('en-AU', { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">LVR</div>
                      <div className="font-semibold">{loanSummary.lvr.toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Ownership</div>
                      <div className="font-semibold">
                        {(() => {
                          try {
                            const detailsStr = property.ownershipDetails || property.ownership_details;
                            if (detailsStr) {
                              const details = typeof detailsStr === 'string' ? JSON.parse(detailsStr) : detailsStr;
                              const typeLabels: Record<string, string> = {
                                'individual': 'Individual',
                                'joint-spouse': 'Joint - Spouse',
                                'joint-other': 'Joint - Other',
                                'family-trust': 'Family Trust',
                                'trust-partnership': 'Trust Partnership',
                                'smsf': 'SMSF',
                              };
                              return typeLabels[details.type] || property.ownership || 'Individual';
                            }
                            return property.ownership || 'Individual';
                          } catch {
                            return property.ownership || 'Individual';
                          }
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-primary mb-2">
                          {loanSummary.banks.length === 0
                            ? 'No loans added'
                            : `Loans (${loanSummary.banks.length})`}
                        </div>
                        {loanSummary.banks.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {loanSummary.banks.map((bank, idx) => (
                              <Badge key={bank.id || idx} variant="secondary" className="font-normal">
                                {getBankLabel(bank.bankName)} {idx === 0 ? '(Primary)' : '(Secondary)'}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={(e) => handleEditProperty(property, e)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit Property
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default Property;

