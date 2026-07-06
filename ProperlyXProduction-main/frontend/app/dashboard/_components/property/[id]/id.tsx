export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  // In a real app, you would fetch the property data based on the ID
  const property = {
    id: params.id,
    name: '123 Main Street',
    address: 'San Francisco, CA 94105',
    units: 4,
    occupancy: 100,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80',
    description: 'Beautiful property in the heart of San Francisco. Recently renovated with modern amenities.',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{property.name}</h1>
        <p className="text-gray-500">{property.address}</p>
      </div>

      <div className="h-96 bg-gray-200 rounded-lg overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={property.image}
          alt={property.name}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Property Details</h3>
          <dl className="mt-4 space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Units</dt>
              <dd className="text-sm font-medium text-gray-900">{property.units}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Occupancy Rate</dt>
              <dd className="text-sm font-medium text-gray-900">{property.occupancy}%</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
          <h3 className="text-lg font-medium text-gray-900">Description</h3>
          <p className="mt-4 text-gray-500">{property.description}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900">Tenants</h3>
        <div className="mt-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lease End</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">John Smith</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Unit 1A</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Dec 2023</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Sarah Johnson</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Unit 2B</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Mar 2024</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}