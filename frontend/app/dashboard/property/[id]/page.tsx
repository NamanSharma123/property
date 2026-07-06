import { PropertyDashboard } from '@/app/dashboard/_components/property/dashboard';

export default async function PropertyDetailRoute({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <PropertyDashboard propertyId={id} />;
}
