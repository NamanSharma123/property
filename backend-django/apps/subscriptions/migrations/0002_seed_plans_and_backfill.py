from django.db import migrations

PLANS = [
    ('Free', 0, 1, 5, 'Manual entry, 1 property'),
    ('Pro', 29, 1, None, 'Unlimited properties, OCR, Basiq (once connected)'),
    ('Business', 79, 5, None, 'Multi-user, accountant access'),
    ('Enterprise', 249, None, None, 'Unlimited users, priority support'),
]


def seed_and_backfill(apps, schema_editor):
    SubscriptionPlan = apps.get_model('subscriptions', 'SubscriptionPlan')
    Subscription = apps.get_model('subscriptions', 'Subscription')
    User = apps.get_model('accounts', 'User')

    plans_by_name = {}
    for name, price, users_allowed, ocr_limit, description in PLANS:
        plan, _ = SubscriptionPlan.objects.get_or_create(
            name=name,
            defaults={
                'monthly_price': price,
                'users_allowed': users_allowed if users_allowed is not None else 999999,
                'ocr_limit': ocr_limit,
                'description': description,
            },
        )
        plans_by_name[name] = plan

    free_plan = plans_by_name['Free']
    existing_user_ids = set(Subscription.objects.values_list('user_id', flat=True))
    to_create = [
        Subscription(user_id=user_id, plan=free_plan, status='active', payment_status='paid')
        for user_id in User.objects.exclude(id__in=existing_user_ids).values_list('id', flat=True)
    ]
    Subscription.objects.bulk_create(to_create)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('subscriptions', '0001_initial'),
        ('accounts', '0003_user_inbound_email'),
    ]

    operations = [
        migrations.RunPython(seed_and_backfill, noop_reverse),
    ]
