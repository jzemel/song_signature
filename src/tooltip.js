// TOOLTIP MANAGEMENT

import { TOOLTIP_OFFSET_X, TOOLTIP_OFFSET_Y, TOOLTIP_FADE_DURATION } from './config.js';

// Tooltip DOM element
export const tooltip = d3.select(".tooltip-donut")
    .style("opacity", 0)
    .on('click', function(event) {
        // Stop propagation so clicking tooltip doesn't hide it
        event.stopPropagation();
    });

/**
 * Generate HTML for tooltip content
 * @param {Object} barData - Track data object
 * @returns {string} HTML string for tooltip
 */
export function generateTooltipHTML(barData) {
    const phishinUrl = `https://phish.in/${barData.datestr}/${barData.song_ids[0]}`;
    const albumCover = barData.album_cover_url ?
        `<img src="${barData.album_cover_url}" class="tooltip-album-cover" alt="Album cover">` : '';

    return `
        ${albumCover}
        <div class="tooltip-song-name">${barData.song_name}</div>
        <div class="tooltip-date-venue">${barData.datestr} · ${barData.venue}</div>
        <div class="tooltip-info">Length: <strong>${Math.round(barData.duration)} min</strong></div>
        <div class="tooltip-info">Shows since played: <strong>${barData.shows_since_played}</strong></div>
        <div class="tooltip-info">1st time played: <strong>${barData.first_date_played}</strong></div>
        ${phishinUrl ? `
        <div class="tooltip-links">
            <a href="${phishinUrl}" target="_blank">Listen</a>
        </div>
        ` : ''}
    `;
}

/**
 * Show tooltip at specified position with content
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {string} html - HTML content
 */
export function showTooltip(x, y, html) {
    tooltip.transition()
        .duration(0.5)
        .style('opacity', '1');
    tooltip.style("transform", `translate(${x + TOOLTIP_OFFSET_X}px, ${y + TOOLTIP_OFFSET_Y}px)`);
    tooltip.html(html);
}

/**
 * Hide tooltip
 */
export function hideTooltip() {
    tooltip.transition()
        .duration(TOOLTIP_FADE_DURATION)
        .style('opacity', 0);
}

/**
 * Pin tooltip (enable pointer events)
 */
export function pinTooltip() {
    tooltip.classed('pinned', true);
}

/**
 * Unpin tooltip (disable pointer events)
 */
export function unpinTooltip() {
    tooltip.classed('pinned', false);
}
