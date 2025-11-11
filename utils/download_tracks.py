import requests
import json
from datetime import datetime, timedelta
import time

# Configuration
API_BASE_URL = "https://phish.in/api/v2"
OUTPUT_FILE = "tracks_raw.json"

def fetch_tracks(start_date=None, test_mode=False):
    """
    Fetch tracks from the API with pagination.
    
    Args:
        start_date: Optional start date filter (YYYY-MM-DD)
        test_mode: If True, only fetch ~6 shows
    
    Returns:
        List of track objects
    """
    all_tracks = []
    page = 1
    target_shows = 6 if test_mode else float('inf')
    unique_shows = set()
    
    print(f"Fetching tracks from API...")
    if test_mode:
        print(f"TEST MODE: Will stop after {target_shows} shows")
    if start_date:
        print(f"Starting from date: {start_date}")
    
    while True:
        # Build URL with params
        url = f"{API_BASE_URL}/tracks?page={page}&per_page=100&sort=date:asc"
        if start_date:
            url += f"&start_date={start_date}"
        
        print(f"Fetching page {page}...", end=" ")
        
        try:
            response = requests.get(url)
            response.raise_for_status()  # Raise error for bad status codes
            
            data = response.json()
            
            # Check if response is a list or has data wrapper
            if isinstance(data, list):
                tracks = data
            elif isinstance(data, dict):
                tracks = data["tracks"]
            else:
                print(f"\nUnexpected response format: {type(data)}")
                break
            
            # No more data
            if not tracks:
                print("No more tracks")
                break
            
            # Add tracks, checking for test mode limit
            for track in tracks:
                all_tracks.append(track)
                unique_shows.add(track["show_date"])
                if test_mode and len(unique_shows) >= target_shows:
                    print(f"Reached {target_shows} shows")
                    return all_tracks
            
            print(f"{len(tracks)} tracks (Total: {len(all_tracks)}, Shows: {len(unique_shows)})")
            
            # Check if there are more pages (if pagination info exists)
            if isinstance(data, dict):
                total_pages = data.get("total_pages", page)
                if page >= total_pages:
                    print(f"Reached last page ({total_pages})")
                    break
            elif len(tracks) < 100:
                # If we got less than a full page, probably the last page
                print("Last page (partial results)")
                break
            
            page += 1
            time.sleep(0.5)  # Be nice to the API
            
        except requests.exceptions.RequestException as e:
            print(f"\nError: {e}")
            break
        except json.JSONDecodeError as e:
            print(f"\nJSON error: {e}")
            break
    
    return all_tracks

def get_last_date(filename):
    """Get the most recent track date from file."""
    try:
        with open(filename, 'r') as f:
            tracks = json.load(f)
            if tracks:
                return tracks[-1]["show_date"]
    except:
        return None

def main():
    import sys
    
    # Parse arguments
    test_mode = "--test" in sys.argv or "-t" in sys.argv
    update_mode = "--update" in sys.argv or "-u" in sys.argv
    
    # Determine output file
    output_file = "tracks_raw_test.json" if test_mode else OUTPUT_FILE
    
    # Determine start date for update mode
    start_date = None
    if update_mode and not test_mode:
        last_date = get_last_date(output_file)
        if last_date:
            next_day = datetime.strptime(last_date, "%Y-%m-%d") + timedelta(days=1)
            start_date = next_day.strftime("%Y-%m-%d")
            print(f"UPDATE MODE: Fetching from {start_date}\n")
    
    # Fetch tracks
    tracks = fetch_tracks(start_date=start_date, test_mode=test_mode)
    
    if not tracks:
        print("\nNo tracks fetched.")
        return
    
    # Merge with existing data if update mode
    if update_mode and start_date:
        try:
            with open(output_file, 'r') as f:
                existing = json.load(f)
                print(f"Merging {len(existing)} existing + {len(tracks)} new tracks")
                tracks = existing + tracks
        except:
            pass
    
    # Save
    with open(output_file, 'w') as f:
        json.dump(tracks, f, indent=2)
    
    # Summary
    unique_shows = len(set(t["show_date"] for t in tracks))
    print(f"\n{'='*50}")
    print(f"Saved to: {output_file}")
    print(f"Tracks: {len(tracks)}")
    print(f"Shows: {unique_shows}")
    if tracks:
        print(f"Date range: {tracks[0]['show_date']} to {tracks[-1]['show_date']}")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
    print("\nUsage:")
    print("  python download_tracks.py          # Download all")
    print("  python download_tracks.py --test   # Download 6 shows")
    print("  python download_tracks.py --update # Download new only")
