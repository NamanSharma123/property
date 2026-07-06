"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Building2,
    Plus,
    MapPin,
    DollarSign,
    Percent,
    Calendar,
    MoreHorizontal,
    ExternalLink,
    Edit2,
    Trash2,
    Eye,
    Landmark,
    FileText,
    ArrowUpRight,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const properties = [
    {
        id: 1,
        address: "123 Main Street",
        suburb: "Sydney, NSW 2000",
        type: "Residential",
        status: "active",
        purchaseDate: "March 2019",
        purchasePrice: 580000,
        currentValue: 680000,
        loan: 380000,
        equity: 300000,
        yield: 5.8,
        monthlyRent: 3200,
        occupancy: 100,
        image: "/modern-sydney-apartment.png",
    },
    {
        id: 2,
        address: "456 Oak Avenue",
        suburb: "Melbourne, VIC 3000",
        type: "Residential",
        status: "active",
        purchaseDate: "July 2020",
        purchasePrice: 450000,
        currentValue: 520000,
        loan: 270000,
        equity: 250000,
        yield: 6.2,
        monthlyRent: 2700,
        occupancy: 100,
        image: "/townhouse-melbourne.jpg",
    },
    {
        id: 3,
        address: "789 Business Park",
        suburb: "Brisbane, QLD 4000",
        type: "Commercial",
        status: "active",
        purchaseDate: "January 2022",
        purchasePrice: 320000,
        currentValue: 380000,
        loan: 160000,
        equity: 220000,
        yield: 8.4,
        monthlyRent: 2800,
        occupancy: 95,
        image: "/commercial-office-building-brisbane.jpg",
    },
]

const soldProperties = [
    {
        id: 4,
        address: "321 River Road",
        suburb: "Perth, WA 6000",
        type: "Residential",
        status: "sold",
        purchaseDate: "May 2017",
        soldDate: "August 2023",
        purchasePrice: 380000,
        salePrice: 520000,
        profit: 140000,
        capitalGain: 36.8,
        image: "/house-perth.jpg",
    },
]

export function PortfolioSection() {
    const totalValue = properties.reduce((sum, p) => sum + p.currentValue, 0)
    const totalEquity = properties.reduce((sum, p) => sum + p.equity, 0)
    const totalLoan = properties.reduce((sum, p) => sum + p.loan, 0)
    const avgYield = (properties.reduce((sum, p) => sum + p.yield, 0) / properties.length).toFixed(1)

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header - Stack on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">Property Portfolio</h1>
                    <p className="text-sm sm:text-base text-muted-foreground">Manage and track all your investment properties</p>
                </div>
                <Button className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Property
                </Button>
            </div>

            {/* Quick Stats - 2 cols on mobile */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card>
                    <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Value</p>
                                <p className="text-lg sm:text-xl font-bold">${(totalValue / 1000000).toFixed(2)}M</p>
                            </div>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 ml-2">
                                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">Net Equity</p>
                                <p className="text-lg sm:text-xl font-bold">${(totalEquity / 1000).toFixed(0)}K</p>
                            </div>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 ml-2">
                                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Loans</p>
                                <p className="text-lg sm:text-xl font-bold">${(totalLoan / 1000).toFixed(0)}K</p>
                            </div>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 ml-2">
                                <Landmark className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm text-muted-foreground">Avg Yield</p>
                                <p className="text-lg sm:text-xl font-bold">{avgYield}%</p>
                            </div>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 ml-2">
                                <Percent className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs - Scrollable on mobile */}
            <Tabs defaultValue="active" className="w-full">
                <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="active" className="flex-1 sm:flex-none">
                        Active
                        <Badge variant="secondary" className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs">
                            {properties.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="sold" className="flex-1 sm:flex-none">
                        Sold
                        <Badge variant="secondary" className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs">
                            {soldProperties.length}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-4 sm:mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                        {properties.map((property) => (
                            <PropertyCard key={property.id} property={property} />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="sold" className="mt-4 sm:mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                        {soldProperties.map((property) => (
                            <SoldPropertyCard key={property.id} property={property} />
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function PropertyCard({ property }: { property: (typeof properties)[0] }) {
    const equityPercent = Math.round((property.equity / property.currentValue) * 100)
    const appreciation = Math.round(((property.currentValue - property.purchasePrice) / property.purchasePrice) * 100)

    return (
        <Card className="overflow-hidden group">
            {/* Image - Smaller height on mobile */}
            <div className="relative h-32 sm:h-40 bg-muted overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={property.image || "/placeholder.svg"}
                    alt={property.address}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex gap-1.5 sm:gap-2">
                    <Badge className="bg-white/90 text-foreground hover:bg-white/90 text-[10px] sm:text-xs">
                        {property.type}
                    </Badge>
                    <Badge className="bg-emerald-500 hover:bg-emerald-500 text-[10px] sm:text-xs">Active</Badge>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-white/90 hover:bg-white w-7 h-7 sm:w-8 sm:h-8"
                        >
                            <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit Property
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <FileText className="w-4 h-4 mr-2" />
                            View Documents
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Property Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove Property
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                {/* Address */}
                <div>
                    <h3 className="font-semibold text-base sm:text-lg">{property.address}</h3>
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {property.suburb}
                    </div>
                </div>

                {/* Value & Appreciation */}
                <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-muted/50">
                    <div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Current Value</p>
                        <p className="text-base sm:text-lg font-bold">${property.currentValue.toLocaleString()}</p>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-[10px] sm:text-xs">
                        <ArrowUpRight className="w-3 h-3 mr-0.5" />+{appreciation}%
                    </Badge>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="space-y-0.5 sm:space-y-1">
                        <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                            <DollarSign className="w-3 h-3" />
                            Monthly Rent
                        </div>
                        <p className="font-semibold text-sm">${property.monthlyRent.toLocaleString()}</p>
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                        <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                            <Percent className="w-3 h-3" />
                            Yield
                        </div>
                        <p className="font-semibold text-sm text-emerald-600">{property.yield}%</p>
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                        <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                            <Landmark className="w-3 h-3" />
                            Loan Balance
                        </div>
                        <p className="font-semibold text-sm">${(property.loan / 1000).toFixed(0)}K</p>
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                        <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            Purchased
                        </div>
                        <p className="font-semibold text-sm">{property.purchaseDate}</p>
                    </div>
                </div>

                {/* Equity Progress */}
                <div>
                    <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5 sm:mb-2">
                        <span className="text-muted-foreground">Equity</span>
                        <span className="font-medium">
                            {equityPercent}% (${(property.equity / 1000).toFixed(0)}K)
                        </span>
                    </div>
                    <Progress value={equityPercent} className="h-1.5 sm:h-2" />
                </div>

                {/* Occupancy */}
                <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs sm:text-sm text-muted-foreground">Occupancy</span>
                    <Badge variant={property.occupancy === 100 ? "default" : "secondary"} className="text-[10px] sm:text-xs">
                        {property.occupancy}%
                    </Badge>
                </div>
            </CardContent>
        </Card>
    )
}

function SoldPropertyCard({ property }: { property: (typeof soldProperties)[0] }) {
    return (
        <Card className="overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
            <div className="relative h-32 sm:h-40 bg-muted overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={property.image || "/placeholder.svg"}
                    alt={property.address}
                    className="w-full h-full object-cover grayscale"
                />
                <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex gap-1.5 sm:gap-2">
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">
                        {property.type}
                    </Badge>
                    <Badge variant="outline" className="bg-white/90 text-[10px] sm:text-xs">
                        Sold
                    </Badge>
                </div>
            </div>

            <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                <div>
                    <h3 className="font-semibold text-base sm:text-lg">{property.address}</h3>
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {property.suburb}
                    </div>
                </div>

                <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-emerald-50">
                    <div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Sale Price</p>
                        <p className="text-base sm:text-lg font-bold text-emerald-700">${property.salePrice.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Profit</p>
                        <p className="font-semibold text-sm text-emerald-700">+${property.profit.toLocaleString()}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                    <div>
                        <p className="text-muted-foreground text-[10px] sm:text-xs">Purchase Price</p>
                        <p className="font-medium">${property.purchasePrice.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-[10px] sm:text-xs">Capital Gain</p>
                        <p className="font-medium text-emerald-600">+{property.capitalGain}%</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-[10px] sm:text-xs">Purchased</p>
                        <p className="font-medium">{property.purchaseDate}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-[10px] sm:text-xs">Sold</p>
                        <p className="font-medium">{property.soldDate}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
