import os
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import argparse

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

DEFAULT_EVENT_TIMEZONE = "America/New_York"
TRENDING_TOP_N = 20
RECOMMENDATION_MIN_SCORE = 20
RECOMMENDATION_TOP_N = 25
COLD_START_MIN_SCORE = 8
INCREMENTAL_DEFAULT_WINDOW_MINUTES = int(os.getenv("EVENT_INTELLIGENCE_INCREMENTAL_WINDOW_MINUTES", "20"))


def fetch_all(table: str, columns: str = "*"):
    all_rows = []
    offset = 0
    page_size = 1000

    while True:
        result = (
            supabase.table(table)
            .select(columns)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        rows = result.data or []
        all_rows.extend(rows)

        if len(rows) < page_size:
            break
        offset += page_size

    return all_rows


def fetch_recent_rows(table: str, columns: str, timestamp_column: str, cutoff_iso: str):
    all_rows = []
    offset = 0
    page_size = 1000

    while True:
        result = (
            supabase.table(table)
            .select(columns)
            .gte(timestamp_column, cutoff_iso)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        rows = result.data or []
        all_rows.extend(rows)

        if len(rows) < page_size:
            break
        offset += page_size

    return all_rows


def parse_timestamp(value: str | None):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def parse_event_date(value: str | None):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def parse_event_time(value: str | None):
    if not value or value == "TBA":
        return None
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(value, fmt).time()
        except ValueError:
            continue
    return None


def compute_temporal_flags(event_date: str | None, event_time: str | None):
    if not event_date:
        return False, False

    tz = ZoneInfo(DEFAULT_EVENT_TIMEZONE)
    now = datetime.now(tz)

    try:
        date_value = datetime.strptime(event_date, "%Y-%m-%d").date()
    except ValueError:
        return False, False

    is_tonight = date_value == now.date()
    parsed_time = parse_event_time(event_time)

    if not parsed_time:
        return False, is_tonight

    start_dt = datetime.combine(date_value, parsed_time, tzinfo=tz)
    end_dt = start_dt + timedelta(hours=3)
    happening_now = start_dt <= now <= end_dt

    return happening_now, is_tonight


def refresh_event_time_flags(events):
    updates = 0
    for event in events:
        happening_now, is_tonight = compute_temporal_flags(event.get("date"), event.get("time"))

        if (
            event.get("happening_now") == happening_now
            and event.get("is_tonight") == is_tonight
        ):
            continue

        (
            supabase.table("events")
            .update({"happening_now": happening_now, "is_tonight": is_tonight})
            .eq("id", event["id"])
            .execute()
        )
        updates += 1

    print(f"Refreshed time flags for {updates} event(s)")


def compute_trending(events, saved_events, event_views):
    now_utc = datetime.utcnow()
    week_ago = now_utc - timedelta(days=7)
    day_ago = now_utc - timedelta(days=1)
    today_local = datetime.now(ZoneInfo(DEFAULT_EVENT_TIMEZONE)).date()

    unique_savers = defaultdict(set)
    recent_saves = defaultdict(int)

    for row in saved_events:
        event_id = row.get("event_id")
        user_id = row.get("user_id")
        if not event_id or not user_id:
            continue

        unique_savers[event_id].add(user_id)

        saved_at = parse_timestamp(row.get("saved_at"))
        if saved_at and saved_at.replace(tzinfo=None) >= week_ago:
            recent_saves[event_id] += 1

    unique_viewers = defaultdict(set)
    recent_views = defaultdict(int)

    for row in event_views:
        event_id = row.get("event_id")
        user_id = row.get("user_id")
        if not event_id or not user_id:
            continue

        unique_viewers[event_id].add(user_id)

        viewed_at = parse_timestamp(row.get("viewed_at"))
        if viewed_at and viewed_at.replace(tzinfo=None) >= day_ago:
            recent_views[event_id] += 1

    scored = []
    for event in events:
        event_id = event["id"]
        event_date = parse_event_date(event.get("date"))
        if event_date and event_date < today_local and not event.get("happening_now"):
            continue

        save_score = len(unique_savers[event_id]) * 8 + recent_saves[event_id] * 5
        view_score = len(unique_viewers[event_id]) * 2 + recent_views[event_id] * 3
        urgency_bonus = 10 if event.get("happening_now") else (4 if event.get("is_tonight") else 0)

        score = save_score + view_score + urgency_bonus
        if score > 0:
            scored.append((event_id, score))

    scored.sort(key=lambda item: item[1], reverse=True)
    ranked = scored[:TRENDING_TOP_N]

    # Reset all trending values before applying top ranks.
    supabase.table("events").update({"is_trending": False, "trending_rank": 0}).gte("trending_rank", 0).execute()

    for rank, (event_id, _) in enumerate(ranked, start=1):
        (
            supabase.table("events")
            .update({"is_trending": True, "trending_rank": rank})
            .eq("id", event_id)
            .execute()
        )

    print(f"Updated trending ranks for {len(ranked)} event(s)")


def compute_trending_incremental(events, saved_events, event_views, candidate_event_ids):
    if not candidate_event_ids:
        print("Incremental trending: no candidate events")
        return

    now_utc = datetime.utcnow()
    week_ago = now_utc - timedelta(days=7)
    day_ago = now_utc - timedelta(days=1)
    today_local = datetime.now(ZoneInfo(DEFAULT_EVENT_TIMEZONE)).date()

    unique_savers = defaultdict(set)
    recent_saves = defaultdict(int)

    for row in saved_events:
        event_id = row.get("event_id")
        user_id = row.get("user_id")
        if not event_id or not user_id:
            continue

        unique_savers[event_id].add(user_id)

        saved_at = parse_timestamp(row.get("saved_at"))
        if saved_at and saved_at.replace(tzinfo=None) >= week_ago:
            recent_saves[event_id] += 1

    unique_viewers = defaultdict(set)
    recent_views = defaultdict(int)

    for row in event_views:
        event_id = row.get("event_id")
        user_id = row.get("user_id")
        if not event_id or not user_id:
            continue

        unique_viewers[event_id].add(user_id)

        viewed_at = parse_timestamp(row.get("viewed_at"))
        if viewed_at and viewed_at.replace(tzinfo=None) >= day_ago:
            recent_views[event_id] += 1

    by_id = {event["id"]: event for event in events}
    scored = []

    for event_id in candidate_event_ids:
        event = by_id.get(event_id)
        if not event:
            continue

        event_date = parse_event_date(event.get("date"))
        if event_date and event_date < today_local and not event.get("happening_now"):
            continue

        save_score = len(unique_savers[event_id]) * 8 + recent_saves[event_id] * 5
        view_score = len(unique_viewers[event_id]) * 2 + recent_views[event_id] * 3
        urgency_bonus = 10 if event.get("happening_now") else (4 if event.get("is_tonight") else 0)
        score = save_score + view_score + urgency_bonus

        if score > 0:
            scored.append((event_id, score))

    scored.sort(key=lambda item: item[1], reverse=True)
    ranked = scored[:TRENDING_TOP_N]

    # Reset only candidate rows (including previously trending rows) to limit writes.
    for event_id in candidate_event_ids:
        (
            supabase.table("events")
            .update({"is_trending": False, "trending_rank": 0})
            .eq("id", event_id)
            .execute()
        )

    for rank, (event_id, _) in enumerate(ranked, start=1):
        (
            supabase.table("events")
            .update({"is_trending": True, "trending_rank": rank})
            .eq("id", event_id)
            .execute()
        )

    print(
        "Incremental trending updated "
        f"{len(ranked)} ranked event(s) from candidate pool {len(candidate_event_ids)}"
    )


def build_friend_graph(friendships):
    graph = defaultdict(set)

    for row in friendships:
        if row.get("status") != "accepted":
            continue

        user_id = row.get("user_id")
        friend_id = row.get("friend_id")
        if not user_id or not friend_id:
            continue

        graph[user_id].add(friend_id)
        graph[friend_id].add(user_id)

    return graph


def compute_recommendations(events, saved_events, friendships):
    today = datetime.now(ZoneInfo(DEFAULT_EVENT_TIMEZONE)).date()

    events_by_id = {event["id"]: event for event in events}
    upcoming_events = []

    for event in events:
        event_date = event.get("date")
        try:
            if event_date and datetime.strptime(event_date, "%Y-%m-%d").date() >= today:
                upcoming_events.append(event)
        except ValueError:
            continue

    saved_by_user = defaultdict(set)
    saved_rows_by_user = defaultdict(list)

    for row in saved_events:
        user_id = row.get("user_id")
        event_id = row.get("event_id")
        if not user_id or not event_id:
            continue
        saved_by_user[user_id].add(event_id)
        saved_rows_by_user[user_id].append(row)

    friend_graph = build_friend_graph(friendships)

    users = set(saved_by_user.keys()) | set(friend_graph.keys())

    upsert_rows = []

    for user_id in users:
        user_saved_ids = saved_by_user[user_id]
        segment_counts = Counter()
        genre_counts = Counter()
        tag_counts = Counter()

        for event_id in user_saved_ids:
            event = events_by_id.get(event_id)
            if not event:
                continue
            if event.get("segment"):
                segment_counts[event["segment"]] += 1
            if event.get("genre"):
                genre_counts[event["genre"]] += 1
            for tag in event.get("tags") or []:
                tag_counts[tag] += 1

        total_saved = max(1, len(user_saved_ids))

        friend_saved_counts = Counter()
        for friend_id in friend_graph.get(user_id, set()):
            for event_id in saved_by_user.get(friend_id, set()):
                friend_saved_counts[event_id] += 1

        # Users with little history should still receive recommendations from
        # momentum/trending signals instead of getting an empty state.
        min_score_for_user = (
            COLD_START_MIN_SCORE if len(user_saved_ids) <= 1 else RECOMMENDATION_MIN_SCORE
        )

        user_recs = []

        for event in upcoming_events:
            event_id = event["id"]
            if event_id in user_saved_ids:
                continue

            score = 0
            reasons = []

            segment = event.get("segment")
            if segment and segment_counts[segment] > 0:
                segment_score = int((segment_counts[segment] / total_saved) * 30)
                score += segment_score
                reasons.append(f"You often save {segment} events")

            genre = event.get("genre")
            if genre and genre_counts[genre] > 0:
                genre_score = int((genre_counts[genre] / total_saved) * 35)
                score += genre_score
                reasons.append(f"Matches your interest in {genre}")

            tags = event.get("tags") or []
            overlap = sum(1 for tag in tags if tag_counts[tag] > 0)
            if overlap > 0:
                score += min(20, overlap * 6)
                reasons.append("Similar vibe to your saved events")

            friend_count = friend_saved_counts[event_id]
            if friend_count > 0:
                score += min(30, friend_count * 10)
                reasons.append(f"{friend_count} friend{'s' if friend_count != 1 else ''} saved this")

            rank = event.get("trending_rank") or 0
            if rank > 0:
                score += max(0, 12 - rank)
                reasons.append("Trending in your area")

            if event.get("is_tonight"):
                score += 5
                reasons.append("Happening tonight")
            if event.get("happening_now"):
                score += 8
                reasons.append("Happening right now")

            if score >= min_score_for_user:
                user_recs.append((event_id, score, reasons[:3]))

        user_recs.sort(key=lambda item: item[1], reverse=True)
        user_recs = user_recs[:RECOMMENDATION_TOP_N]

        for event_id, score, reasons in user_recs:
            upsert_rows.append(
                {
                    "user_id": user_id,
                    "event_id": event_id,
                    "recommendation_score": score,
                    "recommendation_reasons": reasons,
                    "computed_at": datetime.utcnow().isoformat(),
                }
            )

    # Replace recommendations in one pass.
    supabase.table("user_event_recommendations").delete().gte("recommendation_score", 0).execute()

    if upsert_rows:
        chunk = 500
        for i in range(0, len(upsert_rows), chunk):
            batch = upsert_rows[i : i + chunk]
            (
                supabase.table("user_event_recommendations")
                .upsert(batch, on_conflict="user_id,event_id")
                .execute()
            )

    print(f"Upserted {len(upsert_rows)} personalized recommendation row(s)")


def compute_recommendations_for_users(events, saved_events, friendships, target_users):
    if not target_users:
        print("Incremental recommendations: no target users")
        return

    today = datetime.now(ZoneInfo(DEFAULT_EVENT_TIMEZONE)).date()

    events_by_id = {event["id"]: event for event in events}
    upcoming_events = []

    for event in events:
        event_date = event.get("date")
        try:
            if event_date and datetime.strptime(event_date, "%Y-%m-%d").date() >= today:
                upcoming_events.append(event)
        except ValueError:
            continue

    saved_by_user = defaultdict(set)

    for row in saved_events:
        user_id = row.get("user_id")
        event_id = row.get("event_id")
        if not user_id or not event_id:
            continue
        saved_by_user[user_id].add(event_id)

    friend_graph = build_friend_graph(friendships)

    upsert_rows = []

    for user_id in target_users:
        user_saved_ids = saved_by_user[user_id]
        segment_counts = Counter()
        genre_counts = Counter()
        tag_counts = Counter()

        for event_id in user_saved_ids:
            event = events_by_id.get(event_id)
            if not event:
                continue
            if event.get("segment"):
                segment_counts[event["segment"]] += 1
            if event.get("genre"):
                genre_counts[event["genre"]] += 1
            for tag in event.get("tags") or []:
                tag_counts[tag] += 1

        total_saved = max(1, len(user_saved_ids))

        friend_saved_counts = Counter()
        for friend_id in friend_graph.get(user_id, set()):
            for event_id in saved_by_user.get(friend_id, set()):
                friend_saved_counts[event_id] += 1

        min_score_for_user = (
            COLD_START_MIN_SCORE if len(user_saved_ids) <= 1 else RECOMMENDATION_MIN_SCORE
        )

        user_recs = []

        for event in upcoming_events:
            event_id = event["id"]
            if event_id in user_saved_ids:
                continue

            score = 0
            reasons = []

            segment = event.get("segment")
            if segment and segment_counts[segment] > 0:
                segment_score = int((segment_counts[segment] / total_saved) * 30)
                score += segment_score
                reasons.append(f"You often save {segment} events")

            genre = event.get("genre")
            if genre and genre_counts[genre] > 0:
                genre_score = int((genre_counts[genre] / total_saved) * 35)
                score += genre_score
                reasons.append(f"Matches your interest in {genre}")

            tags = event.get("tags") or []
            overlap = sum(1 for tag in tags if tag_counts[tag] > 0)
            if overlap > 0:
                score += min(20, overlap * 6)
                reasons.append("Similar vibe to your saved events")

            friend_count = friend_saved_counts[event_id]
            if friend_count > 0:
                score += min(30, friend_count * 10)
                reasons.append(f"{friend_count} friend{'s' if friend_count != 1 else ''} saved this")

            rank = event.get("trending_rank") or 0
            if rank > 0:
                score += max(0, 12 - rank)
                reasons.append("Trending in your area")

            if event.get("is_tonight"):
                score += 5
                reasons.append("Happening tonight")
            if event.get("happening_now"):
                score += 8
                reasons.append("Happening right now")

            if score >= min_score_for_user:
                user_recs.append((event_id, score, reasons[:3]))

        user_recs.sort(key=lambda item: item[1], reverse=True)
        user_recs = user_recs[:RECOMMENDATION_TOP_N]

        for event_id, score, reasons in user_recs:
            upsert_rows.append(
                {
                    "user_id": user_id,
                    "event_id": event_id,
                    "recommendation_score": score,
                    "recommendation_reasons": reasons,
                    "computed_at": datetime.utcnow().isoformat(),
                }
            )

    # Replace only targeted users to minimize write volume.
    for user_id in target_users:
        (
            supabase.table("user_event_recommendations")
            .delete()
            .eq("user_id", user_id)
            .execute()
        )

    if upsert_rows:
        chunk = 500
        for i in range(0, len(upsert_rows), chunk):
            batch = upsert_rows[i : i + chunk]
            (
                supabase.table("user_event_recommendations")
                .upsert(batch, on_conflict="user_id,event_id")
                .execute()
            )

    print(
        "Incremental recommendations refreshed for "
        f"{len(target_users)} user(s); upserted {len(upsert_rows)} row(s)"
    )


def parse_args():
    parser = argparse.ArgumentParser(description="Recompute event intelligence")
    parser.add_argument(
        "--mode",
        choices=["full", "incremental"],
        default="full",
        help="Run full refresh or incremental refresh",
    )
    parser.add_argument(
        "--window-minutes",
        type=int,
        default=INCREMENTAL_DEFAULT_WINDOW_MINUTES,
        help="Recent activity window for incremental mode",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    events = fetch_all(
        "events",
        "id,date,time,segment,genre,tags,is_tonight,happening_now,is_trending,trending_rank",
    )
    saved_events = fetch_all("saved_events", "user_id,event_id,saved_at")
    event_views = fetch_all("event_views", "user_id,event_id,viewed_at")
    friendships = fetch_all("friendships", "user_id,friend_id,status")

    print(
        f"Loaded {len(events)} events, {len(saved_events)} saves, {len(event_views)} views, {len(friendships)} friendships"
    )

    refresh_event_time_flags(events)

    # Re-read events after time flag refresh so trending/recommendations use latest flags.
    events = fetch_all(
        "events",
        "id,date,time,segment,genre,tags,is_tonight,happening_now,is_trending,trending_rank",
    )

    if args.mode == "full":
        compute_trending(events, saved_events, event_views)
    else:
        cutoff = datetime.utcnow() - timedelta(minutes=max(1, args.window_minutes))
        cutoff_iso = cutoff.isoformat()

        recent_saves = fetch_recent_rows("saved_events", "user_id,event_id,saved_at", "saved_at", cutoff_iso)
        recent_views = fetch_recent_rows("event_views", "user_id,event_id,viewed_at", "viewed_at", cutoff_iso)

        current_trending_ids = {
            row.get("id")
            for row in events
            if row.get("is_trending") and row.get("id")
        }
        candidate_event_ids = {
            row.get("event_id") for row in recent_saves if row.get("event_id")
        } | {
            row.get("event_id") for row in recent_views if row.get("event_id")
        } | current_trending_ids

        compute_trending_incremental(events, saved_events, event_views, candidate_event_ids)

    # Re-read events after trending refresh so recommendation can use updated rank.
    events = fetch_all(
        "events",
        "id,date,time,segment,genre,tags,is_tonight,happening_now,is_trending,trending_rank",
    )

    if args.mode == "full":
        compute_recommendations(events, saved_events, friendships)
    else:
        cutoff = datetime.utcnow() - timedelta(minutes=max(1, args.window_minutes))
        cutoff_iso = cutoff.isoformat()
        recent_saves = fetch_recent_rows("saved_events", "user_id,event_id,saved_at", "saved_at", cutoff_iso)

        seed_users = {row.get("user_id") for row in recent_saves if row.get("user_id")}
        target_users = set(seed_users)

        # Expand to friends because recommendation reasons include friend saved activity.
        for row in friendships:
            if row.get("status") != "accepted":
                continue
            user_id = row.get("user_id")
            friend_id = row.get("friend_id")
            if user_id in seed_users and friend_id:
                target_users.add(friend_id)
            if friend_id in seed_users and user_id:
                target_users.add(user_id)

        compute_recommendations_for_users(events, saved_events, friendships, target_users)

    print("Event intelligence recompute complete.")


if __name__ == "__main__":
    main()
