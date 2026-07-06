"""
Seed the default system categories (port of seedDefaults in
backend/src/controllers/categoryController.js).

Usage: python manage.py seed_categories
"""
from django.core.management.base import BaseCommand

from api.models import Category

DEFAULTS = [
    # Income categories
    {'name': 'Rent', 'type': 'income', 'icon': 'home', 'color': '#10B981'},
    {'name': 'Late Fees', 'type': 'income', 'icon': 'clock', 'color': '#F59E0B'},
    {'name': 'Security Deposit', 'type': 'income', 'icon': 'shield', 'color': '#3B82F6'},
    {'name': 'Other Income', 'type': 'income', 'icon': 'plus', 'color': '#6B7280'},
    # Expense categories
    {'name': 'Maintenance', 'type': 'expense', 'icon': 'wrench', 'color': '#EF4444', 'is_tax_deductible': True},
    {'name': 'Repairs', 'type': 'expense', 'icon': 'tool', 'color': '#F97316', 'is_tax_deductible': True},
    {'name': 'Utilities', 'type': 'expense', 'icon': 'zap', 'color': '#8B5CF6', 'is_tax_deductible': True},
    {'name': 'Insurance', 'type': 'expense', 'icon': 'shield', 'color': '#06B6D4', 'is_tax_deductible': True},
    {'name': 'Property Tax', 'type': 'expense', 'icon': 'file-text', 'color': '#EC4899', 'is_tax_deductible': True},
    {'name': 'Mortgage', 'type': 'expense', 'icon': 'home', 'color': '#14B8A6', 'is_tax_deductible': True},
    {'name': 'HOA Fees', 'type': 'expense', 'icon': 'users', 'color': '#6366F1', 'is_tax_deductible': True},
    {'name': 'Legal Fees', 'type': 'expense', 'icon': 'briefcase', 'color': '#A855F7', 'is_tax_deductible': True},
    {'name': 'Advertising', 'type': 'expense', 'icon': 'megaphone', 'color': '#F43F5E', 'is_tax_deductible': True},
    {'name': 'Management Fees', 'type': 'expense', 'icon': 'user', 'color': '#22C55E', 'is_tax_deductible': True},
    {'name': 'Supplies', 'type': 'expense', 'icon': 'package', 'color': '#64748B', 'is_tax_deductible': True},
    {'name': 'Other Expense', 'type': 'expense', 'icon': 'minus', 'color': '#6B7280', 'is_tax_deductible': True},
]


class Command(BaseCommand):
    help = 'Seed default system categories'

    def handle(self, *args, **options):
        for cat in DEFAULTS:
            _, created = Category.objects.get_or_create(
                name=cat['name'],
                type=cat['type'],
                is_system=True,
                defaults={
                    'icon': cat.get('icon'),
                    'color': cat.get('color', '#6B7280'),
                    'is_tax_deductible': cat.get('is_tax_deductible', False),
                },
            )
            if created:
                self.stdout.write(f"Created category: {cat['name']}")
        self.stdout.write(self.style.SUCCESS('Default categories seeded'))
