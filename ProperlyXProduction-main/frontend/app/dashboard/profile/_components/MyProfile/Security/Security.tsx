"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Smartphone,
    Monitor,
    MapPin,
    Key,
    AlertTriangle,
    Check,
    LogOut,
    Loader2,
} from "lucide-react"
import { authApi } from "@/lib/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface SessionInfo {
    device: string;
    browser: string;
    os: string;
    time: string;
    current: boolean;
}

interface LoginEntry {
    status: "success" | "failed";
    device: string;
    time: string;
}

// Helper to detect browser and device info
function getBrowserInfo(): { browser: string; os: string; device: string } {
    if (typeof window === 'undefined') {
        return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
    }

    const ua = navigator.userAgent;

    // Detect browser
    let browser = 'Unknown Browser';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Microsoft Edge';
    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

    // Detect OS
    let os = 'Unknown OS';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    // Detect device type
    let device = 'Desktop';
    if (/Mobile|Android|iPhone/i.test(ua)) device = 'Mobile';
    else if (/Tablet|iPad/i.test(ua)) device = 'Tablet';

    return { browser, os, device };
}

export function SecuritySection() {
    const router = useRouter();
    const [currentSession, setCurrentSession] = useState<SessionInfo | null>(null);
    const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([]);
    const securityScore = 85;

    // Delete account state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    useEffect(() => {
        const { browser, os, device } = getBrowserInfo();

        // Set current session
        setCurrentSession({
            device: device === 'Mobile' ? 'Mobile Device' : `${os} ${device}`,
            browser,
            os,
            time: 'Active now',
            current: true,
        });

        // Set login history with current login
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });

        setLoginHistory([
            {
                status: 'success',
                device: `${browser} on ${os}`,
                time: `Today, ${timeString}`,
            }
        ]);
    }, []);

    const handleDeleteAccount = async () => {
        if (!deletePassword) {
            setDeleteError("Password is required");
            return;
        }

        setIsDeleting(true);
        setDeleteError("");

        try {
            const response = await authApi.deleteAccount(deletePassword);
            if (response.success) {
                toast.success("Account deleted successfully");
                // Clear tokens and redirect to login
                await authApi.logout();
                router.push("/auth/login");
            } else {
                setDeleteError(response.error || "Failed to delete account");
            }
        } catch (error) {
            console.error("Delete account error:", error);
            setDeleteError("An error occurred while deleting your account");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Security & Access</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Manage your account security and active sessions</p>
            </div>

            {/* Security Score */}
            <Card>
                <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                            <svg className="w-20 h-20 sm:w-24 sm:h-24 transform -rotate-90" viewBox="0 0 96 96">
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    className="text-muted"
                                />
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${securityScore * 2.51} 251`}
                                    className="text-emerald-500"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xl sm:text-2xl font-bold">{securityScore}%</span>
                            </div>
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                            <h3 className="text-base sm:text-lg font-semibold">Security Score: Good</h3>
                            <p className="text-sm text-muted-foreground mb-3">Your account is protected</p>
                            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-xs">
                                    <Check className="w-3 h-3 mr-1" />
                                    Email Verified
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Enable 2FA
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <Card>
                <CardHeader className="pb-3 sm:pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">Add an extra layer of security</CardDescription>
                        </div>
                        <Badge variant="secondary">Not Enabled</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg border border-dashed gap-3">
                        <div className="flex items-center gap-3">
                            <Smartphone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            <div>
                                <p className="font-medium text-sm">Authenticator App</p>
                                <p className="text-xs sm:text-sm text-muted-foreground">Use Google Authenticator or similar</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">
                            Set Up
                        </Button>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg border border-dashed gap-3">
                        <div className="flex items-center gap-3">
                            <Key className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            <div>
                                <p className="font-medium text-sm">Backup Codes</p>
                                <p className="text-xs sm:text-sm text-muted-foreground">Generate recovery codes</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled>
                            Enable 2FA First
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Active Sessions - Dynamic */}
            <Card>
                <CardHeader className="pb-3 sm:pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <CardTitle className="text-base">Active Sessions</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">Devices currently logged in</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" className="text-destructive bg-transparent w-full sm:w-auto">
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out All
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {currentSession && (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg border gap-3">
                                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                        <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-medium text-sm">{currentSession.device}</p>
                                            <Badge variant="secondary" className="text-[10px] sm:text-xs bg-emerald-50 text-emerald-700">
                                                Current
                                            </Badge>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                                            <span>{currentSession.browser}</span>
                                            <span className="hidden sm:inline">•</span>
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                This device
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-3 pl-12 sm:pl-0">
                                    <span className="text-xs sm:text-sm text-muted-foreground">{currentSession.time}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Login History - Dynamic */}
            <Card>
                <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="text-base">Login History</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Recent login attempts to your account</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 sm:space-y-3">
                        {loginHistory.length > 0 ? (
                            loginHistory.map((login, index) => (
                                <div
                                    key={index}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 rounded-lg hover:bg-muted/50 transition-colors gap-2"
                                >
                                    <div className="flex items-center gap-3">
                                        {login.status === "success" ? (
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                                            </div>
                                        ) : (
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                                                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-xs sm:text-sm font-medium">
                                                {login.status === "success" ? "Successful login" : "Failed login attempt"}
                                            </p>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                                                {login.device}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs sm:text-sm text-muted-foreground pl-10 sm:pl-0">{login.time}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No login history available</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/50">
                <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Irreversible account actions</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg border border-destructive/30 gap-3">
                        <div>
                            <p className="font-medium text-sm">Delete Account</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">Permanently delete your account and all data</p>
                        </div>
                        <Button
                            variant="destructive"
                            className="w-full sm:w-auto"
                            onClick={() => setShowDeleteDialog(true)}
                        >
                            Delete Account
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Delete Account Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Delete Account</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete your account
                            and remove all your data including properties, transactions, and documents.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="delete-password">Enter your password to confirm</Label>
                            <Input
                                id="delete-password"
                                type="password"
                                placeholder="Enter your password"
                                value={deletePassword}
                                onChange={(e) => {
                                    setDeletePassword(e.target.value);
                                    setDeleteError("");
                                }}
                            />
                        </div>
                        {deleteError && (
                            <p className="text-sm text-destructive">{deleteError}</p>
                        )}
                    </div>
                    <DialogFooter className="flex gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeleteDialog(false);
                                setDeletePassword("");
                                setDeleteError("");
                            }}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteAccount}
                            disabled={isDeleting || !deletePassword}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete My Account"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
