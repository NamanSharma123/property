from django.db import migrations

# Fills the one gap left in 0004_seed_ocr_templates.py's seed list: a
# document_type for Depreciation Schedule emails. apps.email_inbox.processing
# classifies "Depreciation"/"Depreciation Statement" subjects as
# 'depreciation-schedule' (Req 8/9 of the Unique Email ID OCR spec), and
# OcrTemplate.status is what gates whether that type can auto-process
# (Req 9) — without this row it would never be considered "approved".


def seed_template(apps, schema_editor):
    OcrTemplate = apps.get_model('ocr', 'OcrTemplate')
    OcrTemplate.objects.get_or_create(
        document_type='depreciation-schedule',
        defaults={
            'name': 'Depreciation Schedule',
            'description': 'Depreciation schedule / deductions statement for a property.',
            'status': 'enabled',
            'confidence_threshold': 70.0,
            'version': '1.0',
        },
    )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('ocr', '0005_ocrjob_documentlineitem_ocr_job_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_template, noop_reverse),
    ]
