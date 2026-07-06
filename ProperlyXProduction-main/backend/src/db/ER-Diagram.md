# 🗄️ Properly — Database ER Diagram & Data Flow

> **Generated:** 2026-02-13  
> **Database:** PostgreSQL (Supabase)  
> **Total Tables:** 9  
> **Schema File:** `all-in-one.sql`

---

## 📊 Entity-Relationship Diagram

```mermaid
erDiagram

    %% ════════════════════════════════════════════
    %% CORE ENTITIES
    %% ════════════════════════════════════════════

    users {
        UUID id PK "DEFAULT uuid_generate_v4()"
        VARCHAR name "NOT NULL, max 100"
        VARCHAR email "NOT NULL, UNIQUE"
        VARCHAR password_hash "NOT NULL, Argon2"
        VARCHAR role "admin | manager | staff"
        VARCHAR unique_id "UNIQUE"
        VARCHAR phone "max 50"
        TEXT avatar "URL to avatar image"
        BOOLEAN is_email_verified "DEFAULT FALSE"
        VARCHAR account_status "active | suspended | locked"
        INTEGER login_attempts "DEFAULT 0"
        TIMESTAMPTZ lock_until
        TIMESTAMPTZ last_login
        TIMESTAMPTZ password_changed_at
        TIMESTAMPTZ created_at "DEFAULT NOW()"
        TIMESTAMPTZ updated_at "DEFAULT NOW()"
    }

    sessions {
        UUID id PK "DEFAULT uuid_generate_v4()"
        UUID user_id FK "→ users.id CASCADE"
        VARCHAR refresh_token "NOT NULL, UNIQUE"
        JSONB device_info "Browser, OS, etc."
        VARCHAR ip_address "max 45 (IPv6)"
        BOOLEAN is_active "DEFAULT TRUE"
        TIMESTAMPTZ expires_at "NOT NULL"
        TIMESTAMPTZ last_activity "DEFAULT NOW()"
        JSONB location "Geo data"
        TIMESTAMPTZ created_at "DEFAULT NOW()"
        TIMESTAMPTZ updated_at "DEFAULT NOW()"
    }

    properties {
        UUID id PK "DEFAULT uuid_generate_v4()"
        UUID owner_id FK "→ users.id CASCADE"
        VARCHAR name "NOT NULL, max 200"
        JSONB address "Street, city, state, zip, country"
        TEXT full_address
        VARCHAR type "residential | commercial | industrial | mixed-use | land"
        VARCHAR sub_type "single-family | multi-family | apartment | condo | ..."
        INTEGER units "DEFAULT 1, >= 1"
        INTEGER occupancy "DEFAULT 0, >= 0"
        DECIMAL purchase_price "15,2"
        DATE purchase_date
        DECIMAL current_value "15,2"
        DECIMAL monthly_rent "10,2"
        INTEGER year_built
        INTEGER square_feet ">= 0"
        INTEGER lot_size ">= 0"
        INTEGER bedrooms ">= 0"
        DECIMAL bathrooms "3,1 >= 0"
        TEXT_ARRAY amenities
        TEXT description
        JSONB images "Array of image URLs"
        VARCHAR status "active | inactive | sold | pending"
        VARCHAR tax_id "max 100"
        TEXT notes
        JSONB loan_details "Loan amount, rate, term, etc."
        JSONB ownership_details "Owner names, shares"
        VARCHAR ownership "max 100"
        BOOLEAN has_depreciation "DEFAULT FALSE"
        VARCHAR usage "max 50"
        VARCHAR abn "max 50"
        TIMESTAMPTZ created_at "DEFAULT NOW()"
        TIMESTAMPTZ updated_at "DEFAULT NOW()"
    }

    categories {
        UUID id PK "DEFAULT uuid_generate_v4()"
        UUID owner_id FK "→ users.id CASCADE (NULL for system)"
        VARCHAR name "NOT NULL, max 100"
        VARCHAR type "income | expense | both"
        VARCHAR description "max 500"
        VARCHAR icon "max 50"
        VARCHAR color "DEFAULT #6B7280"
        UUID parent_id FK "→ categories.id (self-ref)"
        BOOLEAN is_system "DEFAULT FALSE"
        VARCHAR tax_code "max 50"
        BOOLEAN is_tax_deductible "DEFAULT FALSE"
        BOOLEAN is_active "DEFAULT TRUE"
        TIMESTAMPTZ created_at "DEFAULT NOW()"
        TIMESTAMPTZ updated_at "DEFAULT NOW()"
    }

    tenants {
        UUID id PK "DEFAULT uuid_generate_v4()"
        UUID owner_id FK "→ users.id CASCADE"
        UUID property_id FK "→ properties.id CASCADE"
        VARCHAR name "NOT NULL, max 100"
        VARCHAR email "max 255"
        VARCHAR phone "max 50"
        VARCHAR unit "DEFAULT '1'"
        DATE lease_start "NOT NULL"
        DATE lease_end "NOT NULL"
        DECIMAL monthly_rent "10,2 NOT NULL >= 0"
        DECIMAL security_deposit "10,2 DEFAULT 0"
        INTEGER rent_due_day "1-28, DEFAULT 1"
        VARCHAR status "active | inactive | pending | evicted"
        JSONB emergency_contact
        JSONB documents "Array of doc URLs"
        DATE move_in_date
        DATE move_out_date
        TEXT notes
        TIMESTAMPTZ created_at "DEFAULT NOW()"
        TIMESTAMPTZ updated_at "DEFAULT NOW()"
    }

    transactions {
        UUID id PK "DEFAULT uuid_generate_v4()"
        UUID owner_id FK "→ users.id CASCADE"
        UUID property_id FK "→ properties.id CASCADE"
        UUID tenant_id FK "→ tenants.id SET NULL"
        UUID category_id FK "→ categories.id SET NULL"
        VARCHAR description "NOT NULL, max 500"
        DECIMAL amount "12,2 NOT NULL"
        DATE date "DEFAULT CURRENT_DATE"
        VARCHAR type "income | expense"
        VARCHAR category_name "max 100"
        VARCHAR transaction_source "Manual Entry | OCR Upload | Bank Feed | Rental Summary"
        VARCHAR status "pending | paid | cancelled | overdue"
        VARCHAR payment_method "cash | check | bank-transfer | credit-card | other"
        VARCHAR reference_number "max 100"
        TEXT receipt_url
        JSONB attachments "Array"
        BOOLEAN is_recurring "DEFAULT FALSE"
        VARCHAR recurring_frequency "weekly | monthly | quarterly | yearly"
        DATE recurring_end_date
        UUID parent_transaction_id FK "→ transactions.id (self-ref)"
        TEXT notes
        BOOLEAN is_tax_deductible "DEFAULT FALSE"
        VARCHAR tax_category "max 100"
        UUID created_by FK "→ users.id SET NULL"
        TIMESTAMPTZ created_at "DEFAULT NOW()"
        TIMESTAMPTZ updated_at "DEFAULT NOW()"
    }

    expenses {
        UUID id PK "DEFAULT uuid_generate_v4()"
        UUID owner_id FK "→ users.id CASCADE"
        UUID property_id FK "→ properties.id CASCADE"
        UUID category_id FK "→ categories.id SET NULL"
        VARCHAR description "NOT NULL, max 500"
        DECIMAL amount "12,2 NOT NULL >= 0"
        DATE date "DEFAULT CURRENT_DATE"
        VARCHAR category_name "max 100"
        VARCHAR status "pending | paid | cancelled"
        JSONB vendor "Vendor name, contact"
        TEXT receipt_url
        JSONB attachments "Array"
        VARCHAR payment_method "cash | check | bank-transfer | credit-card | other"
        VARCHAR reference_number "max 100"
        DATE paid_date
        BOOLEAN is_recurring "DEFAULT FALSE"
        VARCHAR recurring_frequency "weekly | monthly | quarterly | yearly"
        TEXT notes
        BOOLEAN is_tax_deductible "DEFAULT TRUE"
        VARCHAR tax_category "max 100"
        UUID created_by FK "→ users.id SET NULL"
        TIMESTAMPTZ created_at "DEFAULT NOW()"
        TIMESTAMPTZ updated_at "DEFAULT NOW()"
    }

    activity_logs {
        UUID id PK "DEFAULT uuid_generate_v4()"
        UUID user_id FK "→ users.id CASCADE"
        VARCHAR action "NOT NULL, max 50"
        VARCHAR description "max 500"
        VARCHAR resource_type "max 50"
        UUID resource_id "Generic FK"
        VARCHAR ip_address "max 45"
        TEXT user_agent
        BOOLEAN success "DEFAULT TRUE"
        TEXT error_message
        JSONB metadata
        TIMESTAMPTZ created_at "DEFAULT NOW()"
    }

    notifications {
        UUID id PK "DEFAULT uuid_generate_v4()"
        UUID user_id FK "→ users.id CASCADE"
        VARCHAR type "property | transaction | security | system | subscription"
        VARCHAR title "NOT NULL, max 200"
        TEXT message "NOT NULL"
        BOOLEAN is_read "DEFAULT FALSE"
        TEXT action_url
        JSONB metadata
        TIMESTAMPTZ created_at "DEFAULT NOW()"
    }

    %% ════════════════════════════════════════════
    %% RELATIONSHIPS
    %% ════════════════════════════════════════════

    users ||--o{ sessions : "has many"
    users ||--o{ properties : "owns"
    users ||--o{ categories : "creates custom"
    users ||--o{ tenants : "manages"
    users ||--o{ transactions : "records"
    users ||--o{ expenses : "records"
    users ||--o{ activity_logs : "generates"
    users ||--o{ notifications : "receives"

    properties ||--o{ tenants : "houses"
    properties ||--o{ transactions : "has"
    properties ||--o{ expenses : "incurs"

    tenants ||--o{ transactions : "linked to"

    categories ||--o{ transactions : "classifies"
    categories ||--o{ expenses : "classifies"
    categories ||--o{ categories : "parent → child"

    transactions ||--o{ transactions : "parent → recurring"
```

---

## 📋 Table Metadata

| # | Table | Purpose | Row Growth | Has `updated_at` Trigger |
|---|-------|---------|------------|--------------------------|
| 1 | `users` | User accounts, auth, roles | Low (staff count) | ✅ |
| 2 | `sessions` | JWT refresh tokens, device tracking | Medium (per login) | ✅ |
| 3 | `properties` | Real estate portfolio | Low–Medium | ✅ |
| 4 | `categories` | Income/expense classification | Low (mostly system) | ✅ |
| 5 | `tenants` | Lease & tenant records | Medium | ✅ |
| 6 | `transactions` | All income & expense entries | **High** | ✅ |
| 7 | `expenses` | Standalone expense records | **High** | ✅ |
| 8 | `activity_logs` | Audit trail (login, CRUD ops) | **Very High** | ❌ (append-only) |
| 9 | `notifications` | In-app alerts & messages | **High** | ❌ (append-only) |

---

## 🔑 Relationship Summary

### Foreign Key Map

```
users.id
 ├── sessions.user_id              (CASCADE)
 ├── properties.owner_id           (CASCADE)
 ├── categories.owner_id           (CASCADE)
 ├── tenants.owner_id              (CASCADE)
 ├── transactions.owner_id         (CASCADE)
 ├── transactions.created_by       (SET NULL)
 ├── expenses.owner_id             (CASCADE)
 ├── expenses.created_by           (SET NULL)
 ├── activity_logs.user_id         (CASCADE)
 └── notifications.user_id         (CASCADE)

properties.id
 ├── tenants.property_id           (CASCADE)
 ├── transactions.property_id      (CASCADE)
 └── expenses.property_id          (CASCADE)

tenants.id
 └── transactions.tenant_id        (SET NULL)

categories.id
 ├── categories.parent_id          (SET NULL)  ← self-referential
 ├── transactions.category_id      (SET NULL)
 └── expenses.category_id          (SET NULL)

transactions.id
 └── transactions.parent_transaction_id  (SET NULL)  ← self-referential (recurring)
```

### On Delete Behavior

| Behavior | Meaning | Used For |
|----------|---------|----------|
| `CASCADE` | Delete children when parent is deleted | Core ownership (user→properties, property→tenants) |
| `SET NULL` | Nullify FK when parent is deleted | Optional references (tenant on transaction, category on expense) |

---

## 🔄 Data Flow Diagram

```mermaid
flowchart TB
    subgraph AUTH["🔐 Authentication Flow"]
        direction LR
        A1[User Signup/Login] --> A2[users table]
        A2 --> A3[sessions table]
        A2 --> A4[activity_logs table]
    end

    subgraph PROPERTY["🏠 Property Management Flow"]
        direction LR
        P1[Add Property] --> P2[properties table]
        P2 --> P3[Add Tenants]
        P3 --> P4[tenants table]
    end

    subgraph FINANCIAL["💰 Financial Flow"]
        direction LR
        F1[Record Income/Expense] --> F2[transactions table]
        F1 --> F3[expenses table]
        F2 --> F4[categories table]
        F3 --> F4
    end

    subgraph NOTIFY["🔔 Notification Flow"]
        direction LR
        N1[System Events] --> N2[notifications table]
    end

    AUTH --> PROPERTY
    AUTH --> FINANCIAL
    PROPERTY --> FINANCIAL
    FINANCIAL --> NOTIFY
```

---

## 🔄 Detailed Data Flow: Transaction Lifecycle

```mermaid
flowchart TD
    subgraph SOURCES["📥 Transaction Sources"]
        S1["🖊️ Manual Entry"]
        S3["🏦 Bank Feed"]
        S4["📊 Rental Summary"]
    end

    S1 --> T["💳 transactions table"]
    S3 --> T
    S4 --> T

    T --> |"status: pending"| V1{"Payment<br/>Received?"}
    V1 -->|Yes| V2["status: paid"]
    V1 -->|No & overdue| V3["status: overdue"]
    V1 -->|Cancelled| V4["status: cancelled"]

    T -->|"is_recurring = true"| R{"Recurring<br/>Engine"}
    R -->|"Creates child"| T

    T -->|"is_tax_deductible"| TAX["📋 Tax Reports"]
    T --> NOTIFY["🔔 notifications"]
    T --> LOG["📝 activity_logs"]
```

---

## 🔄 Detailed Data Flow: Authentication & Sessions

```mermaid
flowchart LR
    A["🔑 Login Request"] --> B{"Validate<br/>Credentials"}
    B -->|"Invalid"| C["❌ login_attempts++"]
    C -->|">= threshold"| D["🔒 account_status: locked<br/>lock_until set"]
    B -->|"Valid"| E["✅ Generate Tokens"]
    E --> F["💾 sessions<br/>(refresh_token)"]
    E --> G["🍪 Access Token<br/>(JWT, short-lived)"]
    F --> H["📝 activity_logs<br/>(action: login)"]
    
    G -->|"Expired"| I{"Refresh<br/>Token Valid?"}
    I -->|"Yes"| J["🔄 New Access Token"]
    I -->|"No"| K["🚪 Force Re-login"]
    
    F -->|"Logout"| L["🗑️ is_active: false"]
```

---

## 📐 Index Coverage

| Table | Indexed Columns | Purpose |
|-------|----------------|---------|
| `users` | `email`, `unique_id` | Fast login lookup, unique ID search |
| `sessions` | `user_id`, `refresh_token`, `expires_at`, `is_active` | Token validation, cleanup |
| `properties` | `owner_id`, `status` | Owner portfolio, status filters |
| `categories` | `type`, `owner_id`, `is_system` | Category listings |
| `tenants` | `owner_id`, `property_id`, `status`, `email` | Tenant search & filters |
| `transactions` | `owner_id`, `property_id`, `tenant_id`, `date DESC`, `(type, status)` | Financial queries, date-range reports |
| `expenses` | `owner_id`, `property_id`, `date DESC`, `status` | Expense reporting |
| `activity_logs` | `user_id`, `action`, `created_at DESC` | Audit trail queries |
| `notifications` | `user_id`, `is_read`, `created_at DESC` | Notification feed |

---

> **💡 Tip:** To render this diagram, open this file in **GitHub**, **VS Code** (with Mermaid extension), or paste into [mermaid.live](https://mermaid.live).
