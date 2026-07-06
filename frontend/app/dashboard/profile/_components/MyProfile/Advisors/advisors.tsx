"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Users,
  Plus,
  Mail,
  Phone,
  Shield,
  Link2,
  Copy,
  Calendar,
  Eye,
  Edit2,
  FileText,
  MoreHorizontal,
  X,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const advisors = [
  {
    id: 1,
    name: "Sarah Mitchell",
    role: "Tax Accountant",
    company: "Mitchell & Associates",
    email: "sarah@mitchellassoc.com.au",
    phone: "+61 2 9876 5432",
    avatar: "/professional-accountant-woman.png",
    permissions: "Full Access",
    lastAccess: "2 hours ago",
    sharedItems: 12,
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Mortgage Broker",
    company: "Prime Finance Group",
    email: "michael@primefinance.com.au",
    phone: "+61 3 8765 4321",
    avatar: "/professional-man-broker.png",
    permissions: "View Only",
    lastAccess: "3 days ago",
    sharedItems: 5,
  },
  {
    id: 3,
    name: "Emma Wilson",
    role: "Property Manager",
    company: "Urban Property Management",
    email: "emma@urbanpm.com.au",
    phone: "+61 7 5432 1098",
    avatar: "/professional-woman-manager.png",
    permissions: "Edit & Manage",
    lastAccess: "1 day ago",
    sharedItems: 8,
  },
]

const pendingInvites = [
  { id: 1, email: "david@financialadvisors.com.au", role: "Financial Advisor", sentDate: "Nov 10, 2024" },
]

export function AdvisorsSection() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trusted Advisors</h1>
          <p className="text-muted-foreground">Manage access for your professional advisors</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Advisor
        </Button>
      </div>

      {/* Quick Share */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <h3 className="font-semibold mb-1">One-Click Sharing</h3>
              <p className="text-sm text-muted-foreground">Generate a secure link to share with your advisors</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                <Link2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-mono">theproperty.com/share/jd8x...</span>
              </div>
              <Button variant="outline" size="sm">
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">3</p>
            <p className="text-xs text-muted-foreground">Active Advisors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">25</p>
            <p className="text-xs text-muted-foreground">Shared Documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="w-5 h-5 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">1</p>
            <p className="text-xs text-muted-foreground">Full Access</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-5 h-5 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">1</p>
            <p className="text-xs text-muted-foreground">Pending Invites</p>
          </CardContent>
        </Card>
      </div>

      {/* Advisors List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Advisors</CardTitle>
          <CardDescription>People with access to your property data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {advisors.map((advisor) => (
              <div
                key={advisor.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={advisor.avatar || "/placeholder.svg"} />
                    <AvatarFallback>
                      {advisor.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{advisor.name}</p>
                      <Badge
                        variant={
                          advisor.permissions === "Full Access"
                            ? "default"
                            : advisor.permissions === "Edit & Manage"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs"
                      >
                        {advisor.permissions}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {advisor.role} • {advisor.company}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {advisor.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {advisor.phone}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">Last access: {advisor.lastAccess}</p>
                    <p className="text-muted-foreground">{advisor.sharedItems} items shared</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Permissions
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileText className="w-4 h-4 mr-2" />
                        Manage Shared Data
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <X className="w-4 h-4 mr-2" />
                        Revoke Access
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Invitations</CardTitle>
            <CardDescription>Invitations waiting for acceptance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-4 rounded-lg border border-dashed">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {invite.role} • Sent {invite.sentDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      Resend
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive">
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
