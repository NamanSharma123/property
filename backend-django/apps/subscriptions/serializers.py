from apps.common.utils import model_row


def plan_row(plan):
    return model_row(plan)


def subscription_row(sub, **extra):
    row = model_row(
        sub,
        user_name=sub.user.name if sub.user_id else None,
        user_email=sub.user.email if sub.user_id else None,
        plan_name=sub.plan.name if sub.plan_id else None,
        plan_monthly_price=str(sub.plan.monthly_price) if sub.plan_id else None,
    )
    row.update(extra)
    return row


def payment_row(payment):
    return model_row(payment)
