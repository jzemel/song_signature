// DATA LOADING AND PROCESSING

import { SHOWS_URL, SHOW_SETS } from './config.js';
import { setAllTracks, setSelectedData, songIndex, allTracks } from './state.js';

/**
 * Fetch show data from API
 * @returns {Promise} Promise that resolves when data is loaded
 */
export function fetchShowData() {
    return fetch(SHOWS_URL)
        .then(response => {
            if (response.status !== 200) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => unpackShows(data))
        .catch(err => {
            console.error('Fetch Error:', err);
            throw err;
        });
}

/**
 * Flatten show data into tracks and build song index
 * @param {Object} shows - Shows data object
 * @returns {Array} Array of track objects
 */
function unpackShows(shows) {
    const tracks = [];

    for (const showId in shows) {
        const show = shows[showId];

        show.tracks.forEach(track => {
            if (SHOW_SETS.includes(track.set)) {
                // Strip unused fields to reduce memory footprint
                const optimizedTrack = {
                    track_id: track.track_id,
                    song_name: track.song_name,
                    song_ids: track.song_ids,
                    show_id: track.show_id,
                    duration: track.duration,
                    datestr: track.datestr,
                    venue: track.venue,
                    show_position: track.show_position,
                    shows_since_played: track.shows_since_played,
                    first_date_played: track.first_date_played,
                    album_cover_url: track.album_cover_url,
                    missing: track.missing,
                    year: track.year,
                    set: track.set,
                    start_time: track.start_time,
                    position: track.position
                };
                tracks.push(optimizedTrack);
            }

            // Build song index for filtering
            track.song_ids.forEach(songId => {
                if (songIndex.has(songId)) {
                    songIndex.get(songId).push(track.show_id);
                } else {
                    songIndex.set(songId, [track.show_id]);
                }
            });
        });
    }

    setAllTracks(tracks);
    setSelectedData(tracks);

    return tracks;
}

/**
 * Filter tracks to only shows containing specified songs
 * @param {Array} songIDs - Array of song IDs to filter by
 */
export function filterToSongs(songIDs) {
    const selectedShows = [];
    songIDs.forEach(songId => {
        const shows = songIndex.get(songId);
        if (shows) {
            selectedShows.push(...shows);
        }
    });

    const filtered = allTracks.filter(track => selectedShows.includes(track.show_id));
    setSelectedData(filtered);
}
