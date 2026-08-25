from django.db import migrations

TEMPLATES = [
    ('Bank Statement', 'bank-statement', 'Transactions parsed from a bank/loan account statement.'),
    ('Settlement Statement', 'settlement-statement', 'Property purchase settlement figures.'),
    ('Selling Statement', 'selling-statement', 'Property sale settlement figures.'),
    ('Interest Statement', 'interest-statement', 'Loan interest paid/accrued for a period.'),
    ('Rental Statement', 'rental-statement', 'Property manager rental income/fees statement.'),
    ('Utility Bill', 'utility-bill', 'Water, electricity, gas, council rates and similar bills.'),
    ('Invoice', 'invoice', 'General trade/contractor invoices (repairs, maintenance, etc.).'),
]


def seed_templates(apps, schema_editor):
    OcrTemplate = apps.get_model('ocr', 'OcrTemplate')
    for name, document_type, description in TEMPLATES:
        OcrTemplate.objects.get_or_create(
            document_type=document_type,
            defaults={'name': name, 'description': description, 'status': 'enabled', 'confidence_threshold': 70.0, 'version': '1.0'},
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('ocr', '0003_ocrtemplate_document_reviewed_at_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_templates, noop_reverse),
    ]
