# Safe Migration Plan: Merging tony-profile-settings with backend/core

## Current State (backend/core)
✅ **Working Features:**
- Authentication with Supabase (sign up, sign in, sign out)
- Profiles table with trigger (auto-creates on sign up)
- Saved events feature
- Friends system (send/accept/reject requests)
- Ticketmaster API sync with GitHub Actions

✅ **Current Schema:**
```
profiles: id, email, name, avatar_url, bio(?), created_at, updated_at
friendships: user_id, friend_id, status, created_at
saved_events: user_id, event_id, created_at
events: (with external_id, source, price_level, tags, etc.)
```

## Issues in tony-profile-settings Branch
❌ **Problems Found:**
1. Uses mock `friends` data instead of Supabase (Settings.tsx line 36, 331)
2. Queries non-existent `badges` and `memories` tables (Profile.tsx lines 57, 69)
3. Wrong column name: uses `full_name` instead of `name` (Settings.tsx line 239)
4. Tries to save to non-existent privacy columns (Settings.tsx lines 195-200)

## Migration Steps (IN ORDER)

### Step 1: Run SQL Migration ⏳
**File:** `migrations/002_add_profile_settings_badges_memories.sql`

**What it does:**
- ✅ Adds 4 privacy columns to profiles (all have defaults)
- ✅ Creates `badges` table with RLS policies
- ✅ Creates `memories` table with RLS policies  
- ✅ Creates `blocked_users` table (optional)
- ✅ Won't break existing auth trigger (all columns optional)

**Safety:**
- All new columns have DEFAULT values
- No breaking changes to existing data
- Auth trigger still works the same
- RLS policies prevent unauthorized access

**Run in Supabase SQL Editor**, then verify:
```sql
-- Check new columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles';

-- Check new tables
SELECT tablename FROM pg_tables 
WHERE tablename IN ('badges', 'memories', 'blocked_users');
```

### Step 2: Fix tony-profile-settings Code ⏳
**Changes needed:**

#### A. Settings.tsx
- ❌ Remove `import { friends } from "../data/friends"` (line 36)
- ❌ Change `full_name` to `name` (line 239)
- ✅ Keep privacy settings code (now columns exist)
- ⏳ Add Supabase query for blocked users (replace mock data)

#### B. Profile.tsx  
- ⏳ Keep badges query (table now exists)
- ⏳ Keep memories query (table now exists)
- ⏳ Add error handling for empty results

#### C. EditProfileModal.tsx
- ✅ Already correct (uses `name` not `full_name`)

### Step 3: Test Auth Flow Still Works ⏳
**Critical test:**
1. Sign up new user
2. Verify profile auto-created with default privacy settings
3. Verify all privacy columns have values
4. Try updating profile settings
5. Test friends flow still works

### Step 4: Merge Branches ⏳
```bash
# On backend/core
git pull origin backend/core

# Merge tony's branch
git merge tony-profile-settings

# Resolve conflicts (if any)
# Run tests
git push origin backend/core
```

## Risk Assessment

### 🟢 Low Risk (Safe)
- Adding columns with defaults to profiles
- Creating new tables (badges, memories)
- RLS policies for new tables

### 🟡 Medium Risk (Test Carefully)
- Changing `full_name` to `name` (could break if Tony's code relies on it)
- Removing mock data imports (need to replace with Supabase queries)

### 🔴 High Risk (DON'T DO YET)
- Modifying auth trigger
- Changing primary keys
- Removing existing columns

## Rollback Plan

If something breaks:
```sql
-- Remove new columns
ALTER TABLE profiles 
  DROP COLUMN IF EXISTS profile_visibility,
  DROP COLUMN IF EXISTS show_badges,
  DROP COLUMN IF EXISTS show_memories,
  DROP COLUMN IF EXISTS show_upcoming_hangouts;

-- Drop new tables
DROP TABLE IF EXISTS blocked_users;
DROP TABLE IF EXISTS memories;
DROP TABLE IF EXISTS badges;
```

## Post-Merge Tasks

1. Update documentation with new schema
2. Add seed data for badge types
3. Implement badge earning logic
4. Add photo upload to Supabase Storage for memories
5. Test privacy settings UI thoroughly

## Timeline Estimate
- SQL Migration: 5 minutes
- Code fixes: 30-45 minutes
- Testing: 30 minutes
- **Total: ~1.5 hours**
