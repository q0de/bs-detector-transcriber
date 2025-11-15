-- Video Transcriber & Analyzer Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Subscription info
  subscription_tier TEXT DEFAULT 'free',
    -- Values: 'free', 'starter', 'pro', 'business', 'enterprise'
  subscription_status TEXT DEFAULT 'active',
    -- Values: 'active', 'canceled', 'past_due', 'trialing'
  stripe_customer_id TEXT,
  
  -- Usage tracking (MINUTE-BASED)
  minutes_used_this_month DECIMAL DEFAULT 0,
  monthly_minute_limit INTEGER DEFAULT 60,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  
  -- Settings
  timezone TEXT DEFAULT 'UTC',
  email_notifications BOOLEAN DEFAULT true
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);

-- Table: videos
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Video info
  video_url TEXT NOT NULL,
  title TEXT,
  platform TEXT, -- 'youtube', 'instagram'
  duration_minutes DECIMAL, -- e.g., 15.5 minutes
  
  -- Processing results
  transcription TEXT, -- Large text field
  analysis TEXT, -- Large text field
  analysis_type TEXT, -- 'summarize', 'fact-check'
  processing_status TEXT DEFAULT 'pending',
    -- Values: 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  
  -- Billing
  minutes_charged DECIMAL, -- Rounded up (15.1 → 16)
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Indexes for videos
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(processing_status);

-- Table: subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Stripe info
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  
  -- Status
  status TEXT, -- 'active', 'canceled', 'past_due', 'trialing', 'incomplete'
  cancel_at_period_end BOOLEAN DEFAULT false,
  
  -- Billing periods
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  trial_end TIMESTAMP,
  canceled_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- Table: minute_transactions
CREATE TABLE IF NOT EXISTS minute_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  
  -- Transaction details
  minutes_used DECIMAL NOT NULL,
  transaction_type TEXT, -- 'video_processing', 'overage', 'refund', 'top_up'
  amount_charged DECIMAL DEFAULT 0, -- For overages
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for minute_transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON minute_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON minute_transactions(created_at DESC);

-- Table: usage_logs (Optional - for detailed analytics)
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  
  action TEXT, -- 'video_processed', 'export_pdf', 'export_docx', 'api_call'
  metadata JSONB, -- Flexible field for additional data
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Database Functions

-- Function: Reset Monthly Minutes (runs on 1st of each month)
CREATE OR REPLACE FUNCTION reset_monthly_minutes()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET 
    minutes_used_this_month = 0,
    last_reset_date = CURRENT_DATE
  WHERE 
    EXTRACT(DAY FROM CURRENT_DATE) = 1
    AND last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment Minute Usage
CREATE OR REPLACE FUNCTION increment_minute_usage(
  p_user_id UUID,
  p_minutes DECIMAL
)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET minutes_used_this_month = minutes_used_this_month + p_minutes
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Check Minute Limit
CREATE OR REPLACE FUNCTION check_minute_limit(
  p_user_id UUID,
  p_estimated_minutes DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_used DECIMAL;
  v_limit INTEGER;
BEGIN
  SELECT minutes_used_this_month, monthly_minute_limit
  INTO v_used, v_limit
  FROM users
  WHERE id = p_user_id;
  
  RETURN (v_used + p_estimated_minutes) <= v_limit;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE minute_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_own_data ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY videos_own_data ON videos
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY subscriptions_own_data ON subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY transactions_own_data ON minute_transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY logs_own_data ON usage_logs
  FOR ALL USING (auth.uid() = user_id);

