import json
import sys

def filter_tracks(target_date):
    """Remove tracks after target_date from tracks_raw.json"""

    input_file = "data/tracks_raw.json"

    # Load tracks
    with open(input_file, 'r') as f:
        tracks = json.load(f)

    original_count = len(tracks)

    # Filter tracks - keep only those on or before target_date
    filtered_tracks = [track for track in tracks if track["show_date"] <= target_date]

    removed_count = original_count - len(filtered_tracks)

    # Save back
    with open(input_file, 'w') as f:
        json.dump(filtered_tracks, f, indent=2)

    print(f"Original tracks: {original_count}")
    print(f"Removed tracks after {target_date}: {removed_count}")
    print(f"Remaining tracks: {len(filtered_tracks)}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python filter_tracks_by_date.py YYYY-MM-DD")
        sys.exit(1)

    target_date = sys.argv[1]
    filter_tracks(target_date)
