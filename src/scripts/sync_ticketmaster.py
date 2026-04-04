import argparse
import os
import re
from dotenv import load_dotenv
import requests
from supabase import create_client
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

# Load environment variables from .env
load_dotenv()

# Config from environment
TM_API_KEY = os.getenv("VITE_TICKETMASTER_API_KEY")
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") 

if not all([TM_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY]):
    raise ValueError("Missing required environment variables")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

DEFAULT_EVENT_TIMEZONE = "America/New_York"
DEFAULT_EVENT_DURATION_HOURS = 3
EVENT_DELETE_CHUNK_SIZE = 200
PAST_EVENT_RETENTION_DAYS = int(os.getenv("EVENT_PAST_RETENTION_DAYS", "2"))


def normalize_label(value: str | None):
    if not value:
        return ""

    normalized = value.lower()
    normalized = re.sub(r"\((?:new york|ny|nyc)\)", "", normalized)
    normalized = re.sub(r"\b(?:new york|nyc|ny)\b", "", normalized)
    normalized = re.sub(r"[^a-z0-9]+", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def has_usable_ticketmaster_image(images):
    if not images:
        return False

    for image in images:
        url = image.get("url", "")
        is_fallback = bool(image.get("fallback", False))
        width = image.get("width", 0) or 0
        if url and not is_fallback and width >= 500:
            return True

    return False

def extract_genres(event):
    classifications = event.get("classifications", [])
    if not classifications:
        return {"segment": "Other", "genre": "Other"}
    c = classifications[0]
    return {
        "segment": c.get("segment", {}).get("name", "Other"),
        "genre": c.get("genre", {}).get("name", "Other"),
        "subGenre": c.get("subGenre", {}).get("name"),
    }

def pick_hero_image(images):
    if not images:
        return ""

    valid_images = [
        image
        for image in images
        if image.get("url") and not bool(image.get("fallback", False)) and (image.get("width", 0) or 0) >= 500
    ]

    if not valid_images:
        return ""

    for ratio in ["16_9", "3_2"]:
        for img in valid_images:
            if img.get("ratio") == ratio and img.get("width", 0) > 500:
                return img.get("url", "")
    return valid_images[0].get("url", "")

def get_price(event):
    price_ranges = event.get("priceRanges", [])
    if not price_ranges:
        return None, "$$"
    min_price = price_ranges[0].get("min", 0)
    if min_price == 0:
        return "Free", "free"
    elif min_price < 30:
        return f"${min_price:.0f}+", "$"
    elif min_price < 80:
        return f"${min_price:.0f}+", "$$"
    else:
        return f"${min_price:.0f}+", "$$$"

def fetch_ticketmaster_events(city="New York", size=20, page=0):
    url = "https://app.ticketmaster.com/discovery/v2/events.json"
    params = {
        "apikey": TM_API_KEY,
        "city": city,
        "size": size,
        "page": page,
        "sort": "date,asc",
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    return data.get("_embedded", {}).get("events", [])


def parse_local_time(local_time: str | None):
    if not local_time or local_time == "TBA":
        return None

    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(local_time, fmt).time()
        except ValueError:
            continue
    return None


def compute_temporal_flags(local_date: str | None, local_time: str | None, timezone_name: str | None):
    if not local_date:
        return False, False

    tz_name = timezone_name or DEFAULT_EVENT_TIMEZONE
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo(DEFAULT_EVENT_TIMEZONE)

    try:
        event_date = datetime.strptime(local_date, "%Y-%m-%d").date()
    except ValueError:
        return False, False

    now = datetime.now(tz)
    is_tonight = event_date == now.date()

    parsed_time = parse_local_time(local_time)
    if not parsed_time:
        return False, is_tonight

    event_start = datetime.combine(event_date, parsed_time, tzinfo=tz)
    event_end = event_start + timedelta(hours=DEFAULT_EVENT_DURATION_HOURS)
    happening_now = event_start <= now <= event_end

    return happening_now, is_tonight

def transform_event(event):
    genres = extract_genres(event)
    venue_data = event.get("_embedded", {}).get("venues", [{}])[0]
    dates = event.get("dates", {}).get("start", {})
    event_timezone = dates.get("timezone") or venue_data.get("timezone") or DEFAULT_EVENT_TIMEZONE
    happening_now, is_tonight = compute_temporal_flags(
        dates.get("localDate"),
        dates.get("localTime"),
        event_timezone,
    )
    price_display, price_level = get_price(event)

    lat = venue_data.get("location", {}).get("latitude")
    lng = venue_data.get("location", {}).get("longitude")

    return {
        "external_id": event.get("id"),  # Store Ticketmaster ID here
        "name": event.get("name"),
        "hero_image": pick_hero_image(event.get("images", [])),
        "date": dates.get("localDate"),
        "time": dates.get("localTime", "TBA"),
        "venue": venue_data.get("name"),
        "neighborhood": venue_data.get("city", {}).get("name", "New York"),
        "latitude": float(lat) if lat else 40.7580,
        "longitude": float(lng) if lng else -73.9855,
        "segment": genres.get("segment"),
        "genre": genres.get("genre"),
        "ticket_url": event.get("url"),
        "price": price_display,
        "price_level": price_level,
        "description": event.get("info") or event.get("pleaseNote"),
        "tags": [genres.get("segment", "").lower(), genres.get("genre", "").lower()],
        "is_recommended": False,
        "is_trending": False,
        "happening_now": happening_now,
        "is_tonight": is_tonight,
        "source": "ticketmaster",
    }


def parse_event_date(value: str | None):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def should_keep_active_event(event_date: str | None):
    parsed_date = parse_event_date(event_date)
    if not parsed_date:
        return False

    today = datetime.now(ZoneInfo(DEFAULT_EVENT_TIMEZONE)).date()
    return parsed_date >= today


def fetch_all_rows(table_name: str, columns: str):
    rows = []
    offset = 0
    page_size = 1000

    while True:
        result = (
            supabase.table(table_name)
            .select(columns)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        page = result.data or []
        rows.extend(page)

        if len(page) < page_size:
            break
        offset += page_size

    return rows


def get_protected_event_ids():
    protected_ids = set()

    for table_name in ["saved_events", "memories", "event_views", "user_event_recommendations"]:
        rows = fetch_all_rows(table_name, "event_id")
        for row in rows:
            event_id = row.get("event_id")
            if event_id:
                protected_ids.add(event_id)

    return protected_ids


def prune_events_catalog(dry_run: bool = False):
    all_events = fetch_all_rows("events", "id,date,ticket_url")
    protected_ids = get_protected_event_ids()
    cutoff_date = datetime.now(ZoneInfo(DEFAULT_EVENT_TIMEZONE)).date() - timedelta(days=PAST_EVENT_RETENTION_DAYS)

    deletable_event_ids = []
    stale_count = 0
    missing_ticket_url_count = 0

    for event in all_events:
        event_id = event.get("id")
        if not event_id or event_id in protected_ids:
            continue

        event_date = parse_event_date(event.get("date"))
        missing_ticket_url = not (event.get("ticket_url") or "").strip()
        too_old = event_date is None or event_date < cutoff_date

        if missing_ticket_url:
            missing_ticket_url_count += 1
        if too_old:
            stale_count += 1

        if missing_ticket_url or too_old:
            deletable_event_ids.append(event_id)

    print(
        "Prune scan: "
        f"total={len(all_events)} protected={len(protected_ids)} "
        f"candidate_missing_ticket_url={missing_ticket_url_count} "
        f"candidate_stale={stale_count} "
        f"candidate_delete={len(deletable_event_ids)}"
    )

    if not deletable_event_ids:
        print("Prune complete: no deletable events found")
        return

    if dry_run:
        print("Prune dry-run: no rows deleted")
        return

    for i in range(0, len(deletable_event_ids), EVENT_DELETE_CHUNK_SIZE):
        chunk = deletable_event_ids[i : i + EVENT_DELETE_CHUNK_SIZE]
        supabase.table("events").delete().in_("id", chunk).execute()

    print(
        f"Prune complete: deleted {len(deletable_event_ids)} events "
        f"(protected refs kept: {len(protected_ids)})"
    )


def parse_args():
    parser = argparse.ArgumentParser(description="Sync and prune Ticketmaster events")
    parser.add_argument("--size", type=int, default=50, help="Ticketmaster page size for sync")
    parser.add_argument("--prune-only", action="store_true", help="Skip fetch/sync and only run prune")
    parser.add_argument("--skip-prune", action="store_true", help="Skip prune step after sync")
    parser.add_argument("--dry-run-prune", action="store_true", help="Run prune in dry-run mode")
    return parser.parse_args()

def deduplicate_events(events):
    """Remove duplicate events based on normalized title + date + normalized venue."""
    seen = set()
    unique = []
    
    for event in events:
        # Create a unique key based on name, date, and venue
        key = (
            normalize_label(event.get("name", "")),
            event.get("date"),
            normalize_label(event.get("venue", "")),
        )
        
        if key not in seen:
            seen.add(key)
            unique.append(event)
        else:
            print(f"Skipping duplicate: {event['name']} on {event['date']} at {event['venue']}")
    
    return unique

def sync_to_supabase(events):
    transformed = [transform_event(e) for e in events if has_usable_ticketmaster_image(e.get("images", []))]
    
    # Filter out any with missing required fields
    transformed = [
        e
        for e in transformed
        if (
            e["name"]
            and e["date"]
            and e["external_id"]
            and e.get("hero_image")
            and (e.get("ticket_url") or "").strip()
            and should_keep_active_event(e.get("date"))
        )
    ]
    
    # Deduplicate before inserting
    transformed = deduplicate_events(transformed)
    
    print(f"After deduplication: {len(transformed)} unique events")

    # Upsert - insert or update if external_id already exists
    result = supabase.table("events").upsert(
        transformed, 
        on_conflict="external_id"
    ).execute()
    
    print(f"Synced {len(transformed)} events to Supabase")
    return result

if __name__ == "__main__":
    args = parse_args()

    if args.prune_only:
        print("Running prune-only mode...")
        prune_events_catalog(dry_run=args.dry_run_prune)
        print("Done!")
        raise SystemExit(0)

    print("Fetching events from Ticketmaster...")
    events = fetch_ticketmaster_events(size=args.size)
    print(f"Found {len(events)} events")
    sync_to_supabase(events)

    if args.skip_prune:
        print("Skipping prune step (--skip-prune)")
    else:
        prune_events_catalog(dry_run=args.dry_run_prune)

    print("Done!")