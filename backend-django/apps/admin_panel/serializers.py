from datetime import date

from django.db.models import Sum

from apps.common.utils import json_value, model_row


def user_row(user):
    """Same shape as apps.accounts.serializers.format_user, plus the counts
    the admin Users table needs — annotated onto the queryset in the view
    (AdminUserListView), so they're plain attributes here, not relations."""
    row = {
        'id': json_value(user.id),
        'name': user.name,
        'email': user.email,
        'role': user.role,
        'uniqueId': user.unique_id,
        'inboundEmail': user.inbound_email,
        'phone': user.phone,
        'avatar': user.avatar,
        'isEmailVerified': user.is_email_verified,
        'accountStatus': user.account_status,
        'lastLogin': json_value(user.last_login),
        'createdAt': json_value(user.created_at),
        'updatedAt': json_value(user.updated_at),
    }
    for attr, key in (
        ('properties_count', 'propertiesCount'),
        ('transactions_count', 'transactionsCount'),
        ('documents_count', 'documentsCount'),
    ):
        if hasattr(user, attr):
            row[key] = getattr(user, attr)
    return row


def audit_log_row(entry):
    row = model_row(entry, admin_name=entry.admin.name if entry.admin_id else None,
                     admin_email=entry.admin.email if entry.admin_id else None)
    return row


def activity_log_row(entry):
    return model_row(entry)


def property_admin_row(p):
    """Property row for the admin Properties table — adds owner identity and
    the derived money columns the spec asks for (Loan Balance, Monthly
    Income/Expense, Net Cash Flow), computed live rather than duplicated
    onto the Property table itself. A few extra queries per row, but this
    only ever runs over one paginated page (~20 rows) at a time."""
    from apps.loans.models import Loan
    from apps.transactions.models import Transaction

    month_start = date.today().replace(day=1)
    tx = Transaction.objects.filter(property_id=p.id, date__gte=month_start)
    income = float(tx.filter(type='income').aggregate(t=Sum('amount'))['t'] or 0)
    expense = float(tx.filter(type='expense').aggregate(t=Sum('amount'))['t'] or 0)
    loan_balance = float(Loan.objects.filter(property_id=p.id).aggregate(t=Sum('current_balance'))['t'] or 0)

    row = model_row(p, owner_name=p.owner.name if p.owner_id else None, owner_email=p.owner.email if p.owner_id else None)
    row['monthlyIncome'] = income
    row['monthlyExpense'] = expense
    row['netCashFlow'] = income - expense
    row['loanBalance'] = loan_balance
    return row
