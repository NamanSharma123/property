export function PropertyCardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-5 bg-gray-200 rounded w-24"></div>
                </div>
                <div>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-5 bg-gray-200 rounded w-24"></div>
                </div>
            </div>
        </div>
    );
}

export function PropertyListSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <PropertyCardSkeleton key={i} />
            ))}
        </div>
    );
}

export function TransactionRowSkeleton() {
    return (
        <tr className="border-b border-gray-100 animate-pulse">
            <td className="px-4 py-3">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
            </td>
            <td className="px-4 py-3">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
            </td>
            <td className="px-4 py-3">
                <div className="h-4 bg-gray-200 rounded w-28"></div>
            </td>
            <td className="px-4 py-3">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
            </td>
            <td className="px-4 py-3">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
            </td>
        </tr>
    );
}

export function TransactionTableSkeleton() {
    return (
        <div className="overflow-hidden">
            <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <TransactionRowSkeleton key={i} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function DashboardMetricSkeleton() {
    return (
        <div className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
            <div className="flex items-center justify-between mb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-32 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <DashboardMetricSkeleton key={i} />
                ))}
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                <TransactionTableSkeleton />
            </div>
        </div>
    );
}

export function BankAccountSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                    <div>
                        <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </div>
                </div>
                <div className="h-6 bg-green-100 rounded-full w-20"></div>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-5 bg-gray-200 rounded w-20"></div>
                </div>
                <div>
                    <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-24"></div>
                </div>
                <div>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-28"></div>
                </div>
            </div>
        </div>
    );
}
