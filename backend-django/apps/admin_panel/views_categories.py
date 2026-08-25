"""
Cross-user Category admin views on top of apps.categories.Category — no
new table. Regular users can only create/edit/delete their own categories
(apps/categories/views.py); admins additionally get system-wide categories
(owner=null, is_system=True) and can edit/delete ANY category, plus a
Merge action the user-facing API doesn't have.
"""
from django.db.models import Q
from rest_framework.response import Response

from apps.categories.models import Category
from apps.common.exceptions import error_response
from apps.common.utils import model_row, to_snake
from apps.transactions.models import Transaction

from .base import AdminProtectedView
from .permissions import require_admin_role
from .utils import log_admin_action

ALLOWED_UPDATE_FIELDS = [
    'name', 'type', 'description', 'icon', 'color', 'parent_id',
    'tax_code', 'is_tax_deductible', 'is_active', 'is_system',
]


class AdminCategoryListView(AdminProtectedView):
    def get(self, request):
        params = request.query_params
        qs = Category.objects.select_related('owner')

        if params.get('type'):
            qs = qs.filter(type=params['type'])
        if params.get('isSystem') is not None and params.get('isSystem') != '':
            qs = qs.filter(is_system=params['isSystem'] == 'true')
        if params.get('ownerId'):
            qs = qs.filter(owner_id=params['ownerId'])
        if params.get('search'):
            qs = qs.filter(Q(name__icontains=params['search']))

        qs = qs.order_by('-is_system', 'type', 'name')
        rows = [model_row(c, owner_name=c.owner.name if c.owner_id else None) for c in qs]

        return Response({'success': True, 'data': {'categories': rows}})

    def post(self, request):
        """Admin-created categories are always system categories
        (owner=null) — a per-user one is created through the existing
        /api/categories endpoint instead."""
        require_admin_role(request, allow_support=False)

        data = request.data
        if not data.get('name'):
            return error_response('Name is required', 400)
        if not data.get('type'):
            return error_response('Type is required', 400)

        category = Category.objects.create(
            owner=None,
            name=data['name'],
            type=data['type'],
            description=data.get('description') or None,
            icon=data.get('icon') or None,
            color=data.get('color') or '#6B7280',
            parent_id=data.get('parentId') or None,
            tax_code=data.get('taxCode') or None,
            is_tax_deductible=data.get('isTaxDeductible') or False,
            is_system=True,
        )

        log_admin_action(request.user, 'category.create', request=request, entity_type='category', entity_id=category.id)

        return Response({
            'success': True,
            'data': {'category': model_row(category)},
            'message': 'System category created',
        }, status=201)


class AdminCategoryDetailView(AdminProtectedView):
    allow_support = False

    def put(self, request, category_id):
        category = Category.objects.filter(id=category_id).first()
        if not category:
            return error_response('Category not found', 404)

        updates = {}
        for key, value in request.data.items():
            snake_key = to_snake(key)
            if snake_key in ALLOWED_UPDATE_FIELDS:
                updates[snake_key] = value

        if not updates:
            return error_response('No valid fields to update', 400)

        old_value = {field: getattr(category, field) for field in updates if hasattr(category, field)}
        for field, value in updates.items():
            setattr(category, field, value)
        category.save()

        log_admin_action(request.user, 'category.edit', request=request, entity_type='category',
                          entity_id=category.id, old_value=old_value, new_value=updates)

        return Response({'success': True, 'data': {'category': model_row(category)}, 'message': 'Category updated'})

    def delete(self, request, category_id):
        category = Category.objects.filter(id=category_id).first()
        if not category:
            return error_response('Category not found', 404)

        # Soft delete, same as the user-facing endpoint — keeps historical
        # transactions that reference it intact.
        category.is_active = False
        category.save(update_fields=['is_active'])

        log_admin_action(request.user, 'category.delete', request=request, entity_type='category', entity_id=category.id)

        return Response({'success': True, 'message': 'Category disabled'})


class AdminCategoryMergeView(AdminProtectedView):
    """POST /api/admin/categories/<id>/merge — {intoCategoryId}. Moves every
    transaction on this category onto the target (matching by FK where set,
    and by the free-text category_name OCR-created transactions often only
    have), then disables this one."""
    allow_support = False

    def post(self, request, category_id):
        target_id = request.data.get('intoCategoryId')
        if not target_id:
            return error_response('intoCategoryId is required', 400)
        if str(target_id) == str(category_id):
            return error_response('Cannot merge a category into itself', 400)

        source = Category.objects.filter(id=category_id).first()
        target = Category.objects.filter(id=target_id).first()
        if not source or not target:
            return error_response('Category not found', 404)

        updated_by_fk = Transaction.objects.filter(category_id=category_id).update(
            category_id=target_id, category_name=target.name
        )
        updated_by_name = Transaction.objects.filter(
            category_id__isnull=True, category_name=source.name
        ).update(category_id=target_id, category_name=target.name)

        source.is_active = False
        source.save(update_fields=['is_active'])

        log_admin_action(request.user, 'category.merge', request=request, entity_type='category',
                          entity_id=target.id, new_value={
                              'mergedFrom': str(source.id),
                              'transactionsMoved': updated_by_fk + updated_by_name,
                          })

        return Response({
            'success': True,
            'message': f'Merged "{source.name}" into "{target.name}" ({updated_by_fk + updated_by_name} transaction(s) moved)',
        })
