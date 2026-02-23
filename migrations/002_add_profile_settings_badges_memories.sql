-- Migration: Add profile settings, badges, and memories tables
-- Safe to run: All columns have DEFAULT values, won't break existing auth flow
-- Run this in Supabase SQL Editor BEFORE merging tony-profile-settings

-- =====================================================
-- 1. ADD PRIVACY SETTINGS TO PROFILES  
-- =====================================================
-- These columns are optional and won't affect sign-up trigger

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_visibility text DEFAULT 'friends' 
    CHECK (profile_visibility IN ('public', 'friends', 'private')),
  ADD COLUMN IF NOT EXISTS show_badges boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_memories boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_upcoming_hangouts boolean DEFAULT true;

COMMENT ON COLUMN profiles.profile_visibility IS 'Who can view this profile: public, friends, or private';
COMMENT ON COLUMN profiles.show_badges IS 'Whether to display badges on profile';
COMMENT ON COLUMN profiles.show_memories IS 'Whether to display memories on profile';
COMMENT ON COLUMN profiles.show_upcoming_hangouts IS 'Whether to show upcoming hangouts on profile';

-- =====================================================
-- 2. CREATE BADGES TABLE (Gamification)
-- =====================================================

CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type text NOT NULL, -- e.g., 'first-hangout', 'social-butterfly', 'night-owl'
  title text NOT NULL,
  description text,
  icon text, -- icon identifier or URL
  earned_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}', -- flexible storage for badge-specific data
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_type) -- One badge of each type per user
);

-- Index for fast user badge lookups
CREATE INDEX IF NOT EXISTS idx_badges_user_id ON badges(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_earned_at ON badges(earned_at DESC);

-- RLS Policies for badges
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Users can read their own badges
CREATE POLICY "Users can view their own badges"
  ON badges FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view badges of public/friends profiles (respects privacy settings)
CREATE POLICY "Users can view badges of visible profiles"
  ON badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = badges.user_id
      AND (
        profiles.profile_visibility = 'public'
        OR (
          profiles.profile_visibility = 'friends'
          AND EXISTS (
            SELECT 1 FROM friendships
            WHERE (friendships.user_id = auth.uid() AND friendships.friend_id = profiles.id AND friendships.status = 'accepted')
               OR (friendships.friend_id = auth.uid() AND friendships.user_id = profiles.id AND friendships.status = 'accepted')
          )
        )
      )
      AND profiles.show_badges = true
    )
  );

-- Only system/backend can insert badges (for now)
-- Add INSERT policy later if users can "claim" badges

COMMENT ON TABLE badges IS 'User achievement badges for gamification';

-- =====================================================
-- 3. CREATE MEMORIES TABLE (Photo Uploads)
-- =====================================================

CREATE TABLE IF NOT EXISTS memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text, -- Supabase Storage URL
  event_id uuid REFERENCES events(id) ON DELETE SET NULL, -- Optional link to event
  hangout_id uuid, -- Future: link to hangout
  location text,
  memory_date date, -- When the memory happened
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_event_id ON memories(event_id);
CREATE INDEX IF NOT EXISTS idx_memories_memory_date ON memories(memory_date DESC);

-- RLS Policies for memories
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Users can manage their own memories
CREATE POLICY "Users can view their own memories"
  ON memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories"
  ON memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories"
  ON memories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
  ON memories FOR DELETE
  USING (auth.uid() = user_id);

-- Users can view memories of public/friends profiles (respects privacy)
CREATE POLICY "Users can view memories of visible profiles"
  ON memories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = memories.user_id
      AND (
        profiles.profile_visibility = 'public'
        OR (
          profiles.profile_visibility = 'friends'
          AND EXISTS (
            SELECT 1 FROM friendships
            WHERE (friendships.user_id = auth.uid() AND friendships.friend_id = profiles.id AND friendships.status = 'accepted')
               OR (friendships.friend_id = auth.uid() AND friendships.user_id = profiles.id AND friendships.status = 'accepted')
          )
        )
      )
      AND profiles.show_memories = true
    )
  );

COMMENT ON TABLE memories IS 'User photo memories from events and hangouts';

-- =====================================================
-- 4. CREATE BLOCKED USERS TABLE (Optional - Low Priority)
-- =====================================================

CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_at timestamptz DEFAULT now(),
  reason text, -- Optional reason for blocking
  UNIQUE(user_id, blocked_user_id),
  CHECK (user_id != blocked_user_id) -- Can't block yourself
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_user_id ON blocked_users(blocked_user_id);

-- RLS for blocked users
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own blocked list"
  ON blocked_users FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE blocked_users IS 'Users blocked by others';

-- =====================================================
-- 5. UPDATE FRIENDSHIPS TABLE TO RESPECT BLOCKS
-- =====================================================
-- Add policy to prevent friend requests to/from blocked users

CREATE POLICY IF NOT EXISTS "Cannot create friendships with blocked users"
  ON friendships FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocked_users.user_id = auth.uid() AND blocked_users.blocked_user_id = friendships.friend_id)
         OR (blocked_users.user_id = friendships.friend_id AND blocked_users.blocked_user_id = auth.uid())
    )
  );

-- =====================================================
-- 6. VERIFY EXISTING TRIGGER STILL WORKS
-- =====================================================
-- This is just a comment for reference - don't modify the trigger
-- The handle_new_user() trigger should still work because:
-- 1. New columns have DEFAULT values
-- 2. NOT NULL constraints aren't added to existing columns
-- 3. Trigger only inserts (id, email) or (id, email, full_name)

-- =====================================================
-- 7. GRANT PERMISSIONS (if needed)
-- =====================================================
-- Ensure authenticated users can read from new tables
GRANT SELECT ON badges TO authenticated;
GRANT SELECT ON memories TO authenticated;
GRANT ALL ON blocked_users TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after migration to verify everything works:

-- Check profiles columns
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles'
-- ORDER BY ordinal_position;

-- Check new tables exist
-- SELECT tablename FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('badges', 'memories', 'blocked_users');

-- Test trigger still works by creating test user (then delete):
-- This should automatically create a profile with default privacy settings
