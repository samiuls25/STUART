# STUART

STUART is a social event discovery and planning app for New York City.
It combines live event data, custom event data, context-aware recommendations, friend graph features, group invites, public and private hangouts, memories, badges, and notifications into one React + Supabase product.

## What STUART Does

STUART helps users:

- Discover events with search, filters, context-aware recommendations, and trending signals.
- Plan hangouts with friends or groups with smart planning and flexible options. 
- Join public hangouts from the Explore and Map surfaces.
- Save events and turn past events and hangouts into memories.
- Track social progress through badges.
- Manage profile privacy and notification preferences.

## Core Feature Inventory

This section reflects the current codebase behavior.

### Explore

- Fuzzy event search using Fuse.js.
- Multi-filter browsing:
  - Segment
  - Genre
  - Price
  - Time windows (Now, Tonight, This Weekend, This Week)
  - Distance (`Any distance` by default; optional caps from 1 mi through 100 mi, with geolocation fallback to NYC). When a cap is active on the Map page, a faint radius ring and “you are here” dot appear for real (non-fallback) locations.
- Segment and genre dropdowns are derived live from the loaded events with per-option counts; options that would yield zero matches are disabled, and any data-only values (e.g. "Rock", "Religious") are surfaced even when they're not in the canonical list.
- Mood-driven filtering through mood shortcuts.
- Weather-aware UI card (Open-Meteo) with recommendation text.
- Trending strip with ranked/fallback trending logic.
- Personalized recommendations section with reasons.
- Event grid with pagination controls:
  - Previous/Next
  - Jump to first/last
  - Direct page input
  - Scroll-to-top shortcut
- Save/unsave from cards.
- Suggest flow from cards into hangout invite creation.

### Event Detail Modal

- Full event context:
  - date/time/location
  - pricing
  - tags and source label
  - recommendation reasons and score
- Save/unsave actions.
- Ticket outbound links for ticketed events.
- Recommendation feedback controls (More like this / Not interested / Too expensive / Too far) with localStorage persistence and best-effort Supabase write.
- Suggest to group/friends flow:
  - loads groups and friends
  - allows mixed selection (groups + individuals)
  - creates a real hangout invite in backend
- Public hangout actions:
  - join hangout
  - leave hangout
  - open Hangouts page

### Hangouts

- Auth-gated hangout workspace.
- Create hangout wizard (3-step):
  - Activity details
  - Time and location
  - Invite friends/groups
- Scheduling modes:
  - fixed date/time
  - availability heatmap mode
- Public hangout toggle.
- Group-aware inviting and friend highlighting.
- Invite lifecycle and response actions:
  - yes
  - maybe
  - no
  - availability submission
- Organizer tools:
  - apply suggested best time
  - delete hangout
- Sectioned hangout feed:
  - Suggested
  - Pending
  - Confirmed
  - Declined invites
  - Hidden declined invites (restore supported)
  - Past hangouts
- Date range filters with quick presets.
- Local persistence for hidden declined invites.
- "Add Memory" flow from past hangouts.

### Availability and Finalization

- Interactive availability heatmap input.
- Submitted availability overlays.
- Best-slot scoring model that considers:
  - overlapping availability
  - preferred vs available votes
  - uninterrupted window length
  - weighted ranking
- Organizer can apply top-ranked slots directly.

### Groups

- Reusable group model for social planning.
- Create group with name/description/member list.
- Edit existing groups.
- Delete groups with confirmation.
- Group reuse in:
  - hangout invite creation
  - event suggestion flow
  - memory attendee prefill

Note: legacy `/groups` and `/groups/:id` routes now redirect to `/hangouts`.

### Friends

- Send friend requests by email lookup.
- Incoming request handling:
  - accept
  - reject
- Remove friends.
- Friend list search and basic filtering.
- Friend profile modal with:
  - badge summary
  - shared memories
  - social stats

### Saved Events

- Save and unsave event records tied to `saved_events`.
- Split views:
  - Upcoming
  - Past
- Add memory from past saved events.

### Profile

- Profile header with avatar, bio, counts.
- Edit profile modal (name, bio, avatar upload).
- Tabbed profile experience:
  - Overview
  - Badges
  - Memories
- Badges:
  - computed from activity signals
  - persisted to Supabase
  - unlocked vs locked states
  - level and progress rendering
- Memories:
  - timeline mode grouped by month/year
  - gallery mode masonry layout
  - memory usage monitoring warnings
- Quick links to Saved, Friends, Hangouts.
- Sign out action.

### Memories

- Create memories with metadata:
  - title
  - description
  - location
  - memory date
  - optional event/hangout linkage
- Multi-photo upload with client-side compression.
- Memory attendees:
  - add attendee
  - remove attendee (owner protected)
- Photo management:
  - upload
  - delete selected
  - reorder left/right
  - hero image updates based on order
- Memory deletion with storage cleanup.
- Schema fallback behavior if `memory_photos` is unavailable.

### Notifications

- Notification feed for current user.
- Unread badge and count in navbar.
- Realtime updates via Supabase channels.
- Notification actions:
  - mark read
  - mark all read
  - delete single
  - clear all
- Type routing support (friends/hangouts links).
- Preference-aware creation (honors recipient settings).

### Map

- Split-screen map experience:
  - left list with cards
  - right OpenStreetMap surface rendered via Leaflet (no API key required)
- Marker rendering from event coordinates with marker clustering (`react-leaflet-cluster`); densely packed pins collapse into a single themed bubble that splits on zoom-in. Filters still work transparently — the cluster group is fully reactive to its child markers.
- Marker hover/selection with tooltip previews.
- Full filter parity with Explore (segment, genre, price, time, distance) in map context.
- Recenter button uses browser geolocation when available (falls back to NYC center).
- Event detail modal integration from map/list clicks.

### Settings

- Multi-section settings panel:
  - Profile
  - Privacy
  - Notifications
- Profile settings:
  - avatar upload
  - display name
  - bio
  - read-only email
- Privacy settings:
  - profile visibility (public/friends/private)
  - show badges
  - show memories
  - show upcoming hangouts
- Notification preferences:
  - hangout invites
  - friend requests
  - event reminders
  - friend activity
- Theme toggle (dark mode class + localStorage persistence).
- Account deletion flow:
  - RPC attempts first
  - client-side cleanup fallback
  - sign-out and redirect after completion

### Authentication

- Email/password sign up.
- Email/password sign in.
- Session-based auth state provider.
- Shared auth modal used across pages.

## Data and Intelligence Layer

### Event Feed Assembly

The event feed loader merges and post-processes multiple sources:

- Base events from Supabase `events`.
- Personalized recommendations from `user_event_recommendations` when user is signed in.
- Public hangouts transformed into event-like cards.
- De-duplication and event-time consolidation.
- Placeholder image filtering to avoid repeated low-value stock images.
- Recommendation fallback when personalized rows are absent.

### Event Intelligence Tracking

- Event views are tracked in `event_views` for authenticated users.
- Recommendation and trending fields are used on cards/modals.

### Badge Computation

Badges are computed from signals like:

- saved and viewed event profiles
- hangout participation and hosting
- social breadth and activity variety
- time-of-day and activity-type behavior

Computed results are synced to Supabase `badges` with metadata and level/progress.

### Recommendation Feedback

When users react to a recommended event with one of the four feedback buttons
("More like this", "Not interested", "Too expensive", "Too far") the response is:

- Saved to `localStorage` under `stuart.recommendationFeedback.v1` for instant, client-side suppression of repeats.
- Best-effort persisted to `public.event_recommendation_feedback` (if the table exists). Missing-table or RLS errors are tolerated silently.
- Consumed by `recompute_event_intelligence.py`, which down-weights events sharing the same price level / neighborhood as disliked anchors, suppresses "not interested" events outright, and boosts events that share a segment / genre / tag with "more like this" anchors.

The "More like this" / "Not interested" quick actions appear only on Explore grid cards and Map list rows that are **trending or recommended**, so casual browsing stays visually quiet. The full four-button feedback panel inside every **event detail modal** remains available for any event so richer signals ("Too expensive", "Too far") are still easy to capture after someone opens details.

### Geolocation

`useUserLocation()` (in `src/hooks/useUserLocation.ts`) wraps a single mount-time call to `navigator.geolocation.getCurrentPosition`. On success the user's real coordinates power the distance filter on the Explore and Map pages. On denial / unavailability it falls back to NYC (40.7128, -74.006) and flips a `usingFallback` flag, which renders a `LocationBanner` above the filter bar explaining the situation and offering a "Use my location" button to re-prompt. The Ticketmaster sync script remains NYC-scoped, so users outside NYC who grant location will see distances correctly computed but very few events within range.

## Automation and Scripts

### NPM Scripts

- `npm run dev` - run Vite dev server.
- `npm run build` - production build.
- `npm run build:dev` - development-mode build.
- `npm run lint` - ESLint.
- `npm run preview` - preview built app.
- `npm run events:sync` - sync Ticketmaster events then recompute intelligence.
- `npm run events:intelligence` - full intelligence recompute.
- `npm run events:intelligence:incremental` - incremental intelligence recompute.
- `npm run events:prune:dry-run` - prune simulation only.
- `npm run events:prune` - prune stale/unreferenced events.

### Python Scripts

- `src/scripts/sync_ticketmaster.py`
  - fetches Ticketmaster pages
  - transforms/upserts events
  - deduplicates
  - prunes stale and unreferenced events
- `src/scripts/recompute_event_intelligence.py`
  - refreshes temporal flags (`happening_now`, `is_tonight`)
  - computes trending rankings
  - computes user recommendations
  - supports full and incremental modes

### GitHub Action

Workflow: `.github/workflows/sync-events.yml`

- Daily cron run (for now).
- Manual dispatch supported.
- Runs:
  - Ticketmaster sync
  - event intelligence recompute

## Tech Stack

- Frontend: React 18, TypeScript, Vite.
- Routing: React Router v6 (lazy-loaded route bundles via `React.lazy`).
- UI: Tailwind CSS, shadcn-style Radix primitives, lucide icons, framer-motion.
- Data Fetching: Supabase JS, TanStack Query (provider present).
- Search: Fuse.js.
- Date utilities: date-fns.
- Maps: Leaflet + OpenStreetMap tiles via `react-leaflet` (no API key, no billing).
- Backend services: Supabase Auth, Postgres, Storage, Realtime, RLS.
- Data jobs: Python 3.11 scripts with Supabase service-key access.

## Project Structure

```text
src/
  app/                  # App entry and route wiring
  pages/                # Top-level routed screens
  components/           # Feature and UI components
  data/                 # Types, constants, event feed adapter
  hooks/                # App hooks (toast, mobile, notifications)
  lib/                  # Supabase-backed domain services
  scripts/              # Python sync/intelligence jobs
  styles/               # Tailwind + design tokens
docs/
  db/                   #Schema/RLS snapshots
.github/workflows/
  sync-events.yml       # Scheduled event refresh pipeline
```

## Prerequisites

- Node.js 18+ (recommended: Node 20+)
- npm 9+
- Python 3.11
- A Supabase project
- Ticketmaster API key (for sync scripts)

## Environment Variables

Vite inlines any `VITE_*` variable that is set when `npm run build` runs. The same variable can come from a local `.env`, a GitHub Actions secret, or a Netlify env var - the code only reads `import.meta.env.VITE_*`, so the source is interchangeable.

Create a `.env` file in the project root for local development.

Required for frontend (must be set wherever the build runs):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The map page uses OpenStreetMap tiles via Leaflet, so no map provider key is required.

Required for Python scripts:

- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `VITE_TICKETMASTER_API_KEY`

Optional:

- `VITE_MEMORY_PHOTOS_BUCKET` (default: `memory-photos`)
- `VITE_AVATAR_BUCKET` (fallback to `memory-photos` or `avatars`)
- `VITE_MEMORY_USER_SOFT_CAP` (default: 120)
- `VITE_MEMORY_PHOTO_SOFT_CAP` (default: 600)
- `VITE_MEMORY_SOFT_CAP_WARNING_RATIO` (default: 0.8)
- `EVENT_PAST_RETENTION_DAYS` (default: 2)
- `TICKETMASTER_WINDOW_DAYS` (default: 45)
- `TICKETMASTER_MAX_PAGES` (default: 6)

Example:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
VITE_TICKETMASTER_API_KEY=your-ticketmaster-key

# Optional
VITE_MEMORY_PHOTOS_BUCKET=memory-photos
VITE_AVATAR_BUCKET=avatars
VITE_MEMORY_USER_SOFT_CAP=120
VITE_MEMORY_PHOTO_SOFT_CAP=600
VITE_MEMORY_SOFT_CAP_WARNING_RATIO=0.8
EVENT_PAST_RETENTION_DAYS=2
TICKETMASTER_WINDOW_DAYS=45
TICKETMASTER_MAX_PAGES=6
```

## Local Setup

1. Install JS dependencies:

```bash
npm install
```

2. Install Python dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. Configure `.env` values.

4. Initialize/verify DB schema and policies (see next section).

5. Run app:

```bash
npm run dev
```

## Database Setup and Snapshots

Reference docs are under `docs/db/`.

Snapshot references:

- Schema snapshot: `docs/db/supabase-schema-snapshot.json`
- RLS snapshot: `docs/db/supabase-rls-snapshot.json`

These snapshots document current table shape and policy state for the app.

## Event Operations

Manual refresh:

```bash
npm run events:sync
```

Only recompute intelligence:

```bash
npm run events:intelligence
npm run events:intelligence:incremental
```

Prune checks:

```bash
npm run events:prune:dry-run
npm run events:prune
```

## Known Constraints and Notes

- Save behavior is intentionally event-table scoped.
  - Public hangouts are discoverable but are not saved as ticketed events.
  - This follows the `saved_events.event_id -> events.id` relationship.
- Legacy group pages exist in code, but routes are redirected to Hangouts.
- Recommendation feedback controls persist locally via `localStorage` and best-effort to the `event_recommendation_feedback` table; missing-table errors are tolerated. The recommender script reads this table when present and adjusts scores accordingly.
- Explore and Map browse feeds hide events whose calendar date is strictly before today (local timezone); undated rows are kept. Saved and other pages are not filtered this way.
- Some behaviors include compatibility fallbacks for partially migrated schemas (for example, optional `is_public` support and memory table fallbacks).

## Current Route Map

- `/` - Explore
- `/map` - Map
- `/hangouts` - Hangouts
- `/friends` - Friends
- `/saved` - Saved Events
- `/profile` - Profile
- `/notifications` - Notifications
- `/settings` - Settings
- `/groups` -> redirected to `/hangouts`
- `/groups/:id` -> redirected to `/hangouts`

## Deployment (Netlify)

The app is a Vite SPA, so deployment is just publishing the `dist/` directory. Two flows are supported:

### Option A - Netlify builds from the GitHub repo (not chosen)

1. Link the GitHub repo in Netlify. `netlify.toml` already defines:
   - `command = "npm run build"`
   - `publish = "dist"`
   - SPA fallback (`/* → /index.html 200`)
   - Cache headers and basic security headers
2. Under **Site settings → Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Trigger a deploy. Netlify will build with those values inlined.

GitHub repository secrets (used by the daily sync workflow) are scoped to GitHub Actions runners. They are **not** automatically forwarded to Netlify; any `VITE_*` value Netlify needs at build time must also be saved in Netlify's environment variables panel.

### Option B - Manual `dist/` upload (drag-and-drop) (chosen)

1. Ensure the local `.env` contains the two frontend `VITE_*` variables.
2. Run `npm run build`. Vite inlines the values into the bundle.
3. Drag the resulting `dist/` folder into Netlify's deploy UI.
4. Netlify picks up `public/_redirects` (already copied into `dist/`) for SPA routing.

The Supabase anon key is published in the bundle by design - Row-Level Security policies are what protect data, not key secrecy. The map provider (OpenStreetMap via Leaflet) requires no API key at all.

## Troubleshooting

- "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY": ensure frontend env vars are set.
- Empty hangouts/memories/recommendations with setup errors: look at schema snapshots in `docs/db/` and verify RLS policies.
- Map tiles not rendering: confirm the browser has network access to `tile.openstreetmap.org`; corporate proxies sometimes block it.
- Direct page refresh (e.g. `/profile`) returns 404 on Netlify: confirm `public/_redirects` (or `netlify.toml`'s redirect rule) is in place.
- Sync/intelligence scripts failing: verify Python env and service-role credentials.
