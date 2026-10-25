-- =====================================================================
-- AGRI-PROFIT: Relational Database Schema (PostgreSQL 14+)
-- Designed for Farmers & Agricultural Financial Analysis
-- =====================================================================

-- Enable UUID extension if using UUIDs (optional, here we provide BIGSERIAL for high performance)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. USERS TABLE
-- Manages farmer accounts, authentication, and contact information.
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    preferred_currency VARCHAR(3) DEFAULT 'USD', -- ISO-4217: USD, EUR, CAD, etc.
    preferred_unit_system VARCHAR(10) DEFAULT 'imperial', -- 'imperial' (acres, bushels) or 'metric' (hectares, kg)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- ---------------------------------------------------------------------
-- 2. FARM PROFILES TABLE
-- Accommodates single or multi-farm ownership per user.
-- ---------------------------------------------------------------------
CREATE TABLE farm_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    farm_name VARCHAR(200) NOT NULL,
    legal_entity_name VARCHAR(200),
    tax_identifier VARCHAR(50), -- EIN or national farm registry number
    country VARCHAR(100) NOT NULL DEFAULT 'United States',
    state_province VARCHAR(100),
    county_district VARCHAR(100),
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    total_acreage NUMERIC(12, 2) NOT NULL CHECK (total_acreage > 0),
    tillable_acreage NUMERIC(12, 2) CHECK (tillable_acreage <= total_acreage),
    soil_type VARCHAR(100), -- e.g., 'Silt Loam', 'Clay Loam', 'Sandy'
    climate_zone VARCHAR(50),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_farm_profiles_user ON farm_profiles(user_id);

-- ---------------------------------------------------------------------
-- 3. CROP & LIVESTOCK TYPES (ENTERPRISE MASTER)
-- Master list of agricultural commodities/enterprises per farm.
-- ---------------------------------------------------------------------
CREATE TYPE agricultural_enterprise_type AS ENUM ('crop', 'livestock', 'agroforestry', 'aquaculture', 'other');

CREATE TABLE crop_livestock_types (
    id BIGSERIAL PRIMARY KEY,
    farm_id BIGINT NOT NULL REFERENCES farm_profiles(id) ON DELETE CASCADE,
    enterprise_type agricultural_enterprise_type NOT NULL DEFAULT 'crop',
    name VARCHAR(100) NOT NULL, -- e.g., 'Corn', 'Winter Wheat', 'Soybeans', 'Angus Beef'
    variety_breed VARCHAR(100), -- e.g., 'Pioneer 1197', 'Non-GMO Hard Red'
    allocated_acreage NUMERIC(10, 2) DEFAULT 0 CHECK (allocated_acreage >= 0),
    head_count INTEGER DEFAULT 0 CHECK (head_count >= 0),
    yield_unit VARCHAR(30) NOT NULL DEFAULT 'bushels', -- 'bushels', 'tons', 'bales', 'cwt', 'lbs'
    planting_season VARCHAR(50), -- e.g., 'Spring 2026', 'Fall 2025'
    target_yield_per_acre NUMERIC(10, 2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_farm_crop_name UNIQUE (farm_id, name, planting_season)
);

CREATE INDEX idx_crop_livestock_farm ON crop_livestock_types(farm_id);

-- ---------------------------------------------------------------------
-- 4. INCOME ENTRIES TABLE
-- Tracks all farm receipts, commodity sales, subsidies, and leases.
-- ---------------------------------------------------------------------
CREATE TYPE income_category AS ENUM (
    'crop_sales',
    'livestock_sales',
    'government_subsidy',   -- USDA ARC/PLC, CRP, disaster relief
    'crop_insurance_payout',
    'land_leasing',         -- Leasing pastures/hunting rights
    'custom_work_contract', -- Combining/spraying for neighboring farms
    'equipment_rental',
    'value_added_products', -- Jams, cider, packaged meat
    'agritourism',
    'other_income'
);

CREATE TABLE income_entries (
    id BIGSERIAL PRIMARY KEY,
    farm_id BIGINT NOT NULL REFERENCES farm_profiles(id) ON DELETE CASCADE,
    crop_livestock_id BIGINT REFERENCES crop_livestock_types(id) ON DELETE SET NULL, 
    -- Nullable: general farm subsidies or land leases are not tied to a single crop
    tax_year SMALLINT NOT NULL CHECK (tax_year BETWEEN 1990 AND 2100),
    transaction_date DATE NOT NULL,
    category income_category NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Quantity & Pricing metrics
    quantity_sold NUMERIC(12, 2) CHECK (quantity_sold >= 0),
    unit_of_measure VARCHAR(30), -- 'bushels', 'cwt', 'tons'
    price_per_unit NUMERIC(10, 2) CHECK (price_per_unit >= 0),
    
    buyer_payee VARCHAR(150), -- e.g., 'Cargill Grain Elevator', 'USDA FSA', 'Local Co-op'
    invoice_number VARCHAR(100),
    payment_method VARCHAR(50) DEFAULT 'check', -- 'check', 'wire', 'ach', 'cash'
    receipt_document_url TEXT,
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_income_farm_year ON income_entries(farm_id, tax_year);
CREATE INDEX idx_income_date ON income_entries(transaction_date);
CREATE INDEX idx_income_crop ON income_entries(crop_livestock_id);
CREATE INDEX idx_income_category ON income_entries(category);

-- ---------------------------------------------------------------------
-- 5. EXPENSE ENTRIES TABLE
-- Captures variable production inputs, machinery operating costs, and fixed overhead.
-- ---------------------------------------------------------------------
CREATE TYPE expense_category AS ENUM (
    'seeds_plants',
    'fertilizer_lime',
    'chemicals_crop_protection', -- Herbicides, pesticides, fungicides
    'labor_hired',              -- Full-time, seasonal, H-2A guest workers
    'fuel_diesel_oil',          -- Off-road diesel, DEF, lubricants
    'repairs_maintenance',      -- Tractors, implements, irrigation pumps
    'rent_land_lease',          -- Cash rent per acre or share rent
    'water_irrigation',         -- District water dues, pumping power
    'feed_livestock_care',      -- Hay, silage, mineral blocks, vet services
    'storage_warehousing',      -- Grain drying, elevator storage
    'freight_trucking',         -- Hauling grain/livestock to terminal
    'crop_livestock_insurance',
    'property_taxes',
    'utilities_electric_gas',
    'interest_loan_payments',
    'professional_fees_permits',-- Agronomist, accountant, soil sampling
    'other_operating_expense'
);

CREATE TABLE expense_entries (
    id BIGSERIAL PRIMARY KEY,
    farm_id BIGINT NOT NULL REFERENCES farm_profiles(id) ON DELETE CASCADE,
    crop_livestock_id BIGINT REFERENCES crop_livestock_types(id) ON DELETE SET NULL,
    -- Nullable: General farm overhead (diesel, property tax, shop repairs) can be unallocated
    tax_year SMALLINT NOT NULL CHECK (tax_year BETWEEN 1990 AND 2100),
    transaction_date DATE NOT NULL,
    category expense_category NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Agricultural input tracking
    quantity NUMERIC(12, 2) CHECK (quantity >= 0),
    unit_of_measure VARCHAR(30), -- 'bags', 'gallons', 'tons', 'hours'
    price_per_unit NUMERIC(10, 2) CHECK (price_per_unit >= 0),
    
    vendor_payee VARCHAR(150), -- e.g., 'Nutrien Ag Solutions', 'John Deere Financial', 'Pioneer Seeds'
    receipt_invoice_number VARCHAR(100),
    payment_method VARCHAR(50) DEFAULT 'credit_account', -- 'check', 'credit_account', 'ach', 'cash'
    receipt_image_url TEXT,
    is_tax_deductible BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_farm_year ON expense_entries(farm_id, tax_year);
CREATE INDEX idx_expenses_date ON expense_entries(transaction_date);
CREATE INDEX idx_expenses_crop ON expense_entries(crop_livestock_id);
CREATE INDEX idx_expenses_category ON expense_entries(category);

-- ---------------------------------------------------------------------
-- 6. ANNUAL SUMMARIES TABLE
-- Materialized rollup table for rapid dashboard rendering and historical analysis.
-- ---------------------------------------------------------------------
CREATE TABLE annual_summaries (
    id BIGSERIAL PRIMARY KEY,
    farm_id BIGINT NOT NULL REFERENCES farm_profiles(id) ON DELETE CASCADE,
    tax_year SMALLINT NOT NULL CHECK (tax_year BETWEEN 1990 AND 2100),
    
    -- High-Level Totals
    total_gross_income NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_operating_expenses NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    net_farm_income NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- Can be negative in drought/crop loss years
    operating_profit_margin_pct NUMERIC(6, 2) DEFAULT 0.00, -- (Net / Gross) * 100
    
    -- Key Insights
    highest_expense_category VARCHAR(100),
    highest_expense_amount NUMERIC(14, 2) DEFAULT 0.00,
    most_profitable_crop_id BIGINT REFERENCES crop_livestock_types(id) ON DELETE SET NULL,
    most_profitable_crop_name VARCHAR(100),
    most_profitable_crop_net NUMERIC(14, 2) DEFAULT 0.00,
    
    -- Pre-aggregated breakdowns cached in JSONB for rapid UI loading
    monthly_trend_json JSONB DEFAULT '[]'::jsonb, -- [{month: 1, income: X, expense: Y}, ...]
    category_expense_breakdown JSONB DEFAULT '{}'::jsonb, -- {fertilizer: X, seed: Y, ...}
    crop_performance_breakdown JSONB DEFAULT '[]'::jsonb, -- [{crop_id: 1, name: 'Corn', revenue: X, expense: Y, net: Z, margin: W}]
    
    last_recalculated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_farm_tax_year UNIQUE (farm_id, tax_year)
);

CREATE INDEX idx_annual_summaries_farm_year ON annual_summaries(farm_id, tax_year);

-- ---------------------------------------------------------------------
-- 7. HELPER VIEW: CROP ENTERPRISE PROFITABILITY VIEW
-- Real-time calculation view breaking down revenue, expense, and net per crop.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW view_crop_profitability AS
SELECT 
    c.farm_id,
    c.id AS crop_id,
    c.name AS crop_name,
    c.variety_breed,
    c.allocated_acreage,
    c.planting_season,
    COALESCE(inc.total_income, 0.00) AS total_revenue,
    COALESCE(exp.total_expenses, 0.00) AS total_expenses,
    (COALESCE(inc.total_income, 0.00) - COALESCE(exp.total_expenses, 0.00)) AS net_profit,
    CASE 
        WHEN COALESCE(inc.total_income, 0.00) > 0 
        THEN ROUND(((COALESCE(inc.total_income, 0.00) - COALESCE(exp.total_expenses, 0.00)) / inc.total_income * 100), 2)
        ELSE 0.00 
    END AS profit_margin_pct,
    CASE 
        WHEN c.allocated_acreage > 0 
        THEN ROUND(((COALESCE(inc.total_income, 0.00) - COALESCE(exp.total_expenses, 0.00)) / c.allocated_acreage), 2)
        ELSE NULL 
    END AS profit_per_acre
FROM crop_livestock_types c
LEFT JOIN (
    SELECT crop_livestock_id, SUM(amount) AS total_income
    FROM income_entries
    WHERE crop_livestock_id IS NOT NULL
    GROUP BY crop_livestock_id
) inc ON c.id = inc.crop_livestock_id
LEFT JOIN (
    SELECT crop_livestock_id, SUM(amount) AS total_expenses
    FROM expense_entries
    WHERE crop_livestock_id IS NOT NULL
    GROUP BY crop_livestock_id
) exp ON c.id = exp.crop_livestock_id;
