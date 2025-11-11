import json
from datetime import datetime
from collections import defaultdict

# Configuration
INPUT_FILE = "tracks_raw.json"
OUTPUT_FILE = "shows.json"

def load_raw_tracks(filename):
    """
    Load raw track data from JSON file.
    
    Returns:
        List of track objects
    """
    print(f"Loading raw tracks from {filename}...")
    
    try:
        with open(filename, 'r') as f:
            tracks = json.load(f)
        
        print(f"Loaded {len(tracks)} tracks")
        
        if tracks:
            unique_shows = len(set(track["show_date"] for track in tracks))
            print(f"Spanning {unique_shows} shows")
            print(f"Date range: {tracks[0]['show_date']} to {tracks[-1]['show_date']}")
        
        return tracks
        
    except FileNotFoundError:
        print(f"Error: File {filename} not found. Run download_tracks.py first.")
        return []
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {filename}: {e}")
        return []

def calculate_show_positions(tracks):
    """
    Calculate show_position for each show within its year.
    Returns dict mapping show_date to position within that year.
    """
    print("Calculating show positions within each year...")
    
    # Group show dates by year
    shows_by_year = defaultdict(list)
    for track in tracks:
        show_date = track["show_date"]
        year = datetime.strptime(show_date, "%Y-%m-%d").year
        if show_date not in [d for d in shows_by_year[year]]:
            shows_by_year[year].append(show_date)
    
    # Sort shows within each year and assign positions
    show_positions = {}
    for year, dates in shows_by_year.items():
        sorted_dates = sorted(dates)
        for idx, date in enumerate(sorted_dates, start=1):
            show_positions[date] = idx
    
    return show_positions

def calculate_song_gaps(tracks):
    """
    Calculate shows_since_played, days_since_played, and first_date_played.
    Returns:
        - gaps: dict mapping (song_slug, show_date) to gap values
        - first_performances: dict mapping song_slug to first performance date
    """
    print("Calculating song performance gaps...")
    
    # Group tracks by song
    tracks_by_song = defaultdict(list)
    
    for track in tracks:
        if track.get("songs"):
            for song in track["songs"]:
                tracks_by_song[song["slug"]].append({
                    "show_date": track["show_date"],
                    "track_id": track["id"]
                })
    
    # Get all unique show dates for counting shows between performances
    all_show_dates = sorted(set(track["show_date"] for track in tracks))
    
    # Calculate gaps for each song
    gaps = {}
    first_performances = {}
    
    for song_slug, performances in tracks_by_song.items():
        # Sort performances by date
        sorted_perfs = sorted(performances, key=lambda x: x["show_date"])
        
        # Store first performance date
        if sorted_perfs:
            first_performances[song_slug] = sorted_perfs[0]["show_date"]
        
        for i, perf in enumerate(sorted_perfs):
            if i == 0:
                # First performance, no previous gap
                gaps[(song_slug, perf["show_date"])] = {
                    "shows_since_played": 0,
                    "days_since_played": 0
                }
            else:
                prev_perf = sorted_perfs[i - 1]
                prev_date = datetime.strptime(prev_perf["show_date"], "%Y-%m-%d")
                curr_date = datetime.strptime(perf["show_date"], "%Y-%m-%d")
                
                # Calculate days
                days_diff = (curr_date - prev_date).days
                
                # Calculate shows between performances
                shows_between = len([d for d in all_show_dates 
                                   if prev_perf["show_date"] < d < perf["show_date"]])
                
                gaps[(song_slug, perf["show_date"])] = {
                    "shows_since_played": shows_between,
                    "days_since_played": days_diff
                }
    
    print(f"Processed {len(tracks_by_song)} unique songs")
    
    return gaps, first_performances

def transform_tracks(tracks):
    """
    Transform raw track data into the target structure.
    Organizes tracks by show and calculates all derived fields.
    
    Returns:
        Dict with show_id keys containing show data and tracks
    """
    print("\nTransforming tracks to target structure...")
    
    if not tracks:
        print("No tracks to transform")
        return {}
    
    # Calculate show positions
    show_positions = calculate_show_positions(tracks)
    
    # Calculate song gaps
    song_gaps, first_performances = calculate_song_gaps(tracks)
    
    # Group tracks by show_date
    tracks_by_show = defaultdict(list)
    show_metadata = {}
    
    for track in tracks:
        show_date = track["show_date"]
        tracks_by_show[show_date].append(track)
        
        # Collect show metadata from first track we see for this show
        if show_date not in show_metadata:
            show_metadata[show_date] = {
                "venue_name": track.get("venue_name", ""),
                "location": track.get("venue_location", ""),
                "album_cover_url": track.get("show_album_cover_url", "")
            }
    
    # Create a show_id mapping (using date-based index as show_id)
    show_id_map = {}
    for idx, show_date in enumerate(sorted(show_metadata.keys()), start=1):
        show_id_map[show_date] = str(idx)
    
    # Transform each show
    shows_data = {}
    
    for show_date in sorted(tracks_by_show.keys()):
        show_id = show_id_map[show_date]
        show_tracks = sorted(tracks_by_show[show_date], key=lambda x: (x["set_name"], x["position"]))
        
        # Initialize show in result
        shows_data[show_id] = {
            "datestr": show_date,
            "venue_name": show_metadata[show_date]["venue_name"],
            "location": show_metadata[show_date]["location"],
            "album_cover_url": show_metadata[show_date]["album_cover_url"],
            "tracks": []
        }
        
        # Calculate start_time for tracks in each set
        set_cumulative_time = defaultdict(float)
        
        for track in show_tracks:
            # Parse date
            date_obj = datetime.strptime(show_date, "%Y-%m-%d")
            
            # Get song information
            song_ids = []
            song_names = []
            first_date_played = ""
            shows_since = 0
            days_since = 0
            
            if track.get("songs"):
                for song in track["songs"]:
                    song_slug = song["slug"]
                    song_ids.append(song_slug)  # Use slug as the unique identifier
                    song_names.append(song["title"])
                    
                    # Get first performance date
                    if song_slug in first_performances:
                        first_date_played = first_performances[song_slug]
                    
                    # Get gaps for this song
                    gap_key = (song_slug, show_date)
                    if gap_key in song_gaps:
                        shows_since = song_gaps[gap_key]["shows_since_played"]
                        days_since = song_gaps[gap_key]["days_since_played"]
            
            song_name = " > ".join(song_names) if song_names else track["title"]
            
            # Get start time for this track (cumulative time in the set)
            set_key = str(track["set_name"])
            start_time = set_cumulative_time[set_key]
            
            # Map set_name to set number
            set_name_lower = str(track["set_name"]).lower()
            if set_name_lower == "set 1":
                set_number = "1"
            elif set_name_lower == "set 2":
                set_number = "2"
            elif set_name_lower == "set 3":
                set_number = "3"
            elif set_name_lower == "encore":
                set_number = "E"
            else:
                # Fallback: try to extract number, or use as-is
                set_number = str(track["set_name"])


            # Create transformed track
            transformed_track = {
                "track_id": str(track["id"]),
                "song_name": song_name,
                "song_ids": song_ids,
                "show_id": show_id,
                "duration": track["duration"] / 60000.0,  # Convert ms to minutes
                "datestr": show_date,
                "position": track["position"],
                "set": set_number,
                "set_name": str(track["set_name"]),
                "start_time": start_time,
                "year": date_obj.year,
                "month": date_obj.month,
                "day": date_obj.day,
                "venue": track.get("venue_name", ""),
                "city": track.get("venue_location", ""),
                "show_position": show_positions.get(show_date, 0),
                "shows_since_played": shows_since,
                "days_since_played": days_since,
                "first_date_played": first_date_played,
                "mp3_url": track.get("mp3_url", ""),
                "album_cover_url": track.get("show_album_cover_url", "")
            }
            
            shows_data[show_id]["tracks"].append(transformed_track)
            
            # Update cumulative time for this set
            set_cumulative_time[set_key] += transformed_track["duration"]
    
    total_tracks = sum(len(show["tracks"]) for show in shows_data.values())
    print(f"Transformed {total_tracks} tracks into {len(shows_data)} shows")
    
    return shows_data

def save_shows(shows_data, filename):
    """
    Save transformed show data to JSON file.
    """
    print(f"\nSaving to {filename}...")
    
    with open(filename, 'w') as f:
        json.dump(shows_data, f, indent=2)
    
    print(f"Saved successfully!")

def main(test_mode=False):
    """
    Main function to transform raw track data into final show structure.
    
    Args:
        test_mode: If True, use test input/output files
    """
    input_file = "tracks_raw_test.json" if test_mode else INPUT_FILE
    output_file = "shows_test.json" if test_mode else OUTPUT_FILE
    
    print("="*50)
    print("PHISH TRACK TRANSFORMATION")
    print("="*50)
    
    # Load raw tracks
    tracks = load_raw_tracks(input_file)
    
    if not tracks:
        print("\nNo tracks to process. Exiting.")
        return
    
    # Transform to target structure
    shows_data = transform_tracks(tracks)
    
    # Save result
    save_shows(shows_data, output_file)
    
    # Print summary
    print("\n" + "="*50)
    print("SUMMARY")
    print("="*50)
    print(f"Input:  {input_file}")
    print(f"Output: {output_file}")
    print(f"Shows:  {len(shows_data)}")
    total_tracks = sum(len(show["tracks"]) for show in shows_data.values())
    print(f"Tracks: {total_tracks}")
    print("="*50)

if __name__ == "__main__":
    import sys
    
    # Check command line arguments
    test_mode = "--test" in sys.argv or "-t" in sys.argv
    
    main(test_mode=test_mode)
    
    print("\nUsage:")
    print("  python transform_tracks.py        # Transform tracks_raw.json -> shows.json")
    print("  python transform_tracks.py --test # Transform tracks_raw_test.json -> shows_test.json")