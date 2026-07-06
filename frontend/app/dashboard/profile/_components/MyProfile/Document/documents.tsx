"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  FolderOpen,
  Upload,
  Search,
  Filter,
  Grid3X3,
  List,
  FileText,
  ImageIcon,
  Download,
  Share2,
  Trash2,
  MoreHorizontal,
  Building2,
  Mail,
  Camera,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"
import { cn } from "@/lib/utils"

const documents = [
  {
    id: 1,
    name: "Settlement Statement - 123 Main St",
    type: "Settlement",
    format: "pdf",
    size: "2.4 MB",
    date: "Mar 15, 2019",
    property: "123 Main Street",
  },
  {
    id: 2,
    name: "Depreciation Schedule FY24",
    type: "Depreciation",
    format: "pdf",
    size: "1.8 MB",
    date: "Jul 1, 2024",
    property: "All Properties",
  },
  {
    id: 3,
    name: "Loan Agreement - NAB",
    type: "Loan",
    format: "pdf",
    size: "3.2 MB",
    date: "Mar 10, 2019",
    property: "123 Main Street",
  },
  {
    id: 4,
    name: "Insurance Certificate",
    type: "Insurance",
    format: "pdf",
    size: "890 KB",
    date: "Nov 1, 2024",
    property: "All Properties",
  },
  {
    id: 5,
    name: "Lease Agreement - Tenant A",
    type: "Lease",
    format: "pdf",
    size: "1.5 MB",
    date: "Jan 15, 2024",
    property: "123 Main Street",
  },
  {
    id: 6,
    name: "Property Inspection Report",
    type: "Inspection",
    format: "pdf",
    size: "4.2 MB",
    date: "Oct 20, 2024",
    property: "456 Oak Avenue",
  },
  {
    id: 7,
    name: "Rates Notice Q4 2024",
    type: "Rates",
    format: "pdf",
    size: "156 KB",
    date: "Oct 1, 2024",
    property: "123 Main Street",
  },
  {
    id: 8,
    name: "Repair Invoice - Plumbing",
    type: "Receipt",
    format: "jpg",
    size: "420 KB",
    date: "Nov 12, 2024",
    property: "123 Main Street",
  },
]

const categories = [
  { name: "All Documents", count: 12, icon: FolderOpen },
  { name: "Settlement", count: 3, icon: FileText },
  { name: "Depreciation", count: 2, icon: FileText },
  { name: "Loan Documents", count: 3, icon: FileText },
  { name: "Insurance", count: 2, icon: FileText },
  { name: "Lease Agreements", count: 2, icon: FileText },
  { name: "Receipts & Invoices", count: 8, icon: FileText },
]

export function DocumentsSection() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Documents & Files</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Store and organize all your property documents</p>
        </div>
        <Button className="w-full sm:w-auto">
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Quick Upload - Stack on mobile */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="text-center sm:text-left">
              <h3 className="font-semibold mb-1 text-sm sm:text-base">Quick Upload Options</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Multiple ways to add documents</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
              <Button variant="outline" size="sm" className="w-full sm:w-auto justify-center bg-transparent">
                <Mail className="w-4 h-4 mr-2" />
                Email to Unique ID
              </Button>
              <Button variant="outline" size="sm" className="w-full sm:w-auto justify-center bg-transparent">
                <Camera className="w-4 h-4 mr-2" />
                Scan Receipt
              </Button>
              <Button variant="outline" size="sm" className="w-full sm:w-auto justify-center bg-transparent">
                <Upload className="w-4 h-4 mr-2" />
                Drag & Drop
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Sidebar - Hidden on mobile, shown as horizontal scroll on tablet */}
        <div className="hidden lg:block w-64 space-y-1 flex-shrink-0">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">Categories</p>
          {categories.map((category) => (
            <button
              key={category.name}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                category.name === "All Documents"
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              <div className="flex items-center gap-2">
                <category.icon className="w-4 h-4" />
                <span>{category.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {category.count}
              </Badge>
            </button>
          ))}
        </div>

        <div className="lg:hidden overflow-x-auto pb-2">
          <div className="flex gap-2">
            {categories.slice(0, 5).map((category) => (
              <Button
                key={category.name}
                variant={category.name === "All Documents" ? "secondary" : "outline"}
                size="sm"
                className="flex-shrink-0 text-xs"
              >
                {category.name}
                <Badge variant="secondary" className="ml-1.5 text-[10px]">
                  {category.count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-3 sm:space-y-4">
          {/* Search & Filters - Stack on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search documents..." className="pl-9" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" className="flex-shrink-0 bg-transparent">
                <Filter className="w-4 h-4" />
              </Button>
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="rounded-r-none"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="rounded-l-none"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Documents */}
          {viewMode === "list" ? (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 hover:bg-muted/50 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {doc.format === "pdf" ? (
                            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                          ) : (
                            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{doc.name}</p>
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                            <Badge variant="secondary" className="text-[10px] sm:text-xs">
                              {doc.type}
                            </Badge>
                            <span className="hidden sm:inline">•</span>
                            <span>{doc.size}</span>
                            <span>•</span>
                            <span>{doc.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 pl-12 sm:pl-0">
                        <Badge
                          variant="outline"
                          className="text-[10px] sm:text-xs truncate max-w-[120px] sm:max-w-none"
                        >
                          <Building2 className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{doc.property}</span>
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share2 className="w-4 h-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {documents.map((doc) => (
                <Card key={doc.id} className="group cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-4">
                    <div className="aspect-square rounded-lg bg-muted/50 flex items-center justify-center mb-2 sm:mb-3 relative">
                      {doc.format === "pdf" ? (
                        <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-primary/50" />
                      ) : (
                        <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 text-primary/50" />
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <Button size="icon" variant="secondary" className="w-7 h-7 sm:w-8 sm:h-8">
                          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                        <Button size="icon" variant="secondary" className="w-7 h-7 sm:w-8 sm:h-8">
                          <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="font-medium text-xs sm:text-sm truncate">{doc.name}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {doc.size} • {doc.date}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
