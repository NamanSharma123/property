"""
Multi-format real-estate statement parser — ported from the standalone
`invoice_ocr_tool` desktop app's `field_extractor.py`.

Unlike `apps.ocr.parser.extract_data` (generic line-by-line regex over raw
text), this works directly on the PDF via `pdfplumber` word bounding-boxes,
so it can detect column layouts (Money In / Money Out, Credit / Debit, ...)
and tag each transaction with the property address it belongs to on
multi-property statements. It only applies to PDFs with extractable text
(digital statements) — scanned PDFs/images still go through the OCR + regex
path in `apps.ocr.parser`.

`extract_transactions_pdf()` / `detect_pdf_addresses()` are used as-is from
the source tool. `to_properties_shape()` is new glue that adapts the flat
transaction list into the `{agencyName, statementPeriod, properties: [...]}`
shape the rest of the OCR app (and the frontend) already expects, so this
can be tried as a first pass with a fallback to the existing parser.
"""
import re

import pdfplumber

from .parser import determine_category

_AMOUNT_RE = re.compile(r'^\$?[\d,]+\.\d{2}$')
_DATE_SLASH_RE = re.compile(r'\b(\d{1,2}/\d{2}/\d{4})\b')

# Leading token of a property-header row: house/unit number, e.g. "85",
# "9A", "2a" (letter-suffix units), "2/35" or "2-35" (unit/range with a
# slash or hyphen). Previously only accepted pure-digit + optional /digit,
# which silently missed any address with a letter-suffix unit or a
# hyphenated range — causing the real property address to go undetected
# and the parser to fall back to whatever address-looking text appeared
# first in the document (often the agency's own letterhead).
_PROPERTY_HEADER_NUM_RE = re.compile(r'^\d{1,4}[a-zA-Z]?(?:[/-]\d{1,4}[a-zA-Z]?)?$')

_SKIP_WORDS = {
    'Total', 'GST', 'Income', 'Expenses', 'Opening', 'Closing', 'Balance',
    'Overview', 'In', 'Out', 'Transferred', 'Transfers', 'Transfer',
    'Net', 'Download', 'Transactions', 'Statement', 'bills', 'invoices',
}


def _parse_amount(s):
    if not s:
        return ""
    s = str(s).strip().replace(',', '').replace('$', '')
    if s.startswith('(') and s.endswith(')'):
        s = '-' + s[1:-1]
    return s if re.match(r'^-?\d+(\.\d+)?$', s) else ""


def extract_statement_meta(text):
    """Return (statement_period, property_address) from raw text."""
    period = ""
    m = re.search(
        r'(\d{1,2}\s+\w+\s+\d{4})\s*[—–\-]+\s*(\d{1,2}\s+\w+\s+\d{4})',
        text)
    if m:
        period = f"{m.group(1)} — {m.group(2)}"

    property_addr = ""
    _ST = (r'(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Court|Ct|Place|Pl|Way|'
           r'Boulevard|Blvd|Lane|Ln|Crescent|Cres|Close|Cl|Circuit|Cct|'
           r'Grove|Gr|Terrace|Tce|Parade|Pde|Highway|Hwy|Square|Sq)')
    _MON = r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)'
    m2 = re.search(
        r'^(\d+(?:[\/\\]\d+)?'
        r'(?!\s+' + _MON + r'\b)'
        r'\s+[A-Za-z][A-Za-z ]*?'
        r'\s+' + _ST + r'\b'
        r'[,\s]*[A-Za-z][A-Za-z ,]*'
        r'(?:\b\d{4}\b)?'
        r'(?:\n[A-Za-z][A-Za-z ,]*\b\d{4}\b)?)',
        text, re.IGNORECASE | re.MULTILINE)
    if m2:
        raw = m2.group(1).strip()
        raw = re.sub(r'\s*\b' + _MON + r'\w*\s+\d{4}\b.*', '', raw,
                     flags=re.IGNORECASE | re.DOTALL)
        pm = re.search(r'\b\d{4}\b', raw)
        if pm:
            raw = raw[:pm.end()]
        property_addr = re.sub(r'\s+', ' ', raw).strip()

    return period, property_addr


def _clean_desc(desc):
    """Strip dates, payment phrases, and noise from description text."""
    desc = re.sub(r'Payment made on\s+\S+.*', '', desc, flags=re.IGNORECASE)
    desc = re.sub(r'Paid on\s+\S+.*', '', desc, flags=re.IGNORECASE)
    desc = re.sub(r'Effective paid to\s+\S+.*', '', desc, flags=re.IGNORECASE)
    desc = re.sub(r'previously\s+\S+.*', '', desc, flags=re.IGNORECASE)
    desc = re.sub(r'Due on\s+\S+.*', '', desc, flags=re.IGNORECASE)
    desc = re.split(r'[·•]', desc)[0]
    return re.sub(r'\s+', ' ', desc).strip()


def _addr_matches(filter_str, prop_addr):
    fl, pl = filter_str.strip().lower(), prop_addr.strip().lower()
    if not fl or not pl:
        return False
    if fl == pl:
        return True
    if fl in pl or pl in fl:
        return fl.split()[0] == pl.split()[0]
    return False


# Matches a property-address line anywhere in a line of text (not just at the
# start), e.g. "2/35 Hurley St, Pimpama QLD 4209" or "Room 1 2/35 Hurley St...".
# Used by _find_property_section_headers below to detect per-property section
# headers in statement formats that print the address as its own line
# (typically followed by "$X per week") rather than as a table column.
_STREET_TYPES_RE = (r'(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Court|Ct|Place|Pl|Way|'
                     r'Boulevard|Blvd|Lane|Ln|Crescent|Cres|Close|Cl|Circuit|Cct|'
                     r'Grove|Gr|Terrace|Tce|Parade|Pde|Highway|Hwy|Square|Sq)')
_ADDRESS_LINE_RE = re.compile(
    r'(\d{1,4}[a-zA-Z]?(?:[/-]\d{1,4}[a-zA-Z]?)?'
    r'\s+[A-Za-z][A-Za-z\' ]*?'
    r'\s+' + _STREET_TYPES_RE + r'\b'
    r'(?:[,\s]+[A-Za-z][A-Za-z ]*\s+[A-Z]{2,3}\s+\d{4})?)',
    re.IGNORECASE,
)


def _find_property_section_headers(words, y_min, y_max):
    """
    Scan words between y_min/y_max for lines that look like a property
    address (optionally prefixed, e.g. "Room 1 2/35 Hurley St, ..."). Used to
    tag transactions with the right property in statement formats (Format A's
    generic "Transactions" heading) that print the address as its own line
    rather than as an explicit table column. Returns [(y, address), ...]
    sorted by y.
    """
    lines = {}
    for w in words:
        if y_min < w['top'] < y_max:
            lines.setdefault(round(w['top'], 1), []).append(w)

    headers = []
    for y in sorted(lines):
        line_words = sorted(lines[y], key=lambda w: w['x0'])
        line_text = ' '.join(w['text'] for w in line_words)
        m = _ADDRESS_LINE_RE.search(line_text)
        if m:
            addr = re.sub(r'\s+', ' ', m.group(1)).strip().rstrip(',')
            headers.append((y, addr))
    return headers


def _property_for_y_generic(headers, y):
    prop = ''
    for hy, addr in headers:
        if hy <= y:
            prop = addr
        else:
            break
    return prop


# ─── Format G: "RENT INCOME SUMMARY FOR PERIOD" + "MONEY OUT MONEY IN" fee table ──
# Single-property ownership statements where rent income lives in its own
# summary table (columns: Property, Tenancy, Rent Period Amount, Paid
# From/To, Effective Date, Part Payment, PAID) rather than a Money In/Out
# table — none of the other detectors recognise this table shape at all, so
# statements using it lose their rent income entirely.

_EOFY_ALL_PROPERTIES_RE = re.compile(r'Total\s+for\s+all\s+properties', re.IGNORECASE)
# Labels used under a "Total For All Properties" heading — the summary card
# just says "Income" / "Expenses" (not spelled out as "Total ...").
_EOFY_INCOME_RE = re.compile(r'\bIncome\b[\s\S]{0,20}?\$?\s*([\d,]+\.\d{2})', re.IGNORECASE)
_EOFY_EXPENSE_RE = re.compile(r'\bExpenses?\b[\s\S]{0,20}?\$?\s*([\d,]+\.\d{2})', re.IGNORECASE)


def _has_eofy_summary_format(text):
    """
    End-of-financial-year statements are reconciliation summaries, not
    transaction ledgers — the individual transactions were already entered
    from statements received throughout the year, so re-extracting every
    line item here would double-count them. All that's needed is the two
    portfolio totals, for the user to check against what they've already
    recorded.

    Gated strictly on the "Total For All Properties" portfolio-summary
    heading rather than on bare "Total income"/"Total expenses" labels —
    plenty of ordinary single-period statements also print their own
    period totals under those exact labels, and matching on that alone
    hijacked real per-transaction extraction on regular statements (see
    fixture regression: "Statement sample 9/11.pdf").
    """
    return bool(text) and bool(_EOFY_ALL_PROPERTIES_RE.search(text))


def _extract_eofy_summary_format(text, property_addr, statement_period):
    anchor_m = _EOFY_ALL_PROPERTIES_RE.search(text)
    search_text = text[anchor_m.end():anchor_m.end() + 400] if anchor_m else text
    income_m = _EOFY_INCOME_RE.search(search_text)
    expense_m = _EOFY_EXPENSE_RE.search(search_text)

    date_m = re.search(r'(\d{1,2}\s+\w+\s+\d{4})\s*$', statement_period.strip()) if statement_period else None
    date = date_m.group(1) if date_m else ""

    transactions = []
    if income_m:
        transactions.append({
            "date": date,
            "description": "EOFY Statement — Total Income (reconciliation)",
            "amount_in": _parse_amount(income_m.group(1)),
            "amount_out": "",
            "property_address": property_addr,
        })
    if expense_m:
        transactions.append({
            "date": date,
            "description": "EOFY Statement — Total Expense (reconciliation)",
            "amount_in": "",
            "amount_out": _parse_amount(expense_m.group(1)),
            "property_address": property_addr,
        })
    return transactions


def _has_rent_income_summary_format(words):
    for w in sorted(words, key=lambda x: x['top']):
        if w['text'] == 'RENT':
            same_line = sorted(
                [w2 for w2 in words if abs(w2['top'] - w['top']) <= 2],
                key=lambda x: x['x0']
            )
            texts = [w2['text'] for w2 in same_line]
            if 'INCOME' in texts and 'SUMMARY' in texts:
                return True
    return False


def _extract_rent_income_summary_format(words):
    transactions = []

    header_y = property_col_x0 = tenancy_col_x0 = paid_col_x = None
    for w in sorted(words, key=lambda x: x['top']):
        if w['text'] == 'Property' and w['x0'] < 80:
            same_line = sorted(
                [w2 for w2 in words if abs(w2['top'] - w['top']) <= 2],
                key=lambda x: x['x0']
            )
            texts = [w2['text'] for w2 in same_line]
            if 'Tenancy' not in texts:
                continue
            header_y = w['top']
            property_col_x0 = w['x0']
            for w2 in same_line:
                if w2['text'] == 'Tenancy' and tenancy_col_x0 is None:
                    tenancy_col_x0 = w2['x0']
                if w2['text'] == 'PAID' and paid_col_x is None:
                    paid_col_x = (w2['x0'] + w2['x1']) / 2
            break

    if header_y is None or paid_col_x is None:
        return transactions

    # Data starts a couple of lines below the (possibly wrapped) header and
    # runs until the "Total rent for period" row.
    stop_y = float('inf')
    for w in sorted(words, key=lambda x: x['top']):
        if w['top'] <= header_y:
            continue
        if w['text'] == 'Total' and w['x0'] < 80:
            same_line = sorted(
                [w2 for w2 in words if abs(w2['top'] - w['top']) <= 2],
                key=lambda x: x['x0']
            )
            if any(w2['text'] == 'rent' for w2 in same_line):
                stop_y = w['top']
                break

    COL_TOL = 30
    for w in sorted(words, key=lambda x: x['top']):
        if w['top'] <= header_y + 5 or w['top'] >= stop_y:
            continue
        if not _AMOUNT_RE.match(w['text']):
            continue
        cx = (w['x0'] + w['x1']) / 2
        if abs(cx - paid_col_x) >= COL_TOL:
            continue

        val = _parse_amount(w['text'])
        if not val or float(val) == 0:
            continue

        amt_y = w['top']
        prop_words = sorted(
            [dw for dw in words
             if abs(dw['top'] - amt_y) < 4
             and property_col_x0 <= dw['x0'] < tenancy_col_x0],
            key=lambda dw: dw['x0']
        )
        property_addr = ' '.join(dw['text'] for dw in prop_words).strip()
        if not property_addr:
            continue

        transactions.append({
            'date': '',
            'description': 'Rent',
            'amount_in': val,
            'amount_out': '',
            'property_address': property_addr,
        })

    return transactions


def _extract_generic_money_table(words, property_addr, skip_first_words):
    """
    A "<description column> ... MONEY OUT MONEY IN" table without the strict
    "OWNERSHIP"+"STATEMENT" header gating that Format D requires — used as a
    companion pass for single-property statements (e.g. Format G) whose fee
    table lives further down the page under a different heading. Stops at
    "WITHHELD" or a following all-different major section (best-effort).
    """
    transactions = []

    header_y = desc_col_x0 = money_out_x = money_in_x = None
    for w in sorted(words, key=lambda x: x['top']):
        if w['text'] != 'MONEY':
            continue
        same_line = sorted(
            [w2 for w2 in words if abs(w2['top'] - w['top']) <= 2],
            key=lambda x: x['x0']
        )
        texts = [w2['text'] for w2 in same_line]
        if 'OUT' not in texts or 'IN' not in texts:
            continue
        header_y = w['top']
        desc_col_x0 = same_line[0]['x0']
        i = 0
        while i < len(same_line):
            if same_line[i]['text'] == 'MONEY' and i + 1 < len(same_line):
                nxt = same_line[i + 1]
                if nxt['text'] == 'OUT' and money_out_x is None:
                    money_out_x = (same_line[i]['x0'] + nxt['x1']) / 2
                elif nxt['text'] == 'IN' and money_in_x is None:
                    money_in_x = (same_line[i]['x0'] + nxt['x1']) / 2
            i += 1
        break

    if header_y is None or money_out_x is None:
        return transactions

    stop_y = float('inf')
    for w in sorted(words, key=lambda x: x['top']):
        if w['top'] <= header_y:
            continue
        if w['text'] in ('WITHHELD', 'OWNERSHIP'):
            stop_y = w['top']
            break

    COL_TOL = 35
    desc_x_max = min(money_out_x, money_in_x) - COL_TOL

    for w in sorted(words, key=lambda x: x['top']):
        if w['top'] <= header_y or w['top'] >= stop_y:
            continue
        if not _AMOUNT_RE.match(w['text']):
            continue

        cx = (w['x0'] + w['x1']) / 2
        col = None
        if abs(cx - money_out_x) < COL_TOL:
            col = 'out'
        elif abs(cx - money_in_x) < COL_TOL:
            col = 'in'
        if col is None:
            continue

        val = _parse_amount(w['text'])
        if not val or float(val) == 0:
            continue

        amt_y = w['top']
        desc_words = sorted(
            [dw for dw in words
             if abs(dw['top'] - amt_y) < 3
             and desc_col_x0 <= dw['x0'] < desc_x_max
             and not _AMOUNT_RE.match(dw['text'])],
            key=lambda dw: dw['x0']
        )
        raw_desc = ' '.join(dw['text'] for dw in desc_words).strip()
        if not raw_desc:
            continue
        first_word = raw_desc.split()[0]
        if first_word in skip_first_words:
            continue
        if raw_desc.strip().lower().startswith(('subtotal', 'sub total', 'sub-total', 'total')):
            continue

        clean = _clean_desc(raw_desc)
        if not clean or len(clean) < 3:
            continue

        transactions.append({
            'date': '',
            'description': clean[:120],
            'amount_in': val if col == 'in' else '',
            'amount_out': val if col == 'out' else '',
            'property_address': property_addr,
        })

    return transactions


# ─── Format H: generic "Description ... <out-col> ... <in-col>" ledger with
# property addresses as their own header lines (no "Transactions"/"Transfers"
# trigger words to anchor on, unlike Format A) ──
# Different vendors label the same two columns differently — Disbursed/
# Credited, Debit/Credit, Paid/Received, etc. Rather than hand-coding a new
# format per label pair, detect any known pair and reuse the same
# address-section-header tagging as Format A.
_MONEY_COLUMN_SYNONYMS = [
    ('Disbursed', 'Credited'),
    ('Debit', 'Credit'),
    ('Paid', 'Received'),
    ('Expense', 'Income'),
]


def _find_money_column_header(words):
    """
    Look for a header row containing one of the known out/in column-label
    pairs. Returns (header_y, out_x, in_x) or (None, None, None).

    Rejects lines where a label is immediately followed by an actual dollar
    amount (e.g. a summary sentence like "Credited $5,364.40 Disbursed
    $1,872.63") — a real column header has the labels on their own,
    optionally with a "($)" suffix, not a value.
    """
    for w in sorted(words, key=lambda x: x['top']):
        for out_word, in_word in _MONEY_COLUMN_SYNONYMS:
            if w['text'].rstrip('($)') != out_word:
                continue
            same_line = sorted(
                [w2 for w2 in words if abs(w2['top'] - w['top']) <= 2],
                key=lambda x: x['x0']
            )
            in_match = next((w2 for w2 in same_line if w2['text'].rstrip('($)') == in_word), None)
            if not in_match:
                continue

            def _next_word_is_amount(label_word):
                after = [w2 for w2 in same_line if w2['x0'] > label_word['x1']]
                if not after:
                    return False
                nxt = min(after, key=lambda w2: w2['x0'])
                return bool(re.match(r'^\$[\d,]+\.\d{2}$', nxt['text']))

            if _next_word_is_amount(w) or _next_word_is_amount(in_match):
                continue

            return w['top'], (w['x0'] + w['x1']) / 2, (in_match['x0'] + in_match['x1']) / 2
    return None, None, None


def _has_generic_ledger_format(words):
    header_y, _, _ = _find_money_column_header(words)
    return header_y is not None


def _extract_generic_ledger_format(words):
    transactions = []

    header_y, out_x, in_x = _find_money_column_header(words)
    if header_y is None:
        return transactions

    # Property address headers can appear before the column-header row (a
    # single-property statement's address printed above the ledger table) or
    # after it (repeated per-property blocks in a multi-property statement) —
    # scan the whole page either way.
    section_headers = _find_property_section_headers(words, 0, float('inf'))

    COL_TOL = 35
    DESC_RANGE = 3
    left_boundary = min(in_x, out_x) - COL_TOL

    for w in sorted(words, key=lambda x: x['top']):
        if w['top'] <= header_y:
            continue
        if not _AMOUNT_RE.match(w['text']):
            continue

        cx = (w['x0'] + w['x1']) / 2
        col = None
        if abs(cx - out_x) < COL_TOL:
            col = 'out'
        elif abs(cx - in_x) < COL_TOL:
            col = 'in'
        if col is None:
            continue

        val = _parse_amount(w['text'])
        if not val or float(val) == 0:
            continue

        amt_y = w['top']
        desc_words = sorted(
            [dw for dw in words
             if dw['x1'] < left_boundary
             and abs(dw['top'] - amt_y) < DESC_RANGE
             and not _AMOUNT_RE.match(dw['text'])],
            key=lambda dw: dw['x0']
        )
        raw_desc = ' '.join(dw['text'] for dw in desc_words).strip()
        if not raw_desc or raw_desc.strip().lower().startswith(('total', 'subtotal', 'sub total', 'sub-total')):
            continue

        clean = _clean_desc(raw_desc)
        if not clean or len(clean) < 3:
            continue

        transactions.append({
            'date': '',
            'description': clean[:120],
            'amount_in': val if col == 'in' else '',
            'amount_out': val if col == 'out' else '',
            'property_address': _property_for_y_generic(section_headers, amt_y),
        })

    return transactions


# ─── Format D: MRI Real Estate "OWNERSHIP STATEMENT" (MONEY OUT / MONEY IN) ──

def _has_ownership_statement_format(words):
    for w in words:
        if w['text'] == 'OWNERSHIP' and w['x0'] < 50 and w['top'] < 120:
            same_y = [w2['text'] for w2 in words if abs(w2['top'] - w['top']) <= 2]
            if 'STATEMENT' in same_y:
                return True
    return False


def _extract_ownership_statement_format(words):
    transactions = []

    money_out_x = money_in_x = prop_y = None
    prop_col_x0 = prop_col_x1 = None
    desc_col_x0 = 0

    for w in sorted(words, key=lambda x: x['top']):
        if w['text'] == 'MONEY':
            same_line = sorted(
                [w2 for w2 in words if abs(w2['top'] - w['top']) <= 2],
                key=lambda x: x['x0']
            )
            texts = [w2['text'] for w2 in same_line]
            if 'OUT' in texts and 'IN' in texts:
                prop_y = w['top']
                i = 0
                while i < len(same_line):
                    if same_line[i]['text'] == 'MONEY' and i + 1 < len(same_line):
                        nxt = same_line[i + 1]
                        if nxt['text'] == 'OUT' and money_out_x is None:
                            money_out_x = (same_line[i]['x0'] + nxt['x1']) / 2
                        elif nxt['text'] == 'IN' and money_in_x is None:
                            money_in_x = (same_line[i]['x0'] + nxt['x1']) / 2
                    i += 1
                for idx, w2 in enumerate(same_line):
                    if w2['text'] == 'Property' and prop_col_x0 is None:
                        prop_col_x0 = w2['x0'] - 5
                        prop_col_x1 = same_line[idx + 1]['x0'] if idx + 1 < len(same_line) else w2['x1'] + 150
                    if w2['text'] == 'Description' and desc_col_x0 == 0:
                        desc_col_x0 = w2['x0']
                break

    if money_out_x is None or prop_y is None:
        return transactions

    stop_y = float('inf')
    for w in sorted(words, key=lambda x: x['top']):
        if w['top'] <= prop_y:
            continue
        if w['text'] == 'WITHHELD':
            stop_y = w['top']
            break
        if w['text'] == 'Ownership':
            same_y = [w2['text'] for w2 in words if abs(w2['top'] - w['top']) <= 2]
            if 'Summary' in same_y:
                stop_y = w['top']
                break

    COL_TOL = 35
    DESC_X_MAX = 420

    def _desc_in_range(y_min, y_max, x_min=0):
        line = sorted(
            [dw for dw in words
             if y_min <= dw['top'] <= y_max
             and dw['x0'] >= x_min
             and dw['x0'] < DESC_X_MAX],
            key=lambda dw: dw['x0']
        )
        parts = []
        for dw in line:
            if dw['text'].startswith('(') or dw['text'] == ')':
                break
            if not _AMOUNT_RE.match(dw['text']):
                parts.append(dw['text'])
        return ' '.join(parts).strip()

    last_property = ''

    for w in sorted(words, key=lambda x: x['top']):
        if w['top'] <= prop_y or w['top'] >= stop_y:
            continue
        if not _AMOUNT_RE.match(w['text']):
            continue

        cx = (w['x0'] + w['x1']) / 2
        col = None
        if abs(cx - money_out_x) < COL_TOL:
            col = 'out'
        elif money_in_x and abs(cx - money_in_x) < COL_TOL:
            col = 'in'
        if col is None:
            continue

        val = _parse_amount(w['text'])
        if not val or float(val) == 0:
            continue

        amt_y = w['top']

        row_property = ''
        if prop_col_x0 is not None and prop_col_x1 is not None:
            has_date = any(
                _DATE_SLASH_RE.search(dw['text'])
                for dw in words
                if abs(dw['top'] - amt_y) < 4 and dw['x0'] < prop_col_x0
            )
            if has_date:
                prop_words = sorted(
                    [dw for dw in words
                     if abs(dw['top'] - amt_y) < 4
                     and prop_col_x0 <= dw['x0'] < prop_col_x1
                     and not _AMOUNT_RE.match(dw['text'])],
                    key=lambda dw: dw['x0']
                )
                row_property = ' '.join(dw['text'] for dw in prop_words).strip()
        if row_property:
            last_property = row_property

        if col == 'in':
            raw_desc = _desc_in_range(amt_y - 2, amt_y + 2)
        else:
            company = _desc_in_range(amt_y - 10, amt_y - 1)
            detail = _desc_in_range(amt_y + 1, amt_y + 12)
            if company and detail:
                raw_desc = f"{company} - {detail}"
            elif company or detail:
                raw_desc = company or detail
            else:
                raw_desc = _desc_in_range(amt_y - 2, amt_y + 2)

        if not raw_desc or len(raw_desc) < 3:
            continue

        if raw_desc.lower().startswith(('total', 'subtotal', 'sub total', 'sub-total')):
            continue

        transactions.append({
            'date': '',
            'description': raw_desc[:120],
            'amount_in': val if col == 'in' else '',
            'amount_out': val if col == 'out' else '',
            'property_address': row_property or last_property,
        })

    return transactions


# ─── Format E: "Owner Statement" with Income/Credit and Expenses/Debit ────────

def _has_owner_statement_format(words):
    for w in words:
        if w['text'] == 'Owner' and w['x0'] > 600 and w['top'] < 120:
            same_y = [w2['text'] for w2 in words if abs(w2['top'] - w['top']) <= 2]
            if 'Statement' in same_y:
                return True
    return False


def _extract_owner_statement_format(words):
    transactions = []

    income_y = expenses_y = None
    payments_y = float('inf')
    for w in sorted(words, key=lambda x: x['top']):
        if w['text'] == 'Income' and w['x0'] < 100 and income_y is None:
            income_y = w['top']
        elif w['text'] == 'Expenses' and w['x0'] < 100 and expenses_y is None:
            expenses_y = w['top']
        elif w['text'] == 'Payments' and w['x0'] < 100:
            payments_y = w['top']
            break

    if income_y is None and expenses_y is None:
        return transactions

    AMT_X_MIN = 1050
    DESC_X_MAX = 930

    _SKIP_ROW_WORDS = {'Total', 'Includes', 'Balance'}

    for w in sorted(words, key=lambda x: x['top']):
        if w['top'] >= payments_y:
            break
        if not _AMOUNT_RE.match(w['text']):
            continue
        if w['x0'] < AMT_X_MIN:
            continue

        val = _parse_amount(w['text'])
        if not val or float(val) == 0:
            continue

        amt_y = w['top']

        if income_y is not None and expenses_y is not None and income_y < amt_y < expenses_y:
            col = 'in'
        elif expenses_y is not None and amt_y > expenses_y:
            col = 'out'
        else:
            continue

        row_texts = {dw['text'] for dw in words if abs(dw['top'] - amt_y) < 3}
        if row_texts & _SKIP_ROW_WORDS:
            continue

        desc_words = sorted(
            [dw for dw in words
             if abs(dw['top'] - amt_y) < 3
             and dw['x0'] < DESC_X_MAX],
            key=lambda dw: dw['x0']
        )
        raw_desc = ' '.join(dw['text'] for dw in desc_words).strip()

        if not raw_desc:
            raw_desc = 'Income' if col == 'in' else 'Expense'

        date_m = re.search(r'\b(\d{1,2}/\d{2}/\d{2,4})\b', raw_desc)
        date = date_m.group(1) if date_m else ''

        clean = re.sub(r'^\d{1,2}/\d{2}/\d{2,4}\s*[-–]\s*', '', raw_desc).strip()
        clean = _clean_desc(clean)
        if not clean or len(clean) < 2:
            clean = 'Income' if col == 'in' else 'Expense'

        transactions.append({
            'date': date,
            'description': clean[:120],
            'amount_in': val if col == 'in' else '',
            'amount_out': val if col == 'out' else '',
        })

    return transactions


# ─── Format F: "Folio Summary" Account/Money Out/Money In ───────────────────

def _has_account_folio_format(words):
    for w in words:
        if w['text'] == 'Account' and w['x0'] < 80:
            same_y = [w2['text'] for w2 in words if abs(w2['top'] - w['top']) <= 2]
            if 'Money' in same_y and 'Out' in same_y and 'In' in same_y:
                return True
    return False


def _extract_account_folio_format(words):
    transactions = []

    header_y = money_out_x = money_in_x = None
    for w in sorted(words, key=lambda x: x['top']):
        if w['text'] == 'Account' and w['x0'] < 80:
            same_line = sorted(
                [w2 for w2 in words if abs(w2['top'] - w['top']) <= 2],
                key=lambda x: x['x0']
            )
            texts = [w2['text'] for w2 in same_line]
            if 'Money' in texts and 'Out' in texts and 'In' in texts:
                header_y = w['top']
                i = 0
                while i < len(same_line):
                    if same_line[i]['text'] == 'Money' and i + 1 < len(same_line):
                        nxt = same_line[i + 1]
                        if nxt['text'] == 'Out' and money_out_x is None:
                            money_out_x = (same_line[i]['x0'] + nxt['x1']) / 2
                        elif nxt['text'] == 'In' and money_in_x is None:
                            money_in_x = (same_line[i]['x0'] + nxt['x1']) / 2
                    i += 1
                break

    if header_y is None or money_out_x is None:
        return transactions

    stop_y = float('inf')
    for w in sorted(words, key=lambda x: x['top']):
        if w['top'] <= header_y:
            continue
        if w['text'] == 'Account' and w['x0'] < 80:
            same_y_texts = [w2['text'] for w2 in words if abs(w2['top'] - w['top']) <= 2]
            if 'Transactions' in same_y_texts:
                stop_y = w['top']
                break

    COL_TOL = 35
    DESC_X_MAX = 430
    _SKIP_FIRST = {'Total', 'Subtotal', 'Balance', 'GST', 'Account'}

    for w in sorted(words, key=lambda x: x['top']):
        if w['top'] <= header_y or w['top'] >= stop_y:
            continue
        if not _AMOUNT_RE.match(w['text']):
            continue
        if w['x0'] < DESC_X_MAX:
            continue

        val = _parse_amount(w['text'])
        if not val or float(val) == 0:
            continue

        cx = (w['x0'] + w['x1']) / 2
        col = None
        if abs(cx - money_out_x) < COL_TOL:
            col = 'out'
        elif money_in_x and abs(cx - money_in_x) < COL_TOL:
            col = 'in'
        if col is None:
            continue

        amt_y = w['top']

        desc_words = sorted(
            [dw for dw in words
             if abs(dw['top'] - amt_y) < 3
             and dw['x1'] < DESC_X_MAX
             and dw['text'] not in {'*', '+'}
             and not _AMOUNT_RE.match(dw['text'])],
            key=lambda dw: dw['x0']
        )
        raw_desc = ' '.join(dw['text'] for dw in desc_words).strip()

        if not raw_desc:
            continue

        first_word = raw_desc.split()[0]
        if first_word in _SKIP_FIRST:
            continue

        clean = _clean_desc(raw_desc)
        if not clean or len(clean) < 3:
            continue

        transactions.append({
            'date': '',
            'description': clean[:120],
            'amount_in': val if col == 'in' else '',
            'amount_out': val if col == 'out' else '',
        })

    return transactions


# ─── Format C: "Details for … Money Out  Money In" ──────────────────────────

def _has_details_for_format(words):
    for w in words:
        if w['text'] == 'Details' and w['x0'] < 80:
            same_y = [w2['text'] for w2 in words if abs(w2['top'] - w['top']) <= 2]
            if 'Money' in same_y and 'Out' in same_y:
                return True
    return False


_DETAILS_SKIP_STARTS = {
    'Balance', 'Total', 'Rented', 'Tenant', 'GST', 'Details', 'Account',
}


def _combine_format_c_pages(pdf):
    all_words = []
    y_offset = 0.0
    for page in pdf.pages:
        words = page.extract_words(keep_blank_chars=False)
        for w in words:
            wc = dict(w)
            wc['top'] = w['top'] + y_offset
            all_words.append(wc)
        y_offset += float(page.height)
    return all_words


def _extract_details_for_format(words):
    transactions = []

    money_out_x = money_in_x = details_y = None
    for w in sorted(words, key=lambda x: x['top']):
        if w['text'] == 'Details' and w['x0'] < 80:
            details_y = w['top']
            same_line = sorted(
                [w2 for w2 in words if abs(w2['top'] - w['top']) <= 2],
                key=lambda x: x['x0']
            )
            for w2 in same_line:
                if w2['text'] == 'Money':
                    nxt = [w3 for w3 in same_line if w3['x0'] > w2['x1']]
                    if nxt:
                        nxt = min(nxt, key=lambda x: x['x0'])
                        cx = (w2['x0'] + nxt['x1']) / 2
                        if nxt['text'] == 'Out' and money_out_x is None:
                            money_out_x = cx
                        elif nxt['text'] == 'In' and money_in_x is None:
                            money_in_x = cx
            break

    if money_out_x is None or details_y is None:
        return transactions

    stop_y = float('inf')
    for w in words:
        if w['text'] == 'Account' and w['x0'] < 80:
            same_y_texts = [w2['text'] for w2 in words if abs(w2['top'] - w['top']) <= 2]
            if 'Transactions' in same_y_texts:
                stop_y = w['top']
                break

    COL_TOL = 35
    desc_cut = money_out_x - COL_TOL

    property_headers = []
    for w in sorted(words, key=lambda x: x['top']):
        if w['top'] <= details_y or w['top'] >= stop_y:
            continue
        if _PROPERTY_HEADER_NUM_RE.match(w['text']) and w['x0'] < 80:
            row_words = sorted(
                [w2 for w2 in words
                 if abs(w2['top'] - w['top']) <= 2 and w2['x0'] < desc_cut],
                key=lambda x: x['x0']
            )
            addr = ' '.join(w2['text'] for w2 in row_words).strip()
            if addr and len(row_words) >= 2:
                property_headers.append((w['top'], addr))

    def _property_for_y(y):
        prop = ''
        for prop_y, addr in property_headers:
            if prop_y < y:
                prop = addr
            else:
                break
        return prop

    for w in words:
        if w['top'] <= details_y or w['top'] >= stop_y:
            continue
        if not _AMOUNT_RE.match(w['text']):
            continue
        if w['x0'] < desc_cut:
            continue

        val = _parse_amount(w['text'])
        if not val or float(val) == 0:
            continue

        cx = (w['x0'] + w['x1']) / 2
        col = None
        if abs(cx - money_out_x) < COL_TOL:
            col = 'out'
        elif money_in_x and abs(cx - money_in_x) < COL_TOL:
            col = 'in'
        if col is None:
            continue

        amt_y = w['top']

        desc_words = sorted(
            [dw for dw in words
             if abs(dw['top'] - amt_y) < 3
             and dw['x1'] < desc_cut
             and dw['text'] not in {'*', '+'}],
            key=lambda dw: dw['x0']
        )
        raw_desc = ' '.join(dw['text'] for dw in desc_words).strip()

        if not raw_desc or raw_desc.startswith('$') or raw_desc.startswith('(') or raw_desc.startswith('+'):
            above_words = sorted(
                [dw for dw in words
                 if -20 <= dw['top'] - amt_y < -2
                 and dw['x1'] < desc_cut
                 and dw['text'] not in {'*', '+'}],
                key=lambda dw: dw['x0']
            )
            if above_words:
                raw_desc = ' '.join(dw['text'] for dw in above_words).strip()

        if not raw_desc:
            continue

        first_word = raw_desc.split()[0]
        if first_word in _DETAILS_SKIP_STARTS:
            continue
        if re.match(r'^\d{1,3}/\d{1,3}$', first_word):
            continue
        if raw_desc.startswith('('):
            continue

        pre = re.sub(r'\s*\(previously[^)]*\)', '', raw_desc, flags=re.IGNORECASE)
        pre = re.sub(r'\s*\(moved in[^)]*\)', '', pre, flags=re.IGNORECASE)
        pre = re.sub(r'with part payment of \$[\d,\.]+', '', pre, flags=re.IGNORECASE)
        clean = _clean_desc(pre)
        clean = re.sub(r'\s*\($', '', clean).strip()

        if not clean or len(clean) < 3:
            continue

        date_m = _DATE_SLASH_RE.search(raw_desc)
        date = date_m.group(1) if date_m else ''

        transactions.append({
            'date': date,
            'description': clean[:120],
            'amount_in': val if col == 'in' else '',
            'amount_out': val if col == 'out' else '',
            'property_address': _property_for_y(amt_y),
        })

    return transactions


# ─── Address detector (fast scan, no full extraction) ────────────────────────

def detect_pdf_addresses(pdf_file):
    """Return list of unique property addresses found in the PDF."""
    addresses = []
    try:
        with pdfplumber.open(pdf_file) as pdf:
            first_page_words = pdf.pages[0].extract_words(keep_blank_chars=False) if pdf.pages else []
            if _has_details_for_format(first_page_words):
                all_words = _combine_format_c_pages(pdf)
                details_y = None
                for w in all_words:
                    if w['text'] == 'Details' and w['x0'] < 80:
                        details_y = w['top']
                        break
                stop_y = float('inf')
                for w in all_words:
                    if w['text'] == 'Account' and w['x0'] < 80:
                        same_y_texts = [w2['text'] for w2 in all_words if abs(w2['top'] - w['top']) <= 2]
                        if 'Transactions' in same_y_texts:
                            stop_y = w['top']
                            break
                if details_y is not None:
                    for w in sorted(all_words, key=lambda x: x['top']):
                        if w['top'] <= details_y or w['top'] >= stop_y:
                            continue
                        if _PROPERTY_HEADER_NUM_RE.match(w['text']) and w['x0'] < 80:
                            row_words = sorted(
                                [w2 for w2 in all_words
                                 if abs(w2['top'] - w['top']) <= 2
                                 and w2['x0'] < 430],
                                key=lambda x: x['x0']
                            )
                            addr = ' '.join(w2['text'] for w2 in row_words).strip()
                            if addr and len(row_words) >= 2 and addr not in addresses:
                                addresses.append(addr)
                addresses = [
                    a for a in addresses
                    if not any(a.lower() in b.lower() and a != b for b in addresses)
                ]
                return addresses

            for page in pdf.pages:
                words = page.extract_words(keep_blank_chars=False)
                if not words:
                    continue

                if not _has_ownership_statement_format(words):
                    continue
                header_y = prop_col_x0 = prop_col_x1 = None
                for w in sorted(words, key=lambda x: x['top']):
                    if w['text'] != 'MONEY':
                        continue
                    same_line = sorted(
                        [w2 for w2 in words if abs(w2['top'] - w['top']) <= 2],
                        key=lambda x: x['x0']
                    )
                    texts = [w2['text'] for w2 in same_line]
                    if 'OUT' not in texts or 'IN' not in texts:
                        continue
                    header_y = w['top']
                    for idx, w2 in enumerate(same_line):
                        if w2['text'] == 'Property':
                            prop_col_x0 = w2['x0'] - 5
                            prop_col_x1 = same_line[idx + 1]['x0'] if idx + 1 < len(same_line) else w2['x1'] + 150
                            break
                    break
                if header_y is None or prop_col_x0 is None:
                    continue
                seen_y = set()
                for w in sorted(words, key=lambda x: x['top']):
                    if w['top'] <= header_y:
                        continue
                    if w['text'] == 'WITHHELD':
                        break
                    if not (prop_col_x0 <= w['x0'] < prop_col_x1):
                        continue
                    row_y = round(w['top'], 1)
                    if row_y in seen_y:
                        continue
                    seen_y.add(row_y)
                    has_date = any(
                        _DATE_SLASH_RE.search(w2['text'])
                        for w2 in words
                        if abs(w2['top'] - w['top']) <= 2 and w2['x0'] < prop_col_x0
                    )
                    if not has_date:
                        continue
                    row_words = sorted(
                        [w2 for w2 in words
                         if abs(w2['top'] - w['top']) <= 2
                         and prop_col_x0 <= w2['x0'] < prop_col_x1],
                        key=lambda x: x['x0']
                    )
                    addr = ' '.join(w2['text'] for w2 in row_words).strip()
                    if addr and addr not in addresses:
                        addresses.append(addr)
    except Exception:
        pass
    return addresses


# ─── PDF multi-transaction extractor ─────────────────────────────────────────

def extract_transactions_pdf(pdf_file, address_filter=None):
    """
    Extract all transactions from a PDF using pdfplumber word bounding-boxes.
    `pdf_file` is a path or file-like object (e.g. io.BytesIO of the upload).
    Returns (transactions_list, statement_period, property_address).
    """
    transactions = []
    statement_period = ""
    property_addr = ""

    with pdfplumber.open(pdf_file) as pdf:
        full_text = "\n".join(p.extract_text() or "" for p in pdf.pages)
        statement_period, property_addr = extract_statement_meta(full_text)

        first_page_words = pdf.pages[0].extract_words(keep_blank_chars=False) if pdf.pages else []
        if _has_eofy_summary_format(full_text):
            transactions = _extract_eofy_summary_format(full_text, property_addr, statement_period)
        elif _has_details_for_format(first_page_words):
            all_words = _combine_format_c_pages(pdf)
            transactions = _extract_details_for_format(all_words)
        elif _has_rent_income_summary_format(first_page_words):
            all_words = _combine_format_c_pages(pdf)
            transactions = _extract_rent_income_summary_format(all_words)
            fee_property = transactions[0]['property_address'] if transactions else property_addr
            transactions.extend(
                _extract_generic_money_table(all_words, fee_property, _SKIP_WORDS)
            )
        else:
            found_tx_section = False
            transfers_seen = False

            for page in pdf.pages:
                words = page.extract_words(keep_blank_chars=False)
                if not words:
                    continue

                # Try each specific-format extractor in turn; a detector can
                # false-positive on a page that merely shares a heading/title
                # with its target format but not the actual column layout
                # (e.g. anything titled "Owner Statement"), so only stop here
                # if the extractor actually found something — otherwise fall
                # through to the next, more generic, detector instead of
                # silently giving up on the page.
                page_formats = (
                    (_has_owner_statement_format, _extract_owner_statement_format),
                    (_has_ownership_statement_format, _extract_ownership_statement_format),
                    (_has_account_folio_format, _extract_account_folio_format),
                    (_has_generic_ledger_format, _extract_generic_ledger_format),
                )
                matched_specific_format = False
                for has_fmt, extract_fmt in page_formats:
                    if has_fmt(words):
                        found = extract_fmt(words)
                        if found:
                            transactions.extend(found)
                            matched_specific_format = True
                            break
                if matched_specific_format:
                    continue

                transactions_y = None
                for w in sorted(words, key=lambda x: x['top']):
                    if w['text'].strip() == 'Transactions':
                        transactions_y = w['top']
                        break

                if transactions_y is not None:
                    found_tx_section = True
                    start_y = transactions_y
                elif found_tx_section and not transfers_seen:
                    start_y = 0
                else:
                    continue

                transfers_y = None
                for w in sorted(words, key=lambda x: x['top']):
                    if w['text'].strip() == 'Transfers' and w['top'] > start_y:
                        transfers_y = w['top']
                        transfers_seen = True
                        break

                in_x = out_x = header_y = None
                for w in sorted(words, key=lambda x: x['top']):
                    if w['top'] <= start_y:
                        continue
                    if transfers_y and w['top'] >= transfers_y:
                        break
                    t = w['text'].strip()
                    cx = (w['x0'] + w['x1']) / 2
                    if t == 'In' and in_x is None:
                        in_x = cx
                        header_y = w['top']
                    elif t == 'Out' and out_x is None:
                        out_x = cx

                if in_x is None or out_x is None:
                    continue

                # Format A doesn't have an explicit property column — the
                # address is printed as its own line above each property's
                # block of transactions (e.g. "2/35 Hurley St, Pimpama QLD
                # 4209" followed by "$570.00 per week"). Find those header
                # lines so transactions can be tagged with the right one.
                section_headers = _find_property_section_headers(
                    words, start_y, transfers_y if transfers_y else float('inf')
                )

                COL_TOL = 35
                DESC_RANGE = 5
                DATE_RANGE = 22
                left_boundary = min(in_x, out_x) - COL_TOL

                stamped = []
                for w in words:
                    if w['top'] <= header_y:
                        continue
                    if transfers_y and w['top'] >= transfers_y:
                        continue
                    if not _AMOUNT_RE.match(w['text']):
                        continue
                    cx = (w['x0'] + w['x1']) / 2
                    if abs(cx - in_x) < COL_TOL:
                        stamped.append((w['top'], w['text'], 'in'))
                    elif abs(cx - out_x) < COL_TOL:
                        stamped.append((w['top'], w['text'], 'out'))

                for amt_y, amt_text, col in stamped:
                    desc_words = sorted(
                        [w for w in words
                         if w['x1'] < left_boundary
                         and abs(w['top'] - amt_y) < DESC_RANGE
                         and w['text'] not in _SKIP_WORDS
                         and not _AMOUNT_RE.match(w['text'])],
                        key=lambda w: (w['top'], w['x0'])
                    )
                    raw_desc = " ".join(w['text'] for w in desc_words).strip()

                    if not raw_desc or raw_desc in _SKIP_WORDS:
                        continue

                    clean = _clean_desc(raw_desc)
                    if not clean or clean in _SKIP_WORDS or len(clean) < 3:
                        continue
                    if re.match(r'^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}$', clean, re.IGNORECASE):
                        continue
                    if re.match(r'^\d{1,2}$', clean):
                        continue
                    _cl = clean.lower()
                    if _cl.startswith(('total', 'grand total', 'sub total', 'sub-total', 'subtotal',
                                        'net total', 'net balance', 'opening', 'closing')):
                        continue

                    date_words = [
                        w for w in words
                        if w['x1'] < left_boundary
                        and -2 <= (w['top'] - amt_y) <= DATE_RANGE
                    ]
                    date_text = " ".join(w['text'] for w in sorted(date_words, key=lambda w: (w['top'], w['x0'])))
                    date_m = re.search(
                        r'\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})\b',
                        date_text, re.IGNORECASE)
                    date = date_m.group(1) if date_m else ""

                    val = _parse_amount(amt_text)
                    transactions.append({
                        "date": date,
                        "description": clean[:120],
                        "amount_in": val if col == 'in' else "",
                        "amount_out": val if col == 'out' else "",
                        "property_address": _property_for_y_generic(section_headers, amt_y),
                    })

    if not transactions:
        return transactions, statement_period, property_addr

    # Prefer a real per-transaction address (e.g. from a section header) over
    # the document-level meta-detected one (often the agency's own letterhead
    # address, not the property's) BEFORE using it to backfill transactions
    # that didn't get their own address — e.g. rows on a page-2 continuation
    # of a property section whose header only appeared on page 1.
    first_tx_addr = next(
        (t.get('property_address', '') for t in transactions
         if t.get('property_address', '')), '')
    if first_tx_addr:
        property_addr = first_tx_addr

    for t in transactions:
        if not t.get('property_address'):
            t['property_address'] = property_addr

    if address_filter is not None:
        if isinstance(address_filter, list):
            filters = [af.strip().lower() for af in address_filter if af.strip()]
            if filters:
                transactions = [
                    t for t in transactions
                    if any(_addr_matches(af, t.get('property_address', '').lower())
                           for af in filters)
                ]
            else:
                transactions = []
        elif isinstance(address_filter, str) and address_filter.strip():
            af = address_filter.strip().lower()
            transactions = [t for t in transactions
                            if _addr_matches(af, t.get('property_address', '').lower())]

    return transactions, statement_period, property_addr


# ─── Adapter: flat transaction list -> {agencyName, statementPeriod, properties} ──

def to_properties_shape(transactions, statement_period, property_addr):
    """
    Adapt the flat transaction list from `extract_transactions_pdf` into the
    same {agencyName, folioNumber, statementPeriod, properties, totalMoneyIn,
    totalMoneyOut, rawText} shape `apps.ocr.parser.extract_data` returns, so
    callers (views + frontend) don't need to know which parser ran.
    """
    properties = []
    by_name = {}

    period_from, period_to = None, None
    if statement_period:
        parts = re.split(r'\s*[—–\-]\s*', statement_period, maxsplit=1)
        if len(parts) == 2:
            period_from, period_to = parts[0].strip(), parts[1].strip()
        else:
            period_to = statement_period.strip()

    for tx in transactions:
        name = (tx.get('property_address') or property_addr or 'Extracted Transactions').strip()
        if name not in by_name:
            prop = {
                'propertyName': name,
                'lineItems': [],
                'subtotalMoneyOut': None,
                'subtotalMoneyIn': None,
            }
            by_name[name] = prop
            properties.append(prop)

        description = tx.get('description') or ''
        date = tx.get('date') or ''
        if date:
            description = f"{description} ({date})" if description else date

        by_name[name]['lineItems'].append({
            'description': description[:120] if description else '',
            'includedTax': None,
            'moneyIn': tx.get('amount_in') or None,
            'moneyOut': tx.get('amount_out') or None,
            'confidence': 90,
            'category': determine_category(description),
        })

    return {
        'agencyName': None,
        'folioNumber': None,
        'statementPeriod': {
            'from': period_from,
            'to': period_to,
        },
        'properties': properties,
        'totalMoneyIn': None,
        'totalMoneyOut': None,
        'rawText': None,
    }
