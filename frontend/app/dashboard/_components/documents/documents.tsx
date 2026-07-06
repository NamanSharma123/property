export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-gray-500">Manage your property documents</p>
        </div>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Upload Document
        </button>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900">Recent Documents</h3>
          <div className="mt-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Lease Agreement - John Smith</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">123 Main St</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Lease</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2023-06-01</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a href="#" className="text-blue-600 hover:text-blue-900">View</a>
                    <a href="#" className="ml-4 text-blue-600 hover:text-blue-900">Download</a>
                  </td>
                </tr> 
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Maintenance Invoice - Plumbing</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">123 Main St</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Invoice</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2023-06-10</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a href="#" className="text-blue-600 hover:text-blue-900">View</a>
                    <a href="#" className="ml-4 text-blue-600 hover:text-blue-900">Download</a>
                  </td>
                </tr>
                */}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}