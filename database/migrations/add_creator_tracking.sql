-- Migration: Add Creator Tracking System
-- Description: Track content creators globally and their fact-check scores
-- Date: 2025-11-16

-- =============================================================================
-- 1. CREATORS TABLE
-- =============================================================================
-- Tracks content creators across all users
CREATE TABLE IF NOT EXISTS creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Creator identification
  name TEXT NOT NULL,
  platform_id TEXT NOT NULL, -- YouTube channel ID, Instagram username, etc.
  platform TEXT NOT NULL, -- 'youtube', 'instagram', etc.
  
  -- Statistics
  total_videos_analyzed INTEGER DEFAULT 0,
  avg_fact_score DECIMAL(3,1), -- Average fact-check score (0-10)
  last_fact_score DECIMAL(3,1), -- Most recent fact-check score
  
  -- Timestamps
  first_seen TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  
  -- Metadata
  channel_url TEXT,
  subscriber_count INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint: one record per platform+platform_id combination
  UNIQUE(platform, platform_id)
);

-- Indexes for creators
CREATE INDEX IF NOT EXISTS idx_creators_platform ON creators(platform);
CREATE INDEX IF NOT EXISTS idx_creators_platform_id ON creators(platform_id);
CREATE INDEX IF NOT EXISTS idx_creators_avg_score ON creators(avg_fact_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_creators_total_videos ON creators(total_videos_analyzed DESC);
CREATE INDEX IF NOT EXISTS idx_creators_last_seen ON creators(last_seen DESC);

-- =============================================================================
-- 2. VIDEO_UPLOADS TABLE
-- =============================================================================
-- Tracks how many times each video has been uploaded globally
CREATE TABLE IF NOT EXISTS video_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Video identification
  video_url TEXT NOT NULL UNIQUE,
  normalized_url TEXT, -- Normalized version for de-duplication
  
  -- Creator reference
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  
  -- Statistics
  upload_count INTEGER DEFAULT 1,
  
  -- Timestamps
  first_uploaded TIMESTAMP DEFAULT NOW(),
  last_uploaded TIMESTAMP DEFAULT NOW(),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for video_uploads
CREATE INDEX IF NOT EXISTS idx_video_uploads_url ON video_uploads(video_url);
CREATE INDEX IF NOT EXISTS idx_video_uploads_creator ON video_uploads(creator_id);
CREATE INDEX IF NOT EXISTS idx_video_uploads_count ON video_uploads(upload_count DESC);

-- =============================================================================
-- 3. ALTER VIDEOS TABLE
-- =============================================================================
-- Add creator tracking columns to existing videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES creators(id) ON DELETE SET NULL;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS creator_name TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS creator_platform_id TEXT;

-- Indexes for videos table
CREATE INDEX IF NOT EXISTS idx_videos_creator_id ON videos(creator_id);
CREATE INDEX IF NOT EXISTS idx_videos_creator_platform_id ON videos(creator_platform_id);

-- =============================================================================
-- 4. FUNCTIONS
-- =============================================================================

-- Function: Upsert creator and return creator_id
CREATE OR REPLACE FUNCTION upsert_creator(
  p_name TEXT,
  p_platform_id TEXT,
  p_platform TEXT,
  p_channel_url TEXT DEFAULT NULL,
  p_subscriber_count INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_creator_id UUID;
BEGIN
  INSERT INTO creators (name, platform_id, platform, channel_url, subscriber_count)
  VALUES (p_name, p_platform_id, p_platform, p_channel_url, p_subscriber_count)
  ON CONFLICT (platform, platform_id) 
  DO UPDATE SET
    name = EXCLUDED.name,
    channel_url = COALESCE(EXCLUDED.channel_url, creators.channel_url),
    subscriber_count = COALESCE(EXCLUDED.subscriber_count, creators.subscriber_count),
    last_seen = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_creator_id;
  
  RETURN v_creator_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Update creator stats after new fact-check
CREATE OR REPLACE FUNCTION update_creator_stats(
  p_creator_id UUID,
  p_new_fact_score DECIMAL
)
RETURNS VOID AS $$
DECLARE
  v_total_videos INTEGER;
  v_current_avg DECIMAL;
  v_new_avg DECIMAL;
BEGIN
  -- Get current stats
  SELECT total_videos_analyzed, avg_fact_score
  INTO v_total_videos, v_current_avg
  FROM creators
  WHERE id = p_creator_id;
  
  -- Calculate new average with weighted formula (recent videos count more)
  -- Weight: last video = 2x, older videos = 1x
  IF v_total_videos = 0 OR v_current_avg IS NULL THEN
    v_new_avg := p_new_fact_score;
  ELSE
    -- Weighted average: (current_avg * total + new_score * 2) / (total + 2)
    v_new_avg := (v_current_avg * v_total_videos + p_new_fact_score * 2) / (v_total_videos + 2);
  END IF;
  
  -- Update creator stats
  UPDATE creators
  SET
    total_videos_analyzed = total_videos_analyzed + 1,
    avg_fact_score = v_new_avg,
    last_fact_score = p_new_fact_score,
    last_seen = NOW(),
    updated_at = NOW()
  WHERE id = p_creator_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Track video upload
CREATE OR REPLACE FUNCTION track_video_upload(
  p_video_url TEXT,
  p_creator_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO video_uploads (video_url, creator_id, upload_count)
  VALUES (p_video_url, p_creator_id, 1)
  ON CONFLICT (video_url)
  DO UPDATE SET
    upload_count = video_uploads.upload_count + 1,
    last_uploaded = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read creator stats (public leaderboard)
CREATE POLICY creators_public_read ON creators
  FOR SELECT USING (true);

-- Policy: Only authenticated users can read video upload stats
CREATE POLICY video_uploads_auth_read ON video_uploads
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy: System can insert/update (handled by functions)
CREATE POLICY creators_system_write ON creators
  FOR ALL USING (true);

CREATE POLICY video_uploads_system_write ON video_uploads
  FOR ALL USING (true);

-- =============================================================================
-- 6. COMMENTS
-- =============================================================================

COMMENT ON TABLE creators IS 'Global tracking of content creators and their fact-check scores';
COMMENT ON TABLE video_uploads IS 'Tracks how many times each video has been analyzed across all users';
COMMENT ON COLUMN creators.avg_fact_score IS 'Weighted average favoring recent videos (0-10 scale)';
COMMENT ON COLUMN creators.total_videos_analyzed IS 'Minimum 10 required before showing public score';
COMMENT ON FUNCTION update_creator_stats IS 'Updates creator score with 2x weight for newest video';

