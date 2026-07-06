"""
Property endpoints — port of backend/src/controllers/propertyController.js.
"""
import re

from django.db.models import Count, Q, Sum
from rest_framework.response import Response

from ..exceptions import error_response
from ..models import Property, Tenant
from ..utils import (
    coerce_date,
    get_pagination,
    log_activity,
    model_row,
    pagination_payload,
    to_snake,
)
from .base import ProtectedView

VALID_TYPES = ['residential', 'commercial', 'industrial', 'mixed-use', 'land']

TYPE_MAP = {
    'Residential - Investment': 'residential',
    'Residential - Owner Occupied': 'residential',
    'Commercial - Investment': 'commercial',
    'Commercial - Owner Occupied': 'commercial',
    'Industrial': 'industrial',
    'Mixed-Use': 'mixed-use',
    'Land': 'land',
    'residential - investment': 'residential',
    'residential - owner occupied': 'residential',
    'commercial - investment': 'commercial',
    'commercial - owner occupied': 'commercial',
    'industrial': 'industrial',
    'mixed-use': 'mixed-use',
    'land': 'land',
    'residential-investment': 'residential',
    'residential-owner': 'residential',
    'commercial-investment': 'commercial',
    'commercial-owner': 'commercial',
    'residential': 'residential',
    'commercial': 'commercial',
}


def map_property_type(frontend_type):
    if not frontend_type:
        return 'residential'
    normalized = str(frontend_type).strip()
    if normalized in TYPE_MAP:
        return TYPE_MAP[normalized]
    base_type = re.split(r'[\s-]', normalized)[0].lower()
    if base_type in VALID_TYPES:
        return base_type
    return 'residential'


def build_full_address(address):
    if not isinstance(address, dict):
        return ''
    return (
        f"{address.get('street', '')}, {address.get('city', '')}, "
        f"{address.get('state', '')} {address.get('zipCode', '')}"
    )


ALLOWED_UPDATE_FIELDS = [
    'name', 'address', 'type', 'sub_type', 'units', 'occupancy',
    'purchase_price', 'purchase_date', 'current_value', 'monthly_rent',
    'year_built', 'square_feet', 'lot_size', 'bedrooms', 'bathrooms',
    'amenities', 'description', 'images', 'status', 'tax_id', 'notes',
    'loan_details', 'ownership_details', 'ownership', 'has_depreciation', 'usage',
]

DATE_FIELDS = {'purchase_date'}


class PropertyListView(ProtectedView):
    def get(self, request):
        qs = Property.objects.filter(owner_id=request.user.id)

        status = request.query_params.get('status')
        type_ = request.query_params.get('type')
        search = request.query_params.get('search')

        if status:
            qs = qs.filter(status=status)
        if type_:
            qs = qs.filter(type=type_)
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(full_address__icontains=search))

        page, limit, offset = get_pagination(request)
        total = qs.count()
        properties = qs.order_by('-created_at')[offset:offset + limit]

        return Response({
            'success': True,
            'data': {
                'properties': [model_row(p) for p in properties],
                'pagination': pagination_payload(page, limit, total),
            },
        })

    def post(self, request):
        data = request.data
        address = data.get('address') or {}
        has_depreciation = data.get('hasDepreciation')

        prop = Property.objects.create(
            owner_id=request.user.id,
            name=data.get('name'),
            address=address,
            full_address=build_full_address(address) if data.get('address') else '',
            type=map_property_type(data.get('type')),
            sub_type=data.get('subType') or None,
            units=data.get('units') or 1,
            occupancy=data.get('occupancy') or 0,
            purchase_price=data.get('purchasePrice') or None,
            purchase_date=coerce_date(data.get('purchaseDate')) or None,
            current_value=data.get('currentValue') or None,
            monthly_rent=data.get('monthlyRent') or None,
            year_built=data.get('yearBuilt') or None,
            square_feet=data.get('squareFeet') or None,
            lot_size=data.get('lotSize') or None,
            bedrooms=data.get('bedrooms') or None,
            bathrooms=data.get('bathrooms') or None,
            amenities=data.get('amenities') or [],
            description=data.get('description') or None,
            images=data.get('images') or [],
            status=data.get('status') or 'active',
            tax_id=data.get('taxId') or None,
            notes=data.get('notes') or None,
            loan_details=data.get('loanDetails') or {},
            ownership_details=data.get('ownershipDetails') or {},
            ownership=data.get('ownership') or None,
            has_depreciation=has_depreciation in (True, 'yes', 'true'),
            usage=data.get('usage') or None,
        )

        log_activity(request.user.id, 'property_create', request=request,
                     resource_type='property', resource_id=prop.id, success=True)

        return Response({
            'success': True,
            'data': {'property': model_row(prop)},
            'message': 'Property created successfully',
        }, status=201)


class PropertyDetailView(ProtectedView):
    def get(self, request, property_id):
        prop = Property.objects.filter(id=property_id, owner_id=request.user.id).first()
        if not prop:
            return error_response('Property not found', 404)

        tenants = Tenant.objects.filter(property_id=property_id)
        row = model_row(prop, tenants=[model_row(t) for t in tenants])

        return Response({'success': True, 'data': {'property': row}})

    def put(self, request, property_id):
        prop = Property.objects.filter(id=property_id, owner_id=request.user.id).first()
        if not prop:
            return error_response('Property not found', 404)

        updates = {}
        for key, value in request.data.items():
            snake_key = to_snake(key)
            if snake_key not in ALLOWED_UPDATE_FIELDS:
                continue

            if snake_key == 'type':
                value = map_property_type(value)
            elif snake_key == 'has_depreciation':
                value = value in (True, 'yes', 'true')
            elif snake_key in ('loan_details', 'ownership_details'):
                # Never allow null — always valid JSON (matches Node behaviour)
                if value in (None, ''):
                    value = {}
            elif snake_key in DATE_FIELDS:
                value = coerce_date(value)
            updates[snake_key] = value

        if isinstance(request.data.get('address'), dict):
            updates['full_address'] = build_full_address(request.data['address'])

        if not updates:
            return error_response('No valid fields to update', 400)

        for field, value in updates.items():
            setattr(prop, field, value)
        prop.save()

        log_activity(request.user.id, 'property_update', request=request,
                     resource_type='property', resource_id=property_id, success=True)

        return Response({
            'success': True,
            'data': {'property': model_row(prop)},
            'message': 'Property updated successfully',
        })

    def delete(self, request, property_id):
        deleted, _ = Property.objects.filter(id=property_id, owner_id=request.user.id).delete()
        if not deleted:
            return error_response('Property not found', 404)

        log_activity(request.user.id, 'property_delete', request=request,
                     resource_type='property', resource_id=property_id, success=True)

        return Response({'success': True, 'message': 'Property deleted successfully'})


class PropertyStatsView(ProtectedView):
    def get(self, request):
        qs = Property.objects.filter(owner_id=request.user.id)

        stats = qs.aggregate(
            total_properties=Count('id'),
            total_units=Sum('units'),
            total_occupied=Sum('occupancy'),
            total_value=Sum('current_value'),
            total_monthly_rent=Sum('monthly_rent'),
        )

        status_counts = {
            row['status']: row['count']
            for row in qs.values('status').annotate(count=Count('id'))
        }

        return Response({
            'success': True,
            'data': {
                'stats': {
                    'totalProperties': stats['total_properties'] or 0,
                    'totalUnits': int(stats['total_units'] or 0),
                    'totalOccupied': int(stats['total_occupied'] or 0),
                    'totalValue': float(stats['total_value'] or 0),
                    'totalMonthlyRent': float(stats['total_monthly_rent'] or 0),
                },
                'statusCounts': status_counts,
            },
        })
