-- Migration: Add groups and group_members tables
-- Run this in Supabase SQL Editor to fix 404 errors for groups

-- =====================================================
-- 1. CREATE GROUPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_groups_owner_id ON groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at DESC);

-- Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups
CREATE POLICY "Users can view groups they're part of"
  ON groups FOR SELECT
  USING (
    auth.uid() = owner_id OR
    auth.uid() IN (
      SELECT user_id FROM group_members WHERE group_id = groups.id
    )
  );

CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Group owners can update their groups"
  ON groups FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Group owners can delete their groups"
  ON groups FOR DELETE
  USING (auth.uid() = owner_id);

COMMENT ON TABLE groups IS 'User-created groups for organizing friends and hangouts';

-- =====================================================
-- 2. CREATE GROUP_MEMBERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);

-- Enable RLS
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_members
CREATE POLICY "Users can view group members of groups they're in"
  ON group_members FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM group_members gm WHERE gm.group_id = group_members.group_id
    )
  );

CREATE POLICY "Group admins can add members"
  ON group_members FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM group_members 
      WHERE group_id = group_members.group_id AND role = 'admin'
    )
    OR
    -- Allow owner to add first admin (themselves)
    auth.uid() IN (
      SELECT owner_id FROM groups WHERE id = group_members.group_id
    )
  );

CREATE POLICY "Group admins can remove members"
  ON group_members FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM group_members 
      WHERE group_id = group_members.group_id AND role = 'admin'
    )
    OR auth.uid() = user_id -- Users can leave groups
  );

CREATE POLICY "Group admins can update member roles"
  ON group_members FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM group_members 
      WHERE group_id = group_members.group_id AND role = 'admin'
    )
  );

COMMENT ON TABLE group_members IS 'Members belonging to groups';

-- =====================================================
-- 3. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON group_members TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES (Run after migration)
-- =====================================================

-- Check tables exist
-- SELECT tablename FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('groups', 'group_members');

-- Check RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('groups', 'group_members');

-- Test creating a group (should work)
-- INSERT INTO groups (owner_id, name, description)
-- VALUES (auth.uid(), 'Test Group', 'A test group');
