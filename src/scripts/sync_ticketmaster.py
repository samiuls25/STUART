import os
from dotenv import load_dotenv
import requests
from supabase import create_client
from datetime import datetime

# Load environment variables from .env
load_dotenv()

# Config from environment
TM_API_KEY = os.getenv("VITE_TICKETMASTER_API_KEY")
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") 

if not all([TM_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY]):
    raise ValueError("Missing required environment variables")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

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
    for ratio in ["16_9", "3_2"]:
        for img in images:
            if img.get("ratio") == ratio and img.get("width", 0) > 500:
                return img.get("url", "")
    return images[0].get("url", "")

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

def transform_event(event):
    genres = extract_genres(event)
    venue_data = event.get("_embedded", {}).get("venues", [{}])[0]
    dates = event.get("dates", {}).get("start", {})
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
        "happening_now": False,
        "is_tonight": False,
        "source": "ticketmaster",
    }

def deduplicate_events(events):
    """Remove duplicate events based on name + date + venue"""
    seen = set()
    unique = []
    
    for event in events:
        # Create a unique key based on name, date, and venue
        key = (
            event.get("name", "").lower().strip(),
            event.get("date"),
            event.get("venue", "").lower().strip()
        )
        
        if key not in seen:
            seen.add(key)
            unique.append(event)
        else:
            print(f"Skipping duplicate: {event['name']} on {event['date']} at {event['venue']}")
    
    return unique

def sync_to_supabase(events):
    transformed = [transform_event(e) for e in events]
    
    # Filter out any with missing required fields
    transformed = [e for e in transformed if e["name"] and e["date"] and e["external_id"]]
    
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
    print("Fetching events from Ticketmaster...")
    events = fetch_ticketmaster_events(size=50)
    print(f"Found {len(events)} events")
    sync_to_supabase(events)
    print("Done!")