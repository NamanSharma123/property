"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, Calendar, Edit2, Check, AlertCircle, X, Loader2 } from "lucide-react"
import { updateProfile } from "@/lib/auth"
import { UserData } from "../MyProfile"

export function ProfileSection({ user }: { user?: UserData }) {
    const displayName = user?.name || "User";
    const [firstName, ...lastNameParts] = displayName.split(' ');
    const lastName = lastNameParts.join(' ') || "";
    const displayEmail = user?.email || "";
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase() || "U";
    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

    // Profile completion state - check if user already has a phone number saved
    const [profileComplete, setProfileComplete] = useState(!!user?.phone);
    const [phone, setPhone] = useState(user?.phone || "");
    const [phoneError, setPhoneError] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Australian phone number validation (international format)
    const validateAustralianPhone = (phoneNumber: string): { valid: boolean; error: string } => {
        // Remove all non-digit characters for validation
        const digitsOnly = phoneNumber.replace(/\D/g, '');

        // Check if it's in +61 format (should be 11 digits: 61 + 9 digits)
        if (digitsOnly.startsWith('61')) {
            if (digitsOnly.length !== 11) {
                return { valid: false, error: "Phone number must be +61 followed by 9 digits" };
            }

            // Valid Australian prefixes after 61: 4 (mobile), 2, 3, 7, 8 (landline)
            const validPrefixes = ['4', '2', '3', '7', '8'];
            const prefix = digitsOnly.charAt(2);

            if (!validPrefixes.includes(prefix)) {
                return { valid: false, error: "Invalid Australian phone number prefix" };
            }

            return { valid: true, error: "" };
        }

        // Check local format (10 digits starting with 0)
        if (digitsOnly.startsWith('0')) {
            if (digitsOnly.length !== 10) {
                return { valid: false, error: "Phone number must be 10 digits" };
            }

            const validPrefixes = ['04', '02', '03', '07', '08'];
            const prefix = digitsOnly.slice(0, 2);

            if (!validPrefixes.includes(prefix)) {
                return { valid: false, error: "Invalid Australian phone number prefix" };
            }

            return { valid: true, error: "" };
        }

        return { valid: false, error: "Phone must start with +61 or 0" };
    };

    // Format phone number as user types (international format +61)
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        // Allow only digits and + symbol
        let cleaned = value.replace(/[^\d+]/g, '');

        // Ensure + is only at the start
        if (cleaned.includes('+')) {
            cleaned = '+' + cleaned.replace(/\+/g, '');
        }

        // Auto-format with spaces for readability
        let formatted = cleaned;

        // Format +61 numbers: +61 4XX XXX XXX
        if (cleaned.startsWith('+61') && cleaned.length > 3) {
            const afterCode = cleaned.slice(3);
            if (afterCode.length <= 3) {
                formatted = '+61 ' + afterCode;
            } else if (afterCode.length <= 6) {
                formatted = '+61 ' + afterCode.slice(0, 3) + ' ' + afterCode.slice(3);
            } else {
                formatted = '+61 ' + afterCode.slice(0, 3) + ' ' + afterCode.slice(3, 6) + ' ' + afterCode.slice(6, 9);
            }
        }
        // Format local numbers: 04XX XXX XXX
        else if (cleaned.startsWith('0') && cleaned.length > 1) {
            if (cleaned.length <= 4) {
                formatted = cleaned;
            } else if (cleaned.length <= 7) {
                formatted = cleaned.slice(0, 4) + ' ' + cleaned.slice(4);
            } else {
                formatted = cleaned.slice(0, 4) + ' ' + cleaned.slice(4, 7) + ' ' + cleaned.slice(7, 10);
            }
        }

        setPhone(formatted);
        setPhoneError(""); // Clear error as user types
    };

    const handleSetupProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        const validation = validateAustralianPhone(phone);
        if (!validation.valid) {
            setPhoneError(validation.error);
            return;
        }

        setIsSaving(true);
        try {
            // Save phone number to database
            const result = await updateProfile({ phone });
            if (result.success) {
                setProfileComplete(true);
            } else {
                setPhoneError(result.error || "Failed to save phone number");
            }
        } catch {
            setPhoneError("An error occurred. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    // Show setup prompt if profile is incomplete
    if (!profileComplete) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Your Profile</h1>
                    <p className="text-muted-foreground">Manage your account information</p>
                </div>

                {/* Setup Progress Card */}
                <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                                <AlertCircle className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-amber-900 text-lg">Profile Incomplete</h3>
                                <p className="text-sm text-amber-700 mt-1">
                                    Please provide your phone number to complete your profile setup.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Profile Preview Card */}
                <Card className="shadow-lg border-0 bg-white">
                    <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
                            <div className="relative">
                                <Avatar className="w-28 h-28 shadow-lg ring-4 ring-gray-100">
                                    <AvatarImage src="" />
                                    <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="flex-1 text-center md:text-left space-y-3">
                                <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
                                <div className="flex items-center justify-center md:justify-start gap-2 text-gray-600">
                                    <Mail className="w-4 h-4" />
                                    <span>{displayEmail}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Setup Form */}
                <Card className="shadow-md border-0">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Contact Information</CardTitle>
                        <CardDescription>Add your phone number to complete setup</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSetupProfile} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="setupPhone" className="text-sm font-medium">Phone Number *</Label>
                                <Input
                                    id="setupPhone"
                                    placeholder="+61 412 345 678"
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    required
                                    className={`h-12 ${phoneError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    maxLength={15}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Format: +61 4XX XXX XXX (mobile) or +61 2/3/7/8 XXXX XXXX (landline)
                                </p>
                                {phoneError && (
                                    <p className="text-sm text-red-500">{phoneError}</p>
                                )}
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit" size="lg" className="px-8" disabled={isSaving}>
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Profile"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Edit profile form
    if (isEditing) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Edit Profile</h1>
                        <p className="text-muted-foreground">Update your profile information</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                </div>

                {/* Edit Form */}
                <Card className="shadow-md border-0">
                    <CardHeader>
                        <CardTitle className="text-lg">Personal Information</CardTitle>
                        <CardDescription>Update your contact details</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const firstName = formData.get('firstName') as string || '';
                            const lastName = formData.get('lastName') as string || '';
                            const name = `${firstName} ${lastName}`.trim();

                            // Validate phone before saving
                            const validation = validateAustralianPhone(phone);
                            if (phone && !validation.valid) {
                                setPhoneError(validation.error);
                                return;
                            }

                            setIsSaving(true);
                            try {
                                const result = await updateProfile({ name, phone });
                                if (result.success) {
                                    setIsEditing(false);
                                } else {
                                    setPhoneError(result.error || "Failed to update profile");
                                }
                            } catch {
                                setPhoneError("An error occurred. Please try again.");
                            } finally {
                                setIsSaving(false);
                            }
                        }}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="editFirstName">First Name</Label>
                                    <Input id="editFirstName" name="firstName" defaultValue={firstName} className="h-11" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="editLastName">Last Name</Label>
                                    <Input id="editLastName" name="lastName" defaultValue={lastName} className="h-11" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="editEmail">Email Address</Label>
                                    <Input id="editEmail" name="email" type="email" defaultValue={displayEmail} className="h-11" disabled />
                                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="editPhone">Phone Number</Label>
                                    <Input
                                        id="editPhone"
                                        name="phone"
                                        value={phone}
                                        onChange={handlePhoneChange}
                                        placeholder="+61 412 345 678"
                                        className={`h-11 ${phoneError ? 'border-red-500' : ''}`}
                                        maxLength={15}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Format: +61 4XX XXX XXX (mobile) or +61 2/3/7/8 XXXX XXXX (landline)
                                    </p>
                                    {phoneError && (
                                        <p className="text-sm text-red-500">{phoneError}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end mt-8">
                                <Button type="submit" size="lg" className="px-8" disabled={isSaving}>
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Changes"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Regular profile view - Clean card only, no tabs
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Your Profile</h1>
                <p className="text-muted-foreground">Manage your account information and preferences</p>
            </div>

            {/* Profile Card - Enhanced UI */}
            <Card className="shadow-lg border-0 bg-white overflow-hidden">
                <CardContent className="p-0">
                    {/* Gradient header background */}
                    <div className="h-20 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600" />

                    <div className="px-8 pb-8 pt-4">
                        {/* Avatar and Info */}
                        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-12">
                            {/* Avatar */}
                            <div className="relative">
                                <Avatar className="w-28 h-28 shadow-xl ring-4 ring-white">
                                    <AvatarImage src="" />
                                    <AvatarFallback className="text-3xl bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 font-bold">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                            </div>

                            {/* Name and Badge */}
                            <div className="flex-1 text-center md:text-left pb-2">
                                <div className="flex flex-col md:flex-row items-center md:items-center gap-3">
                                    <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 px-3 py-1">
                                        <Check className="w-3.5 h-3.5 mr-1.5" />
                                        Verified
                                    </Badge>
                                </div>
                                <p className="text-gray-500 mt-1">Property Investor</p>
                            </div>

                            {/* Edit Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                                className="border-gray-300 hover:bg-gray-50"
                            >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit Profile
                            </Button>
                        </div>

                        {/* Info Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                    <Mail className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Email</p>
                                    <p className="font-semibold text-gray-900 mt-0.5">{displayEmail}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                                    <Phone className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Phone</p>
                                    <p className="font-semibold text-gray-900 mt-0.5">{phone || "Not provided"}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Member Since</p>
                                    <p className="font-semibold text-gray-900 mt-0.5">
                                        {memberSince}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
