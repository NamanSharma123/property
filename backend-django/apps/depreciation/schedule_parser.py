"""
Quantity-surveyor depreciation schedule PDF parser (pdfplumber word-position
based, same technique as apps.ocr.statement_parser). Three real-world layouts
are supported, detected per-page:

- "Summary of Entitlements" (e.g. Mitchell Brandtman) — one table with both
  methods side by side: Period | Diminishing Value | Pooling | Division 43 |
  DV Total | Prime Cost | Division 43 | PC Total. Division 40 for the
  diminishing-value method is Diminishing Value + Pooling summed; for prime
  cost it's the Prime Cost column alone (no pooling in prime cost).
- "Schedule Method By ..." (e.g. Duo Tax) — two separate tables, one per
  method, each with Year | Financial Years (Period Starting - Period Ending)
  | Plant & Equipment | Capital Works | Total Depreciation.
- "Calculation for write-off provision" (BMT Tax Depreciation) — a single
  Division 43 write-off table, two period/amount columns per row (years
  1-21 alongside years 22-41). Only Division 43 is extracted for this
  layout: on an established property BMT's own report treats Division 40
  as capital-loss-only (not an annual deduction — see the "capital loss ...
  not claimable under division 40" pages), so 0 is the correct value there,
  not a parsing gap. A BMT report for a *new* property may carry a genuine
  claimable Division 40 table elsewhere in the PDF; that isn't handled yet
  since no such sample has been seen.

Financial Date is always the *last* day of the financial year — either taken
directly from the "Period Ending" column (Schedule Method By), from a
"YYYY / YY" row label as 30 June of the second year (Summary of
Entitlements), or from the "to DD-Mon-YY" end of each period (BMT).
"""
import re
from datetime import date
from decimal import Decimal, InvalidOperation

_AMOUNT_TOKEN_RE = re.compile(r'\$\s*-(?!\d)|\$[\d,]+(?:\.\d+)?')
_YEAR_LABEL_RE = re.compile(r'^\d{4}$')
_ROW_INDEX_RE = re.compile(r'^\d{1,2}$')
_DATE_RE = re.compile(r'^\d{1,2}/\d{1,2}/\d{2,4}$')

_BMT_MONTHS = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
}
# Matches "to 30-Jun-22 6,978" — the tail of a "<start> to <end> <amount>" cell.
_BMT_PERIOD_AMOUNT_RE = re.compile(
    r'to\s+(\d{1,2})-([A-Za-z]{3})-(\d{2,4})\s+\$?([\d,]+)'
)


def _parse_amount_token(tok):
    tok = tok.replace(' ', '')
    if tok in ('$-', '$—', '-', ''):
        return Decimal('0')
    cleaned = tok.replace('$', '').replace(',', '').strip()
    if not cleaned or cleaned == '-':
        return Decimal('0')
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return Decimal('0')


def _parse_ddmmyy(text):
    parts = text.split('/')
    if len(parts) != 3:
        return None
    try:
        day, month, yy = int(parts[0]), int(parts[1]), int(parts[2])
    except ValueError:
        return None
    year = 2000 + yy if yy < 100 else yy
    try:
        return date(year, month, day)
    except ValueError:
        return None


def _group_rows(words):
    """Words on the same visual line (top within 2pt), each row sorted left to right."""
    rows = []
    for w in sorted(words, key=lambda x: x['top']):
        for row in rows:
            if abs(row[0]['top'] - w['top']) <= 2:
                row.append(w)
                break
        else:
            rows.append([w])
    return [sorted(row, key=lambda x: x['x0']) for row in rows]


# ─── Format: "Summary of Entitlements" (Diminishing Value + Pooling + Prime Cost side by side) ───

def _has_summary_of_entitlements_format(words):
    return any(w['text'] == 'Pooling' for w in words)


def _extract_summary_of_entitlements(words):
    dv_rows = []
    pc_rows = []

    for row in _group_rows(words):
        if len(row) < 4:
            continue
        if not _YEAR_LABEL_RE.match(row[0]['text']):
            continue
        if row[1]['text'] != '/' or not re.match(r'^\d{2}$', row[2]['text']):
            continue

        start_year = int(row[0]['text'])
        financial_date = date(start_year + 1, 6, 30)

        row_text = ' '.join(w['text'] for w in row[3:])
        amounts = [_parse_amount_token(m) for m in _AMOUNT_TOKEN_RE.findall(row_text)]
        if len(amounts) != 7:
            continue  # not a recognised data row (e.g. a wrapped/footer line)

        dim_value, pooling, div43_a, dv_total, prime_cost, div43_b, pc_total = amounts

        dv_rows.append({
            'financial_date': financial_date,
            'division_40_amount': dim_value + pooling,
            'division_43_amount': div43_a,
            'total_amount': dv_total,
        })
        pc_rows.append({
            'financial_date': financial_date,
            'division_40_amount': prime_cost,
            'division_43_amount': div43_b,
            'total_amount': pc_total,
        })

    return dv_rows, pc_rows


# ─── Format: "Schedule Method By Diminishing Value" / "... Prime Cost" ───────

def _has_schedule_method_by_format(words):
    texts_by_top = {}
    for w in words:
        texts_by_top.setdefault(round(w['top']), []).append(w['text'])
    for texts in texts_by_top.values():
        if 'SCHEDULE' in texts and 'METHOD' in texts and 'BY' in texts:
            return True
    return False


def _detect_schedule_method_by_page_method(words):
    texts = {w['text'].upper() for w in words if w['top'] < 100}
    if 'DIMINISHING' in texts and 'VALUE' in texts:
        return 'diminishing_value'
    if 'PRIME' in texts and 'COST' in texts:
        return 'prime_cost'
    return None


def _extract_schedule_method_by(words):
    rows_out = []

    for row in _group_rows(words):
        if len(row) < 5:
            continue
        if not _ROW_INDEX_RE.match(row[0]['text']):
            continue

        dash_idx = next((i for i, w in enumerate(row) if w['text'] == '-'), None)
        if dash_idx is None or dash_idx + 1 >= len(row):
            continue
        end_date_text = row[dash_idx + 1]['text']
        if not _DATE_RE.match(end_date_text):
            continue
        financial_date = _parse_ddmmyy(end_date_text)
        if not financial_date:
            continue

        row_text = ' '.join(w['text'] for w in row[dash_idx + 2:])
        amounts = [_parse_amount_token(m) for m in _AMOUNT_TOKEN_RE.findall(row_text)]
        if len(amounts) != 3:
            continue  # not a recognised data row (e.g. the table's own "Total" row)

        plant_equipment, capital_works, total_depreciation = amounts
        rows_out.append({
            'financial_date': financial_date,
            'division_40_amount': plant_equipment,
            'division_43_amount': capital_works,
            'total_amount': total_depreciation,
        })

    return rows_out


# ─── Format: "Calculation for write-off provision" (BMT Tax Depreciation) ────

def _has_bmt_writeoff_format(text):
    return 'calculation for write-off provision' in text.lower()


def _parse_bmt_date(day, month_abbr, yy):
    month = _BMT_MONTHS.get(month_abbr.lower())
    if not month:
        return None
    year = int(yy)
    if year < 100:
        year += 2000
    try:
        return date(year, month, int(day))
    except ValueError:
        return None


def _extract_bmt_division_43(text):
    """
    Division 43 only — see the module docstring for why Division 40 is left
    out of this layout. Every "<period start> to <period end> <amount>" cell
    becomes one row; the table's own "... to <end date> Total <amount>"
    closing line only matches on its period, not on "Total", so the running
    total isn't picked up as a spurious extra year.
    """
    rows = []
    for day, month_abbr, yy, amount in _BMT_PERIOD_AMOUNT_RE.findall(text):
        financial_date = _parse_bmt_date(day, month_abbr, yy)
        if not financial_date:
            continue
        rows.append({
            'financial_date': financial_date,
            'division_43_amount': _parse_amount_token(amount),
        })
    return rows


# ─── Provider detection (best-effort, informational only) ───────────────────

def _detect_provider(text):
    lower = text.lower()
    if 'duo tax' in lower or 'duotax' in lower:
        return 'Duo Tax'
    if 'mitchell brandtman' in lower:
        return 'Mitchell Brandtman'
    if 'bmt tax depreciation' in lower:
        return 'BMT'
    return None


# ─── Top-level entry point ───────────────────────────────────────────────────

def extract_depreciation_schedule(pdf_file):
    """
    `pdf_file` is a path or file-like object (e.g. io.BytesIO of the upload).
    Returns {'diminishing_value': [...], 'prime_cost': [...], 'provider': str|None},
    each row a dict of {financial_date, division_40_amount, division_43_amount, total_amount}.
    """
    import pdfplumber

    dv_rows = []
    pc_rows = []

    with pdfplumber.open(pdf_file) as pdf:
        # Some layouts render the cover/letterhead pages as images with no
        # extractable text, so the provider's name may only show up several
        # pages in (e.g. the "Explanatory Notes" page) — scan the whole
        # document rather than just the first couple of pages.
        full_text = '\n'.join((p.extract_text() or '') for p in pdf.pages)
        provider = _detect_provider(full_text)

        for page in pdf.pages:
            words = page.extract_words(keep_blank_chars=False)
            if not words:
                continue

            if _has_summary_of_entitlements_format(words):
                page_dv, page_pc = _extract_summary_of_entitlements(words)
                dv_rows.extend(page_dv)
                pc_rows.extend(page_pc)
                continue

            if _has_schedule_method_by_format(words):
                method = _detect_schedule_method_by_page_method(words)
                if method == 'diminishing_value':
                    dv_rows.extend(_extract_schedule_method_by(words))
                elif method == 'prime_cost':
                    pc_rows.extend(_extract_schedule_method_by(words))
                continue

            page_text = page.extract_text() or ''
            if _has_bmt_writeoff_format(page_text):
                # Division 43 doesn't differ by method, so both methods get
                # the same amount and Division 40 is 0 for this layout (see
                # module docstring).
                for row in _extract_bmt_division_43(page_text):
                    div43 = row['division_43_amount']
                    dv_rows.append({
                        'financial_date': row['financial_date'],
                        'division_40_amount': Decimal('0'),
                        'division_43_amount': div43,
                        'total_amount': div43,
                    })
                    pc_rows.append({
                        'financial_date': row['financial_date'],
                        'division_40_amount': Decimal('0'),
                        'division_43_amount': div43,
                        'total_amount': div43,
                    })

    dv_rows.sort(key=lambda r: r['financial_date'])
    pc_rows.sort(key=lambda r: r['financial_date'])

    return {
        'diminishing_value': dv_rows,
        'prime_cost': pc_rows,
        'provider': provider,
    }
