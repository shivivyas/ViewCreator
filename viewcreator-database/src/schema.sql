-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for fast user lookups by email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Templates Table
DROP TABLE IF EXISTS templates CASCADE;
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    s3_link VARCHAR(512) NOT NULL,
    -- JSONB to store flexible configurations such as bounding boxes, text placement, 
    -- dimensions, overlay properties, or default prompts
    config JSONB DEFAULT '{}'::jsonb NOT NULL,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for searching metadata configuration keys quickly
CREATE INDEX IF NOT EXISTS idx_templates_config ON templates USING gin (config);

-- Trigger to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_timestamp trigger to users
DROP TRIGGER IF EXISTS update_users_timestamp ON users;
CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Apply update_timestamp trigger to templates
DROP TRIGGER IF EXISTS update_templates_timestamp ON templates;
CREATE TRIGGER update_templates_timestamp
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
