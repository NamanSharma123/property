"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Landmark, Mail, Smartphone, Check, RefreshCw, Plus, Trash2 } from "lucide-react"

const connectedBanks = [
  { id: 1, name: "Commonwealth Bank", accounts: 2, lastSync: "2 hours ago", status: "connected" },
  { id: 2, name: "NAB", accounts: 1, lastSync: "3 hours ago", status: "connected" },
  { id: 3, name: "Westpac", accounts: 1, lastSync: "1 day ago", status: "needs_attention" },
]

const integrations = [
  { id: 1, name: "Xero", category: "Accounting", status: "connected", icon: "X" },
  { id: 2, name: "MYOB", category: "Accounting", status: "available", icon: "M" },
  { id: 3, name: "QuickBooks", category: "Accounting", status: "available", icon: "Q" },
]

import { User } from "@/lib/api"

interface SettingsSectionProps {
  user?: User | null;
}

export function SettingsSection({ user }: SettingsSectionProps) {
  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Settings & Preferences</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Customize your account and application settings</p>
      </div>

      {/* Tabs - Scrollable on mobile */}
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="w-full h-auto flex-wrap sm:flex-nowrap justify-start overflow-x-auto">
          <TabsTrigger value="account" className="flex-shrink-0 text-xs sm:text-sm">
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex-shrink-0 text-xs sm:text-sm">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="banks" className="flex-shrink-0 text-xs sm:text-sm">
            Bank Feeds
          </TabsTrigger>
          <TabsTrigger value="display" className="flex-shrink-0 text-xs sm:text-sm">
            Display
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex-shrink-0 text-xs sm:text-sm">
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
          {/* Email */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base">Email Address</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Manage your email settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg border gap-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{user?.email || 'Not provided'}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">
                        <Check className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                      <span className="text-xs text-muted-foreground">Primary</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full sm:w-auto bg-transparent">
                  Change
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Phone */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base">Phone Number</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Used for 2FA and important alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg border gap-3">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{user?.phone || "Not provided"}</p>
                    {user?.phone && (
                      <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">
                        <Check className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full sm:w-auto bg-transparent">
                  Update
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base">Password</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Change your password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-sm">
                    Current Password
                  </Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm">
                    New Password
                  </Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm">
                    Confirm New Password
                  </Label>
                  <Input id="confirmPassword" type="password" />
                </div>
              </div>
              <Button className="w-full sm:w-auto">Update Password</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {[
                {
                  title: "Report Ready",
                  description: "When a new report is generated",
                  email: true,
                  sms: false,
                  push: true,
                },
                {
                  title: "New Data Available",
                  description: "When bank data is synced",
                  email: true,
                  sms: false,
                  push: true,
                },
                {
                  title: "Monthly Summary",
                  description: "Monthly portfolio summary",
                  email: true,
                  sms: false,
                  push: false,
                },
                {
                  title: "Tax Deadline Reminders",
                  description: "Important tax dates",
                  email: true,
                  sms: true,
                  push: true,
                },
                {
                  title: "Transaction Alerts",
                  description: "Large or unusual transactions",
                  email: false,
                  sms: true,
                  push: true,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b last:border-0 gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked={item.email} />
                      <span className="text-xs sm:text-sm text-muted-foreground">Email</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked={item.sms} />
                      <span className="text-xs sm:text-sm text-muted-foreground">SMS</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked={item.push} />
                      <span className="text-xs sm:text-sm text-muted-foreground">Push</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banks" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Connected Banks</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Manage your bank feed connections</CardDescription>
                </div>
                <Button size="sm" className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Bank
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {connectedBanks.map((bank) => (
                  <div
                    key={bank.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg border gap-3"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Landmark className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{bank.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {bank.accounts} accounts • Last sync: {bank.lastSync}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                      {bank.status === "connected" ? (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs">
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 text-xs">
                          Needs Attention
                        </Badge>
                      )}
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="display" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base">Display & Language</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Customize your viewing experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Theme</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 bg-transparent text-xs sm:text-sm">
                      Light
                    </Button>
                    <Button variant="secondary" className="flex-1 text-xs sm:text-sm">
                      Dark
                    </Button>
                    <Button variant="outline" className="flex-1 bg-transparent text-xs sm:text-sm">
                      Auto
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language" className="text-sm">
                    Language
                  </Label>
                  <Input id="language" defaultValue="English (Australia)" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFormat" className="text-sm">
                    Date Format
                  </Label>
                  <Input id="dateFormat" defaultValue="DD/MM/YYYY" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency" className="text-sm">
                    Currency
                  </Label>
                  <Input id="currency" defaultValue="AUD ($)" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone" className="text-sm">
                    Timezone
                  </Label>
                  <Input id="timezone" defaultValue="Australia/Sydney (GMT+11)" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numberFormat" className="text-sm">
                    Number Format
                  </Label>
                  <Input id="numberFormat" defaultValue="1,234.56" />
                </div>
              </div>
              <Button className="w-full sm:w-auto">Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base">Connected Apps</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Manage third-party integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg border gap-3"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-muted flex items-center justify-center font-bold text-sm">
                        {integration.icon}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{integration.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">{integration.category}</p>
                      </div>
                    </div>
                    {integration.status === "connected" ? (
                      <div className="flex items-center gap-2 justify-between sm:justify-end">
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs">
                          Connected
                        </Badge>
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" className="w-full sm:w-auto">
                        Connect
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
