// UTILITY FUNCTIONS

import { MS_PER_YEAR } from './config.js';

/**
 * Strip special characters from string to make it HTML/CSS safe
 * @param {string} string - The string to sanitize
 * @returns {string} Sanitized string
 */
export function stripForHTML(string) {
    return string
        .replace(/[.,?\/#!$%\^&\*;:{}=>_\'`~()]/g, "")
        .replace(/ /g, "-")
        .replace(/^\d/g, "z");
}

/**
 * Calculate the age of a song in years
 * @param {Object} track - Track object with first_date_played
 * @returns {number} Age in years
 */
export function calculateSongAge(track) {
    const ageMs = Date.now() - new Date(track.first_date_played);
    return ageMs / MS_PER_YEAR;
}

/**
 * Find a track by its ID
 * @param {string} id - Track ID to find
 * @param {Array} tracks - Array of tracks to search
 * @returns {Object|undefined} The track object or undefined
 */
export function getTrackByID(id, tracks) {
    return tracks.find(track => track.track_id === id);
}
