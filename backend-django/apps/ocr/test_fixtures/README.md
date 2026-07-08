# OCR statement parser test fixtures

Real property-statement PDFs used to validate `apps.ocr.statement_parser`
(the pdfplumber layout-aware parser) against known-correct output.

- `transactions.xlsx` — reference/expected transactions, exported from the
  original desktop `invoice_ocr_tool`, for `roomy_statement_27.pdf` only.
- The rest are real statements covering the different layouts the parser
  detects (MRI Ownership Statement, Owner Statement Credit/Debit, Folio
  Summary, "Details for…", generic Transactions heading).

## Re-running the check

```powershell
cd backend-django
.venv\Scripts\activate
$env:DJANGO_SETTINGS_MODULE = "config.settings.dev"
python -c "
import django; django.setup()
from apps.ocr import statement_parser
transactions, period, prop = statement_parser.extract_transactions_pdf('apps/ocr/test_fixtures/roomy_statement_27.pdf')
total_in = sum(float(t['amount_in']) for t in transactions if t.get('amount_in'))
total_out = sum(float(t['amount_out']) for t in transactions if t.get('amount_out'))
print(len(transactions), total_in, total_out)  # expect: 26 6740.0 370.7
"
```

Any parser change should be re-checked against this file at minimum — it's
the one with a hand-verified expected answer.
