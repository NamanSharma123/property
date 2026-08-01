from apps.common.utils import model_row


def year_row(year):
    return model_row(year)


def schedule_row(schedule, years=None):
    row = model_row(schedule)
    if years is not None:
        row['years'] = {
            'diminishing_value': [year_row(y) for y in years if y.method == 'diminishing_value'],
            'prime_cost': [year_row(y) for y in years if y.method == 'prime_cost'],
        }
    return row
