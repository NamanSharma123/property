# Shelly CRM — Property Portfolio & Accounting Platform

A property-management CRM that lets property owners/investors track properties, loans,
income & expenses, and generate cash-flow reports. Transactions are created automatically
by **OCR-reading email attachments** (bank statements, settlement statements, etc.) sent to
each user's **unique platform email address**, or entered manually. An admin panel provides
full oversight, review, and management.

---

## 1. Core Concept / Elevator Pitch

Every user gets a **unique inbound email address** (e.g. `user1234@inbox.shellycrm.com`).
When they forward or receive a statement/invoice at that address, the platform:

1. Ingests the email + attachment.
2. Runs **OCR** to extract structured data (amount, date, category, property).
3. If confidently parsed → creates a **transaction** automatically (`Processed`).
4. If not → routes it to the **Review Panel** for a human (admin) to confirm/correct (`Not Processed`).

On top of this, users manage **properties**, **loans** (manual + Basiq open-banking sync),
**income/expenses**, and view **property cash-flow summaries** and reports.

---

## 2. Actors / Roles

| Role      | Capabilities |
|-----------|--------------|
| **User** (property owner/investor) | Manage own properties, loans, transactions, documents; view reports & cash flow; raise support tickets; manage subscription. |
| **Admin** | All user management (add/delete users, list all user email IDs), property management, review OCR queue, add/amend transactions for any user, manage categories, handle support tickets. |
| **System / Automations** | Email ingestion, OCR pipeline, Basiq bank sync, postal-address lookup, payment-gateway webhooks, enquiry/ticket email delivery. |

---

## 3. End-to-End Project Flow

### 3.1 Signup & Onboarding
```
Sign up  →  Verify email  →  System generates UNIQUE inbound email ID for the user
         →  User adds first Property (address auto-completed via Postal API)
         →  Optional: connect bank via Basiq  /  add loan manually
```

### 3.2 Automated Transaction Flow (OCR)
```
Email arrives at user's unique inbox
        │
        ▼
  Attachment extracted (PDF/image)
        │
        ▼
  OCR engine parses document type:
   • Bank statement      • Settlement statement
   • Selling statement   • Interest statement
        │
   ┌────┴─────────────────────────┐
   │ Parsed with high confidence?  │
   └────┬───────────────────┬──────┘
       YES                  NO
        │                    │
        ▼                    ▼
  Create Transaction   →  REVIEW PANEL (admin)
   (status: Processed)      (status: Not Processed)
                                 │
                          Admin corrects → creates/updates Transaction
```

### 3.3 Manual Flow
```
User → Add Income/Expense (date fields adapt to entry type)
     → Add Loan → associate with Property → (optionally link Basiq account)
     → Upload document/statement → stored in S3 → viewable with upload metadata
```

### 3.4 Reporting & Insights
```
Transactions + Loans + Properties → Property Cash-Flow Summary
                                  → Reports (P&L, expense by category, etc.)
```

---

## 4. Feature Modules (mapped to requirements)

| # | Requirement | Module | Key Behaviour |
|---|-------------|--------|---------------|
| 1 | Unique email + OCR ingestion | **Email Ingestion & OCR** | Unique inbox per user; attachment OCR; auto-create transaction or send to Review. |
| 2 | Admin panel | **Admin Console** | CRUD users, CRUD properties, Review panel, add/amend transactions for any user, CRUD categories, list all user email IDs. |
| 3 | Document storage & view | **Document Vault (S3)** | Uploads + statements stored in platform S3; view shows where/when uploaded. |
| 4 | Manual loan entry + Basiq | **Loans & Banking** | Manual loan → linked to property; then connect **Basiq** open-banking API. |
| 5 | Reporting + defects + landing | **Reports / QA / Landing** | Reporting improvements, defect fixes, improved initial page. |
| 6 | UI/UX polish | **Design System** | Colors, menu strings, layout consistency. |
| 7 | Income/Expense date fields | **Transactions Form** | Date fields change based on entry type (income vs expense vs recurring). |
| 8 | Support tickets | **Support** | Ticket feature; enquiries delivered to email. |
| 9 | Property cash flow | **Cash Flow** | Per-property cash-flow summary view. |
| 10 | Subscription + payments | **Billing** | Subscription plans + payment gateway (optional for now). |
| 11 | Postal API | **Address Lookup** | Auto-fill/verify address on property creation. |
| 12 | More OCR templates | **OCR Templates** | Settlement, selling, interest statements (4–5 more). |
| 13 | Provision for fixes | **Backlog / Buffer** | Reserved capacity for key defect fixes & improvements. |

---

## 5. Suggested Architecture

```
┌───────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   Frontend    │────▶│    Backend API   │────▶│     Database        │
│ (React/Next)  │     │  (Node/Nest or   │     │  (PostgreSQL)       │
│  User + Admin │◀────│   Django/FastAPI)│◀────│                     │
└───────────────┘     └───────┬──────────┘     └────────────────────┘
                              │
        ┌──────────────┬──────┼───────────┬─────────────┬────────────┐
        ▼              ▼      ▼           ▼             ▼            ▼
   Email Inbound   OCR svc  S3 Storage  Basiq API  Postal API  Payment GW
  (SES/Mailgun/   (Textract/          (open       (address    (Stripe/
   inbound parse)  Tesseract)          banking)    autocomplete) local)
```

**Core entities:** `User`, `Property`, `Loan`, `Transaction`, `Category`, `Document`,
`EmailMessage`, `ReviewItem`, `SupportTicket`, `Subscription`, `Plan`.

---

## 6. High-Level Data Model (draft)

- **User** — id, name, email (login), **inbound_email_id (unique)**, role, subscription_id
- **Property** — id, user_id, address (via Postal API), type, purchase_date, purchase_price
- **Loan** — id, property_id, lender, principal, interest_rate, start_date, basiq_account_id?
- **Transaction** — id, user_id, property_id, category_id, type (income/expense), amount, date(s), source (ocr/manual/basiq), status (processed/not_processed)
- **Category** — id, name, type, is_system
- **Document** — id, user_id, property_id?, s3_key, doc_type, uploaded_by, uploaded_at, source
- **EmailMessage** — id, user_id, from, subject, received_at, attachment_ref, ocr_status
- **ReviewItem** — id, email_message_id, ocr_payload, status, resolved_by
- **SupportTicket** — id, user_id, subject, body, status, created_at
- **Subscription / Plan** — billing metadata

---

## 7. Proposed Build Phases

| Phase | Scope | Requirements |
|-------|-------|--------------|
| **P1 — Foundation** | Auth, unique email IDs, properties (+Postal API), manual income/expense, S3 documents | 1(email), 3, 7, 11 |
| **P2 — OCR & Review** | Email ingestion, bank-statement OCR, Review panel, admin console | 1(OCR), 2, 12 |
| **P3 — Loans & Banking** | Manual loans, Basiq integration, cash-flow summary | 4, 9 |
| **P4 — Reports & UX** | Reporting improvements, landing page, UI/UX polish, defect buffer | 5, 6, 13 |
| **P5 — Support & Billing** | Support tickets, enquiry emails, subscription + payment gateway | 8, 10 |

---

## 8. Wireframe

See **`wireframe.html`** in this folder (open in a browser) for the low-fidelity screen
layouts covering: Landing, Signup/Login, User Dashboard, Properties, Add/Amend Transaction,
Documents, Loans, Cash-Flow Summary, Reports, Support, Subscription, and the full Admin panel
(Users, Properties, Review/OCR queue, Categories).

---

## 9. Status

> Greenfield — this README defines the intended flow and scope. Nothing is implemented yet.
> Tech-stack choices above are recommendations, not final decisions.
