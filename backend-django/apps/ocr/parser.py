"""
Structured-data extraction from OCR/PDF text — Python port of the
"OCR PARSER v5.0" regex parser in backend/src/controllers/pdfController.js.
"""
import re
from datetime import datetime

CATEGORY_MAP = {
    # Income
    'rental-income': ['rent', 'rental income', 'rental'],
    'other-rental-income': ['other income', 'other rental'],
    'variable-outgoings-received': ['outgoings received', 'variable outgoings rec'],

    # Expenses - Water categories MUST be checked before council-rates
    'water-rates': ['water rates', 'water rate', 'water charges', 'water levy'],
    'water-usage': ['water usage', 'water consumption'],
    'council-rates': ['council rates', 'council rate', 'council levy', 'rates notice'],
    'gardening': ['garden', 'lawn', 'mowing', 'landscap'],
    'accounting-legal': ['accounting', 'legal', 'solicitor', 'conveyancing', 'lawyer'],
    'pest-control': ['pest', 'termite'],
    'management-fees': ['management fee', 'management commission', 'agency fee', 'letting fee', 'agent fee'],
    'property-agent-fees': ['property agent', 'agent other fee', 'agent charges'],
    'adjustment-at-purchase': ['adjustment at purchase', 'purchase adjustment'],
    'gas-electricity': ['gas', 'electricity', 'energy', 'power bill'],
    'repairs-maintenance': ['repair', 'maintenance', 'plumbing', 'electrical', 'fix'],
    'land-tax': ['land tax'],
    'sundry-rental-expenses': ['sundry', 'miscellaneous', 'other expense'],
    'depreciation': ['depreciation', 'deprec'],
    'interest-on-loans': ['interest', 'loan interest', 'mortgage interest'],
    'loan-setup-cost': ['loan setup', 'loan establishment', 'loan application'],
    'lmi': ['lmi', 'lender mortgage insurance', 'mortgage insurance'],
    'bank-fees': ['bank fee', 'bank charge', 'account fee'],
    'insurance': ['insurance', 'premium', 'landlord insurance', 'building insurance'],
    'compliance-testing': ['compliance', 'testing', 'smoke alarm', 'safety check', 'inspection'],
    'advertising': ['advertis', 'marketing', 'tenant search', 'letting campaign'],
    'body-corporate': ['body corporate', 'strata', 'levy', 'owners corporation'],
    'borrowing-expenses': ['borrowing expense', 'borrowing cost', 'loan cost'],
    'cleaning': ['clean', 'cleaning'],
    'variable-outgoings-paid': ['outgoings paid', 'variable outgoings paid'],
    'utility-levy': ['utility levy', 'utility charge'],
    'internet': ['internet', 'broadband', 'nbn'],

    # Cost (capital)
    'purchase-cost': ['purchase cost', 'purchase price', 'acquisition'],
    'stamp-duty': ['stamp duty', 'transfer duty'],
    'conveyancer-fees': ['conveyancer', 'conveyancing fee', 'settlement fee'],
}

DATE_REGEX = r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[a-zA-Z]{3,9}\s+\d{2,4})'
STRICT_AMOUNT_PATTERN = re.compile(r'(\$\s*[\d,]+(?:\.\d{2})?|[\d,]+\.\d{2})')


def clean_amount(value):
    return re.sub(r'[$,\s]', '', value)


def determine_category(description):
    lower = description.lower()
    for category, keywords in CATEGORY_MAP.items():
        if any(k in lower for k in keywords):
            return category
    return 'other'


def is_income_context(line):
    lower = line.lower()
    return any(word in lower for word in ('rent', 'income', 'credit', 'deposit'))


def _parse_date_ts(date_str):
    clean = re.sub(r'[/-]', ' ', date_str).strip()
    for fmt in ('%d %b %Y', '%d %B %Y', '%d %m %Y', '%m %d %Y',
                '%d %b %y', '%d %B %y', '%d %m %y'):
        try:
            return datetime.strptime(clean, fmt).timestamp()
        except ValueError:
            continue
    return None


def extract_data(text):
    lines = text.split('\n')
    properties = []
    current_property = None

    statement_date_pattern = re.compile(
        r'(?:Statement Date|Statement date|Created|Invoice Date|Invoice date)[\s\S]{0,50}?' + DATE_REGEX,
        re.IGNORECASE,
    )
    start_date_pattern = re.compile(
        r'(?:Start Date|Start date|From|Subscription Start)[\s\S]{0,50}?' + DATE_REGEX,
        re.IGNORECASE,
    )
    end_date_pattern = re.compile(
        r'(?:End Date|End date|To|Due Date|Due date)[\s\S]{0,50}?' + DATE_REGEX,
        re.IGNORECASE,
    )
    period_pattern = re.compile(
        r'(?:Statement Period|Period|Statement period|Subscription Period)[\s\S]{0,50}?'
        + DATE_REGEX + r'\s*(?:to|-|–|—)\s*' + DATE_REGEX,
        re.IGNORECASE,
    )

    statement_date = None
    start_date = None
    end_date = None

    m = statement_date_pattern.search(text)
    if m:
        statement_date = m.group(1)
    m = start_date_pattern.search(text)
    if m:
        start_date = m.group(1)
    m = end_date_pattern.search(text)
    if m:
        end_date = m.group(1)
    m = period_pattern.search(text)
    if m:
        start_date = m.group(1)
        end_date = m.group(2)
        if not statement_date:
            statement_date = end_date

    # Smart fallback: collect all dates and infer chronologically
    if not statement_date or not start_date or not end_date:
        all_dates = [m.group(0) for m in re.finditer(DATE_REGEX, text, re.IGNORECASE)
                     if len(m.group(0)) > 5]
        unique_dates = list(dict.fromkeys(all_dates))
        dated = [(d, _parse_date_ts(d)) for d in unique_dates]
        sorted_dates = sorted([(d, ts) for d, ts in dated if ts is not None], key=lambda x: x[1])

        if len(sorted_dates) >= 2:
            first = sorted_dates[0][0]
            last = sorted_dates[-1][0]
            start_date = start_date or first
            end_date = end_date or last
            statement_date = statement_date or last
        elif len(sorted_dates) == 1:
            only = sorted_dates[0][0]
            statement_date = statement_date or only
            end_date = end_date or only

    def get_or_create_property(name):
        nonlocal properties
        for prop in properties:
            if prop['propertyName'] == name:
                return prop
        prop = {
            'propertyName': name,
            'lineItems': [],
            'subtotalMoneyOut': None,
            'subtotalMoneyIn': None,
        }
        properties.append(prop)
        return prop

    for raw_line in lines:
        line = raw_line.strip()
        lower_line = line.lower()

        if not line or len(line) < 5:
            continue

        # Skip summary/total lines
        if any(token in lower_line for token in (
            'total', 'subtotal', 'balance', 'folio summary', 'balance brought',
            'balance carried', 'payments to owner', 'total income', 'total expense',
            'includes gst', 'gst of',
        )):
            continue

        # Skip header lines
        is_header = (
            ('money in' in lower_line and 'money out' in lower_line)
            or ('credit' in lower_line and 'debit' in lower_line and len(line) < 30)
            or lower_line in ('income', 'expenses', 'account')
            or 'statement period' in lower_line
            or ('page' in lower_line and re.search(r'\d+\s*(of|/)\s*\d+', lower_line))
        )
        if is_header:
            continue

        # Skip metadata lines (ABN, license, etc.)
        if (re.match(r'^abn:?\s*\d', line, re.IGNORECASE)
                or re.match(r'^licen[sc]e', line, re.IGNORECASE)
                or re.match(r'^copyright', line, re.IGNORECASE)
                or re.match(r'^created:', line, re.IGNORECASE)
                or re.match(r'^page\s+\d', line, re.IGNORECASE)):
            continue

        # Skip rent rate/frequency lines
        if any(token in lower_line for token in (
            'weekly', 'fortnightly', 'monthly', 'per week', 'per month',
            'per fortnight', 'p/w', 'p/m', 'current tenancy', 'paid to:',
        )):
            continue

        amounts = STRICT_AMOUNT_PATTERN.findall(line)
        if not amounts:
            continue

        valid_amounts = []
        for a in amounts:
            try:
                value = float(clean_amount(a))
            except ValueError:
                continue
            if 1 <= value < 1000000:
                valid_amounts.append({'raw': a, 'value': value})

        if not valid_amounts:
            continue

        # Skip if line has 3+ amounts (likely a summary row)
        if len(valid_amounts) >= 3:
            continue

        description = line
        for amt in amounts:
            description = description.replace(amt, ' ')
        description = re.sub(r'\s+', ' ', description)
        description = re.sub(r'^[-–—:\s]+', '', description)
        description = re.sub(r'[-–—:\s]+$', '', description).strip()

        letters = re.sub(r'[^a-zA-Z]', '', description)
        if len(letters) < 3:
            continue

        if re.match(r'^\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}$', description):
            continue

        income = is_income_context(line)
        primary_amount = valid_amounts[-1]

        tax_value = None
        if len(valid_amounts) == 2:
            first, second = valid_amounts[0]['value'], valid_amounts[1]['value']
            if first < second and first < second * 0.2:
                tax_value = f'{first:.2f}'

        if current_property is None:
            current_property = get_or_create_property('Extracted Transactions')

        current_property['lineItems'].append({
            'description': description,
            'includedTax': tax_value,
            'moneyIn': f"{primary_amount['value']:.2f}" if income else None,
            'moneyOut': f"{primary_amount['value']:.2f}" if not income else None,
            'confidence': 90,
            'category': determine_category(description),
        })

    return {
        'agencyName': None,
        'folioNumber': None,
        'statementPeriod': {
            'from': start_date,
            'to': end_date or statement_date,
        },
        'properties': properties,
        'totalMoneyIn': None,
        'totalMoneyOut': None,
        'rawText': text,
    }
