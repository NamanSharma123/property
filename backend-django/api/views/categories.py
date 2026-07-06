"""
Category endpoints — port of backend/src/controllers/categoryController.js.
"""
from django.db.models import Q
from rest_framework.response import Response

from ..exceptions import error_response
from ..models import Category
from ..utils import model_row, to_snake
from .base import ProtectedView

ALLOWED_UPDATE_FIELDS = [
    'name', 'type', 'description', 'icon', 'color', 'parent_id',
    'tax_code', 'is_tax_deductible', 'is_active',
]


class CategoryListView(ProtectedView):
    def get(self, request):
        include_system = request.query_params.get('includeSystem', 'true') == 'true'
        type_ = request.query_params.get('type')

        owner_filter = Q(owner_id=request.user.id)
        if include_system:
            owner_filter |= Q(is_system=True)

        qs = Category.objects.filter(owner_filter, is_active=True)
        if type_:
            qs = qs.filter(Q(type=type_) | Q(type='both'))

        qs = qs.order_by('-is_system', 'name')

        return Response({
            'success': True,
            'data': {'categories': [model_row(c) for c in qs]},
        })

    def post(self, request):
        data = request.data
        category = Category.objects.create(
            owner_id=request.user.id,
            name=data.get('name'),
            type=data.get('type'),
            description=data.get('description') or None,
            icon=data.get('icon') or None,
            color=data.get('color') or '#6B7280',
            parent_id=data.get('parentId') or None,
            tax_code=data.get('taxCode') or None,
            is_tax_deductible=data.get('isTaxDeductible') or False,
        )

        return Response({
            'success': True,
            'data': {'category': model_row(category)},
            'message': 'Category created successfully',
        }, status=201)


class CategoryDetailView(ProtectedView):
    def put(self, request, category_id):
        category = Category.objects.filter(id=category_id).first()
        if not category:
            return error_response('Category not found', 404)

        if category.is_system:
            return error_response('Cannot modify system categories', 403)

        if category.owner_id != request.user.id:
            return error_response('You do not have permission to modify this category', 403)

        updates = {}
        for key, value in request.data.items():
            snake_key = to_snake(key)
            if snake_key in ALLOWED_UPDATE_FIELDS:
                updates[snake_key] = value

        if not updates:
            return error_response('No valid fields to update', 400)

        for field, value in updates.items():
            setattr(category, field, value)
        category.save()

        return Response({
            'success': True,
            'data': {'category': model_row(category)},
            'message': 'Category updated successfully',
        })

    def delete(self, request, category_id):
        category = Category.objects.filter(id=category_id).first()
        if not category:
            return error_response('Category not found', 404)

        if category.is_system:
            return error_response('Cannot delete system categories', 403)

        if category.owner_id != request.user.id:
            return error_response('You do not have permission to delete this category', 403)

        # Soft delete, matching the Node behaviour
        Category.objects.filter(id=category_id).update(is_active=False)

        return Response({'success': True, 'message': 'Category deleted successfully'})
