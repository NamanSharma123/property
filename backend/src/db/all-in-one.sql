-- ============================================================================
-- PROPERLY — All-in-One Database Setup Script 
-- ============================================================================
-- This single file creates EVERYTHING needed for a fresh database:
--   1. Extensions
--   2. All tables (core)
--   3. All indexes
--   4. Trigger function + triggers
--
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS / ON CONFLICT everywhere.
-- ============================================================================


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ═══════════════════════════════════════════════════════════════════════════
-- 2. CORE TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────── USERS ───────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(100) NOT NULL,
    email               VARCHAR(255) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
    role                VARCHAR(20)  DEFAULT 'staff'
                            CHECK (role IN ('admin', 'manager', 'staff')),
    unique_id           VARCHAR(50)  UNIQUE,
    phone               VARCHAR(50),
    avatar              TEXT,
    is_email_verified   BOOLEAN      DEFAULT FALSE,
    account_status      VARCHAR(20)  DEFAULT 'active'
                            CHECK (account_status IN ('active', 'suspended', 'locked')),
    login_attempts      INTEGER      DEFAULT 0,
    lock_until          TIMESTAMPTZ,
    last_login          TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────── SESSIONS ───────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token   VARCHAR(255) NOT NULL UNIQUE,
    device_info     JSONB        DEFAULT '{}',
    ip_address      VARCHAR(45),
    is_active       BOOLEAN      DEFAULT TRUE,
    expires_at      TIMESTAMPTZ  NOT NULL,
    last_activity   TIMESTAMPTZ  DEFAULT NOW(),
    location        JSONB        DEFAULT '{}',
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────── PROPERTIES ───────────────────────
CREATE TABLE IF NOT EXISTS properties (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name              VARCHAR(200) NOT NULL,
    address           JSONB        NOT NULL DEFAULT '{}',
    full_address      TEXT,
    type              VARCHAR(50)  DEFAULT 'residential'
                          CHECK (type IN ('residential', 'commercial', 'industrial', 'mixed-use', 'land')),
    sub_type          VARCHAR(50)
                          CHECK (sub_type IN ('single-family', 'multi-family', 'apartment', 'condo', 'townhouse', 'office', 'retail', 'warehouse', 'other')),
    units             INTEGER      DEFAULT 1      CHECK (units >= 1),
    occupancy         INTEGER      DEFAULT 0      CHECK (occupancy >= 0),
    purchase_price    DECIMAL(15, 2),
    purchase_date     DATE,
    current_value     DECIMAL(15, 2),
    monthly_rent      DECIMAL(10, 2),
    year_built        INTEGER,
    square_feet       INTEGER      CHECK (square_feet >= 0),
    lot_size          INTEGER      CHECK (lot_size >= 0),
    bedrooms          INTEGER      CHECK (bedrooms >= 0),
    bathrooms         DECIMAL(3, 1) CHECK (bathrooms >= 0),
    amenities         TEXT[],
    description       TEXT,
    images            JSONB        DEFAULT '[]',
    status            VARCHAR(20)  DEFAULT 'active'
                          CHECK (status IN ('active', 'inactive', 'sold', 'pending')),
    tax_id            VARCHAR(100),
    notes             TEXT,
    loan_details      JSONB        DEFAULT '{}',
    ownership_details JSONB        DEFAULT '{}',
    ownership         VARCHAR(100),
    has_depreciation  BOOLEAN      DEFAULT FALSE,
    usage             VARCHAR(50),
    abn               VARCHAR(50),
    created_at        TIMESTAMPTZ  DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────── CATEGORIES ───────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id          UUID         REFERENCES users(id) ON DELETE CASCADE,
    name              VARCHAR(100) NOT NULL,
    type              VARCHAR(20)  NOT NULL CHECK (type IN ('income', 'expense', 'both')),
    description       VARCHAR(500),
    icon              VARCHAR(50),
    color             VARCHAR(20)  DEFAULT '#6B7280',
    parent_id         UUID         REFERENCES categories(id) ON DELETE SET NULL,
    is_system         BOOLEAN      DEFAULT FALSE,
    tax_code          VARCHAR(50),
    is_tax_deductible BOOLEAN      DEFAULT FALSE,
    is_active         BOOLEAN      DEFAULT TRUE,
    created_at        TIMESTAMPTZ  DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────── TENANTS ───────────────────────
CREATE TABLE IF NOT EXISTS tenants (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id            UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id         UUID         NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,
    email               VARCHAR(255),
    phone               VARCHAR(50),
    unit                VARCHAR(50)  DEFAULT '1',
    lease_start         DATE         NOT NULL,
    lease_end           DATE         NOT NULL,
    monthly_rent        DECIMAL(10, 2) NOT NULL CHECK (monthly_rent >= 0),
    security_deposit    DECIMAL(10, 2) DEFAULT 0  CHECK (security_deposit >= 0),
    rent_due_day        INTEGER      DEFAULT 1    CHECK (rent_due_day >= 1 AND rent_due_day <= 28),
    status              VARCHAR(20)  DEFAULT 'pending'
                            CHECK (status IN ('active', 'inactive', 'pending', 'evicted')),
    emergency_contact   JSONB        DEFAULT '{}',
    documents           JSONB        DEFAULT '[]',
    move_in_date        DATE,
    move_out_date       DATE,
    notes               TEXT,
    created_at          TIMESTAMPTZ  DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────── TRANSACTIONS ───────────────────────
CREATE TABLE IF NOT EXISTS transactions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id                UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id             UUID         NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id               UUID         REFERENCES tenants(id) ON DELETE SET NULL,
    category_id             UUID         REFERENCES categories(id) ON DELETE SET NULL,
    description             VARCHAR(500) NOT NULL,
    amount                  DECIMAL(12, 2) NOT NULL,
    date                    DATE         NOT NULL DEFAULT CURRENT_DATE,
    type                    VARCHAR(20)  NOT NULL CHECK (type IN ('income', 'expense')),
    category_name           VARCHAR(100),
    transaction_source      VARCHAR(50)  DEFAULT 'Manual Entry'
                                CHECK (transaction_source IN ('Manual Entry', 'OCR Upload', 'Bank Feed', 'Rental Summary')),
    status                  VARCHAR(20)  DEFAULT 'pending'
                                CHECK (status IN ('pending', 'paid', 'cancelled', 'overdue')),
    payment_method          VARCHAR(30)
                                CHECK (payment_method IN ('cash', 'check', 'bank-transfer', 'credit-card', 'other')),
    reference_number        VARCHAR(100),
    receipt_url             TEXT,
    attachments             JSONB        DEFAULT '[]',
    is_recurring            BOOLEAN      DEFAULT FALSE,
    recurring_frequency     VARCHAR(20)
                                CHECK (recurring_frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    recurring_end_date      DATE,
    parent_transaction_id   UUID         REFERENCES transactions(id) ON DELETE SET NULL,
    notes                   TEXT,
    is_tax_deductible       BOOLEAN      DEFAULT FALSE,
    tax_category            VARCHAR(100),
    created_by              UUID         REFERENCES users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ  DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────── EXPENSES ───────────────────────
CREATE TABLE IF NOT EXISTS expenses (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id            UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id         UUID         NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    category_id         UUID         REFERENCES categories(id) ON DELETE SET NULL,
    description         VARCHAR(500) NOT NULL,
    amount              DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    date                DATE         NOT NULL DEFAULT CURRENT_DATE,
    category_name       VARCHAR(100),
    status              VARCHAR(20)  DEFAULT 'pending'
                            CHECK (status IN ('pending', 'paid', 'cancelled')),
    vendor              JSONB        DEFAULT '{}',
    receipt_url         TEXT,
    attachments         JSONB        DEFAULT '[]',
    payment_method      VARCHAR(30)
                            CHECK (payment_method IN ('cash', 'check', 'bank-transfer', 'credit-card', 'other')),
    reference_number    VARCHAR(100),
    paid_date           DATE,
    is_recurring        BOOLEAN      DEFAULT FALSE,
    recurring_frequency VARCHAR(20)
                            CHECK (recurring_frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    notes               TEXT,
    is_tax_deductible   BOOLEAN      DEFAULT TRUE,
    tax_category        VARCHAR(100),
    created_by          UUID         REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ  DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────── ACTIVITY LOGS ───────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action          VARCHAR(50)  NOT NULL,
    description     VARCHAR(500),
    resource_type   VARCHAR(50),
    resource_id     UUID,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    success         BOOLEAN      DEFAULT TRUE,
    error_message   TEXT,
    metadata        JSONB        DEFAULT '{}',
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────── NOTIFICATIONS ───────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50)  NOT NULL
                    CHECK (type IN ('property', 'transaction', 'security', 'system', 'subscription')),
    title       VARCHAR(200) NOT NULL,
    message     TEXT         NOT NULL,
    is_read     BOOLEAN      DEFAULT FALSE,
    action_url  TEXT,
    metadata    JSONB        DEFAULT '{}',
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email              ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_unique_id           ON users(unique_id);

-- Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id          ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token    ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at       ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active        ON sessions(is_active);

-- Properties
CREATE INDEX IF NOT EXISTS idx_properties_owner_id       ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_status         ON properties(status);

-- Categories
CREATE INDEX IF NOT EXISTS idx_categories_type           ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_owner_id       ON categories(owner_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_system      ON categories(is_system);

-- Tenants
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id          ON tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id       ON tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status            ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_email             ON tenants(email);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_owner_id     ON transactions(owner_id);
CREATE INDEX IF NOT EXISTS idx_transactions_property_id  ON transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id    ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date         ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status  ON transactions(type, status);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_owner_id         ON expenses(owner_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id      ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date             ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_status           ON expenses(status);

-- Activity Logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id     ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action      ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at  ON activity_logs(created_at DESC);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id     ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read     ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at  ON notifications(created_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. TRIGGER FUNCTION  +  TRIGGERS  (auto-update `updated_at`)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Core tables
DROP TRIGGER IF EXISTS update_users_updated_at          ON users;
CREATE TRIGGER update_users_updated_at          BEFORE UPDATE ON users          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sessions_updated_at       ON sessions;
CREATE TRIGGER update_sessions_updated_at       BEFORE UPDATE ON sessions       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_properties_updated_at     ON properties;
CREATE TRIGGER update_properties_updated_at     BEFORE UPDATE ON properties     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at     ON categories;
CREATE TRIGGER update_categories_updated_at     BEFORE UPDATE ON categories     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenants_updated_at        ON tenants;
CREATE TRIGGER update_tenants_updated_at        BEFORE UPDATE ON tenants        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at   ON transactions;
CREATE TRIGGER update_transactions_updated_at   BEFORE UPDATE ON transactions   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at       ON expenses;
CREATE TRIGGER update_expenses_updated_at       BEFORE UPDATE ON expenses       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════
-- ✅  ALL DONE — Your database is fully set up!
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Tables created (9):
--   • users                  — User accounts & authentication
--   • sessions               — Refresh token / session management
--   • properties             — Real estate properties
--   • categories             — Income & expense categories
--   • tenants                — Tenant lease records
--   • transactions           — Income & expense transactions
--   • expenses               — Standalone expense records
--   • activity_logs          — Audit trail
--   • notifications          — In-app notifications
--
-- ═══════════════════════════════════════════════════════════════════════════
