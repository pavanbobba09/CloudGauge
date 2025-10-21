-- Database migration script for Cloud Cost Optimizer
-- Version: 1.0.0
-- Description: Initial schema creation

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- User preferences table (normalized design)
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    default_region VARCHAR(50),
    preferred_providers TEXT[], -- Array of provider names
    budget_alerts BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one preference record per user
    UNIQUE(user_id)
);

-- Cost comparisons table
CREATE TABLE IF NOT EXISTS cost_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friendly_name VARCHAR(255),
    specs JSONB NOT NULL, -- Store ResourceSpecs as JSON
    results JSONB NOT NULL, -- Store PricingResult[] as JSON
    is_public BOOLEAN DEFAULT false,
    tags TEXT[], -- Array of tags for categorization
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pricing cache table for storing provider pricing data
CREATE TABLE IF NOT EXISTS pricing_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(20) NOT NULL,
    region VARCHAR(50) NOT NULL,
    instance_types JSONB NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Composite unique constraint
    UNIQUE(provider, region)
);

-- Performance metrics table for monitoring
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation VARCHAR(100) NOT NULL,
    duration_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Cost comparisons indexes
CREATE INDEX IF NOT EXISTS idx_cost_comparisons_user_id ON cost_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_comparisons_created_at ON cost_comparisons(created_at);
CREATE INDEX IF NOT EXISTS idx_cost_comparisons_is_public ON cost_comparisons(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_cost_comparisons_tags ON cost_comparisons USING GIN(tags);

-- Pricing cache indexes
CREATE INDEX IF NOT EXISTS idx_pricing_cache_provider_region ON pricing_cache(provider, region);
CREATE INDEX IF NOT EXISTS idx_pricing_cache_expires_at ON pricing_cache(expires_at);

-- Performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation ON performance_metrics(operation);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to relevant tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cost_comparisons_updated_at ON cost_comparisons;
CREATE TRIGGER update_cost_comparisons_updated_at 
    BEFORE UPDATE ON cost_comparisons 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for development
INSERT INTO users (email, password_hash, first_name, last_name) VALUES 
    ('demo@cloudoptimizer.com', '$2a$10$X1h7Kp4Vw2qK9mL8nB5eZ.vJ3jN7pQ8tR2kM6xC4yF9dS1aE3bG7h', 'Demo', 'User')
ON CONFLICT (email) DO NOTHING;

-- Create a view for user statistics (useful for admin dashboard)
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.created_at,
    COUNT(cc.id) as total_comparisons,
    COUNT(CASE WHEN cc.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as comparisons_last_30_days
FROM users u
LEFT JOIN cost_comparisons cc ON u.id = cc.user_id
GROUP BY u.id, u.email, u.first_name, u.last_name, u.created_at;
