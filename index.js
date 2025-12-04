// ============================================================================
// IMPORTS & CONFIGURATION
// ============================================================================
import * as C from './constants.js';

const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
const USE_LOCAL_DATA_FOR_DEV = true;

const SHOWS_FILENAME = C.CHUNK_VERSION === 'all' ? 'shows.json' : `chunks/shows_${C.CHUNK_VERSION}.json`;
const SHOWS_URL = isLocal
    ? (USE_LOCAL_DATA_FOR_DEV
        ? `/data/${SHOWS_FILENAME}`
        : `https://phishgraphs.com/data/${SHOWS_FILENAME}`)
    : `https://${window.location.hostname}/data/${SHOWS_FILENAME}`;


// ============================================================================
// STATE MANAGEMENT
// ============================================================================
let selectedData;
let allTracks;
let colorFunction = function(track) { return colorShowsSincePlayed(track.shows_since_played); };
let currentColorMode = "Shows Since Played";
let pinnedTooltip = null; // Track ID of pinned tooltip
let songIndex = {}; // Maps song_id to array of show_ids
let songNameIndex = new Map(); // Maps sanitized song name to display name
let seasonLabelsByYear = {}; // Season label positions by year
let lastVisibleYear = null; // Currently visible year for sticky labels

// ============================================================================
// D3 SCALES & COLOR FUNCTIONS
// ============================================================================
const colorShowsSincePlayed = d3.scaleSequential()
    .domain([C.SHOWS_SINCE_PLAYED_DOMAIN_MIN, C.SHOWS_SINCE_PLAYED_DOMAIN_MAX])
    .interpolator(d3.interpolateYlGnBu)
    .unknown(C.COLOR_SCALE_UNKNOWN);

const colorAge = d3.scaleSequential()
    .domain([C.SONG_AGE_DOMAIN_MIN, C.SONG_AGE_DOMAIN_MAX])
    .interpolator(d3.interpolateOranges)
    .unknown(C.COLOR_SCALE_UNKNOWN);

const colorLikesCount = d3.scaleSequential()
    .domain([C.LIKES_COUNT_DOMAIN_MIN, C.LIKES_COUNT_DOMAIN_MAX])
    .interpolator(d3.interpolatePurples)
    .unknown(C.COLOR_SCALE_UNKNOWN);

const xScale = d3.scaleLinear()
    .range([0, C.CHART_WIDTH])
    .domain([C.X_SCALE_MIN, C.X_SCALE_MAX]);

// ============================================================================
// DOM ELEMENTS & D3 SELECTIONS
// ============================================================================
const chartContainer = d3
    .select('svg')
    .attr('width', C.CHART_WIDTH)
    .attr('height', C.CHART_HEIGHT)
    .style('background-color', '#fafafa');

const chart = chartContainer.append('g');

const svgContainer = document.getElementById('svg-container');
const fixedScrollbar = document.getElementById('fixed-scrollbar');

const tooltip = d3.select(".tooltip-donut")
    .style("opacity", 0)
    .on('click', (event) => event.stopPropagation());

// ============================================================================
// HELPER FUNCTIONS - Date & Season
// ============================================================================

/**
 * Get season information from a date string
 * @param {string} datestr - Date string in YYYY-MM-DD format
 * @returns {Object} Object with season name and index (0-4)
 */
function getSeasonInfo(datestr) {
    const date = new Date(datestr);
    const month = date.getMonth(); // 0-11

    // Winter1: Jan-Feb, Spring: Mar-May, Summer: Jun-Aug, Fall: Sep-Nov, Winter2: Dec
    if (month <= 1) return { season: 'winter1', season_index: 0 };
    if (month <= 4) return { season: 'spring', season_index: 1 };
    if (month <= 7) return { season: 'summer', season_index: 2 };
    if (month <= 10) return { season: 'fall', season_index: 3 };
    return { season: 'winter2', season_index: 4 };
}

/**
 * Calculate the age of a song in years
 * @param {Object} track - Track object with first_date_played property
 * @returns {number} Age in years
 */
function calculateSongAge(track) {
    const ageMs = Date.now() - new Date(track.first_date_played);
    return ageMs / C.MS_PER_YEAR;
}

// ============================================================================
// HELPER FUNCTIONS - Positioning & Layout
// ============================================================================

/**
 * Calculate the Y position for a bar based on track data
 * @param {Object} data - Track data object
 * @returns {number} Y coordinate in pixels
 */
function calculateBarY(data) {
    if (data.missing === true) {
        return ((C.YEARS.indexOf(data.year)) * C.YEAR_HEIGHT + (data.position - 1) * C.MISSING_DURATION) * C.PX_PER_MIN + C.MARGINS.top;
    }
    if (data.datestr in C.SHOW_SCALE_OVERRIDES) {
        const scale = C.SHOW_SCALE_OVERRIDES[data.datestr];
        return ((C.YEARS.indexOf(data.year)) * C.YEAR_HEIGHT + (parseInt(data.set.replace("E", 4)) - 1) * C.SET_HEIGHT_MINUTES * scale + data.start_time * scale) * C.PX_PER_MIN + C.MARGINS.top;
    }
    return ((C.YEARS.indexOf(data.year)) * C.YEAR_HEIGHT + (parseInt(data.set.replace("E", 3)) - 1) * C.SET_HEIGHT_MINUTES + data.start_time) * C.PX_PER_MIN + C.MARGINS.top;
}

/**
 * Calculate the height for a bar based on track data
 * @param {Object} data - Track data object
 * @returns {number} Height in pixels
 */
function calculateBarHeight(data) {
    const scale = C.SHOW_SCALE_OVERRIDES[data.datestr] || 1.0;
    const duration = data.missing ? C.MISSING_DURATION : data.duration;
    return duration * C.PX_PER_MIN * scale;
}

/**
 * Calculate which year is currently visible at the top of the viewport
 * @returns {number} The year currently at the top
 */
function calculateVisibleYear() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const checkPositionInViewport = C.STICKY_SEASON_LABELS_TOP + C.STICKY_SEASON_LABELS_HEIGHT;
    const absolutePosition = scrollTop + checkPositionInViewport;
    const positionInChartData = absolutePosition + C.CHART_WRAPPER_MARGIN_TOP - C.MARGINS.top;
    const yearIndex = Math.floor(positionInChartData / (C.YEAR_HEIGHT * C.PX_PER_MIN));
    const clampedIndex = Math.max(0, Math.min(yearIndex, C.YEARS.length - 1));
    return C.YEARS[clampedIndex];
}

// ============================================================================
// HELPER FUNCTIONS - UI & Interaction
// ============================================================================

/**
 * Generate HTML content for the tooltip
 * @param {Object} barData - Track data object
 * @returns {string} HTML string for tooltip content
 */
function generateTooltipHTML(barData) {
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
        <div class="tooltip-info">Like count: <strong>${barData.likes_count}</strong></div>
        ${phishinUrl ? `
        <div class="tooltip-links">
            <a href="${phishinUrl}" target="_blank">Listen</a>
        </div>
        ` : ''}
    `;
}

/**
 * Highlight all bars with the same song name
 * @param {string} className - Sanitized song name used as class
 */
function highlight(className) {
    const highlightColor = C.COLOR_MODE_STYLES[currentColorMode].highlight;
    d3.selectAll("." + className)
        .transition()
        .duration(C.HIGHLIGHT_DURATION)
        .style('fill', highlightColor);
}

/**
 * Remove highlight from all bars with the same song name
 * @param {string} className - Sanitized song name used as class
 */
function unHighlight(className) {
    const selectedColor = C.COLOR_MODE_STYLES[currentColorMode].selected;
    d3.selectAll("." + className)
        .transition()
        .duration(C.HIGHLIGHT_DURATION)
        .style('fill', function(data) {
            const isSelected = d3.select(this).classed('selected');
            if (isSelected) {
                return selectedColor;
            } else if (data.missing) {
                return C.MISSING_COLOR;
            } else {
                return colorFunction(data);
            }
        });
}

/**
 * Toggle selection state for all bars with the same song name
 * @param {string} className - Sanitized song name used as class
 */
function toggleSelect(className) {
    const selectedColor = C.COLOR_MODE_STYLES[currentColorMode].selected;
    if (d3.selectAll("." + className).classed('selected')) {
        d3.selectAll("." + className).classed('selected', false).style("fill", data => {
            if (data.missing) {
                return C.MISSING_COLOR;
            }
            return colorFunction(data);
        });
    } else {
        d3.selectAll("." + className).classed('selected', true).style("fill", selectedColor);
    }
}

/**
 * Strip special characters from string to make it HTML/CSS safe
 * @param {string} string - The string to sanitize
 * @returns {string} Sanitized string safe for use as HTML class/ID
 */
function stripForHTML(string) {
    return string.replace(/[.,?\/#!$%\^&\*;:{}=>_\'`~()]/g, "").replace(/ /g, "-").replace(/^\d/g, "z");
}

/**
 * Throttle function to limit execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} wait - Milliseconds to wait between executions
 * @returns {Function} Throttled function
 */
function throttle(func, wait) {
    let timeout = null;
    let previous = 0;

    return function(...args) {
        const now = Date.now();
        const remaining = wait - (now - previous);

        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            func.apply(this, args);
        } else if (!timeout) {
            timeout = setTimeout(() => {
                previous = Date.now();
                timeout = null;
                func.apply(this, args);
            }, remaining);
        }
    };
}

// ============================================================================
// DATA PROCESSING
// ============================================================================

/**
 * Flatten show data into tracks, build song index, and render chart
 * @param {Object} shows - Shows data object from API
 */
function unpackShows(shows) {
    let maxShows = 1;
    allTracks = [];

    // First pass: collect all tracks with basic info
    const tracksWithDates = [];
    for (let i in shows) {
        if (shows[i].tracks[0].show_position > maxShows) {
            maxShows = shows[i].tracks[0].show_position;
        }
        shows[i].tracks.forEach((track) => {
            if (C.SHOW_SETS.includes(track.set)) {
                const seasonInfo = getSeasonInfo(track.datestr);
                tracksWithDates.push({
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
                    likes_count: track.likes_count || 0,
                    album_cover_url: track.album_cover_url,
                    missing: track.missing,
                    year: track.year,
                    set: track.set,
                    start_time: track.start_time,
                    position: track.position,
                    season: seasonInfo.season,
                    season_index: seasonInfo.season_index
                });
            }
            track.song_ids.forEach((song_id) => {
                if (song_id in songIndex) {
                    songIndex[song_id].push(track.show_id);
                } else {
                    songIndex[song_id] = [track.show_id];
                }
            });
            // Build search index
            const sanitizedName = stripForHTML(track.song_name);
            if (!songNameIndex.has(sanitizedName)) {
                songNameIndex.set(sanitizedName, track.song_name);
            }
        });
    }

    // Second pass: calculate position within each season
    const seasonPositions = {};
    tracksWithDates.sort((a, b) => new Date(a.datestr) - new Date(b.datestr));

    tracksWithDates.forEach(track => {
        const key = `${track.year}_${track.season}`;

        if (!seasonPositions[key]) {
            seasonPositions[key] = { position: 0, lastShowId: null };
        }

        // Only increment position when we encounter a new show
        if (track.show_id !== seasonPositions[key].lastShowId) {
            if (seasonPositions[key].lastShowId !== null) {
                seasonPositions[key].position++;
            }
            seasonPositions[key].lastShowId = track.show_id;
        }

        track.season_position = seasonPositions[key].position;
        allTracks.push(track);
    });

    selectedData = allTracks;
    renderChart();
}

/**
 * Filter tracks to only shows containing specified songs
 * @param {Array} songIDs - Array of song IDs to filter by
 */
function filterTo(songIDs) {
    let selectedShows = [];
    songIDs.forEach(s => selectedShows = selectedShows.concat(songIndex[s]));
    selectedData = allTracks.filter((track) => selectedShows.includes(track.show_id));
}

/**
 * Find a track by its ID
 * @param {string} id - Track ID to find
 * @returns {Object|undefined} The track object or undefined if not found
 */
function getTrackByID(id) {
    for (let i = 0; i < selectedData.length; i++) {
        if (selectedData[i].track_id === id) {
            return selectedData[i];
        }
    }
}

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Render the main chart with bars, labels, and dividers
 */
function renderChart() {
    // Render bars
    chart.selectAll('.bar')
        .data(selectedData, data => data.track_id)
        .enter()
        .append('rect')
        .attr('name', (data) => stripForHTML(data.song_name))
        .attr('class', (data) => stripForHTML(data.song_name))
        .classed('bar', true)
        .attr('id', (data) => "s" + data.track_id)
        .attr('width', C.BAR_WIDTH)
        .attr('height', data => calculateBarHeight(data))
        .attr('duration', data => data.duration)
        .attr('x', data => xScale(data.show_position) + C.MARGINS.left)
        .attr('y', data => calculateBarY(data))
        .style("fill", data => {
            if (data.missing) {
                return C.MISSING_COLOR;
            }
            return colorFunction(data);
        })
        .style("stroke", C.BAR_STROKE_COLOR)
        .style("stroke-width", C.BAR_STROKE_WIDTH)
        .attr("rx", C.BAR_BORDER_RADIUS)
        .attr("ry", C.BAR_BORDER_RADIUS);

    chart.selectAll('.bar').data(selectedData, data => data.track_id).exit().remove();

    // Click anywhere to deselect all bars and hide tooltip
    d3.select('body').on('click', function() {
        tooltip.transition().duration(C.TOOLTIP_FADE_DURATION).style('opacity', 0);
        tooltip.classed('pinned', false);
        pinnedTooltip = null;
        d3.selectAll('.bar.selected').each(function(data) {
            d3.select(this).classed('selected', false).style("fill", () => {
                if (data.missing) {
                    return C.MISSING_COLOR;
                }
                return colorFunction(data);
            });
        });
    });

    // Calculate season boundaries for dividers
    const seasonBoundaries = [];

    C.YEARS.forEach(year => {
        const yearTracks = selectedData.filter(d => d.year === year);
        if (yearTracks.length === 0) return;

        yearTracks.sort((a, b) => a.show_position - b.show_position);

        let currentSeason = null;
        let previousTrack = null;

        yearTracks.forEach(track => {
            if (currentSeason !== null && track.season_index !== currentSeason && previousTrack) {
                const prevX = xScale(previousTrack.show_position) + C.MARGINS.left + C.BAR_WIDTH / 2;
                const currX = xScale(track.show_position) + C.MARGINS.left + C.BAR_WIDTH / 2;
                const midX = (prevX + currX) / 2;

                seasonBoundaries.push({
                    year: year,
                    x: midX,
                    yearIndex: C.YEARS.indexOf(year)
                });
            }
            currentSeason = track.season_index;
            previousTrack = track;
        });

        // If first show is not winter1, add divider before first bar
        if (yearTracks.length > 0 && yearTracks[0].season_index > 0) {
            const firstX = xScale(yearTracks[0].show_position) + C.MARGINS.left;
            seasonBoundaries.push({
                year: year,
                x: firstX - C.BAR_WIDTH / 2 - 2,
                yearIndex: C.YEARS.indexOf(year),
                isStart: true
            });
        }
    });

    // Render season dividers
    chart.selectAll('.season-divider')
        .data(seasonBoundaries)
        .enter()
        .append('line')
        .classed('season-divider', true)
        .attr('x1', d => d.x)
        .attr('x2', d => d.x)
        .attr('y1', d => (d.yearIndex * C.YEAR_HEIGHT * C.PX_PER_MIN) + C.MARGINS.top + C.YEAR_DIVIDER_OFFSET_Y)
        .attr('y2', d => ((d.yearIndex + 1) * C.YEAR_HEIGHT * C.PX_PER_MIN) + C.MARGINS.top + C.YEAR_DIVIDER_OFFSET_Y)
        .style('stroke', C.SEASON_DIVIDER_COLOR)
        .style('stroke-width', 1)
        .style('opacity', C.SEASON_DIVIDER_OPACITY);

    // Build season labels for all years
    const seasonNames = {
        0: 'WINTER',
        1: 'SPRING',
        2: 'SUMMER',
        3: 'FALL',
        4: 'WINTER'
    };

    C.YEARS.forEach(year => {
        const yearTracks = selectedData.filter(d => d.year === year);
        if (yearTracks.length === 0) return;

        yearTracks.sort((a, b) => a.show_position - b.show_position);

        const labels = [];
        let seenSeasons = new Set();
        yearTracks.forEach(track => {
            if (!seenSeasons.has(track.season_index)) {
                labels.push({
                    season: seasonNames[track.season_index],
                    x: xScale(track.show_position) + C.MARGINS.left - 80
                });
                seenSeasons.add(track.season_index);
            }
        });
        seasonLabelsByYear[year] = labels;
    });

    updateStickySeasonLabels(C.YEARS[0]);

    // Render year dividers
    chart.selectAll('.year-divider')
        .data(C.YEARS)
        .enter()
        .append('line')
        .classed('year-divider', true)
        .attr('x1', C.MARGINS.left + C.YEAR_DIVIDER_OFFSET_X)
        .attr('x2', C.CHART_WIDTH)
        .attr('y1', data => ((C.YEARS.indexOf(data)) * C.YEAR_HEIGHT * C.PX_PER_MIN) + C.MARGINS.top + C.YEAR_DIVIDER_OFFSET_Y)
        .attr('y2', data => ((C.YEARS.indexOf(data)) * C.YEAR_HEIGHT * C.PX_PER_MIN) + C.MARGINS.top + C.YEAR_DIVIDER_OFFSET_Y)
        .style('stroke', C.YEAR_DIVIDER_COLOR)
        .style('stroke-width', C.YEAR_DIVIDER_WIDTH)
        .style('opacity', C.YEAR_DIVIDER_OPACITY);

    // Render fixed labels (year and set labels)
    const labelsContainer = d3.select('#labels-container');
    labelsContainer.style('height', C.CHART_HEIGHT + 'px');

    labelsContainer.selectAll('.fixed-year-label')
        .data(C.YEARS)
        .enter()
        .append('div')
        .classed('fixed-year-label', true)
        .text(year => year)
        .style('top', year => ((C.YEARS.indexOf(year)) * C.YEAR_HEIGHT * C.PX_PER_MIN + C.YEAR_LABEL_OFFSET_Y) + 'px');

    labelsContainer.selectAll('.fixed-set-label')
        .data(C.YEARS.flatMap(year =>
            [{ 'year': year, 'num': 1, 'text': "SET 1" },
            { 'year': year, 'num': 2, 'text': "SET 2" },
            { 'year': year, 'num': 3, 'text': "E" }]))
        .enter()
        .append('div')
        .classed('fixed-set-label', true)
        .text(data => data.text)
        .style('top', data => ((C.YEARS.indexOf(data.year)) * C.YEAR_HEIGHT * C.PX_PER_MIN + (data.num - 1) * C.SET_HEIGHT_MINUTES * C.PX_PER_MIN + C.MARGINS.top + C.SET_LABEL_OFFSET_Y) + 'px');
}

/**
 * Update sticky season labels for a specific year
 * @param {number} year - The year to display season labels for
 */
function updateStickySeasonLabels(year) {
    const labels = seasonLabelsByYear[year] || [];
    const container = d3.select('#sticky-season-labels');

    let wrapper = container.select('.sticky-labels-wrapper');
    if (wrapper.empty()) {
        wrapper = container.append('div')
            .classed('sticky-labels-wrapper', true)
            .style('position', 'relative')
            .style('width', C.CHART_WIDTH + 'px')
            .style('height', '100%');
    }

    const seasonLabels = wrapper.selectAll('.sticky-season-label')
        .data(labels, d => d.season);

    seasonLabels.exit().remove();

    seasonLabels.enter()
        .append('div')
        .classed('sticky-season-label', true)
        .merge(seasonLabels)
        .text(d => d.season)
        .style('left', d => d.x + 'px');
}

// ============================================================================
// EVENT HANDLERS - Bar Interactions
// ============================================================================

// Desktop: hover shows tooltip and highlights
if (!C.isMobile) {
    chart.on('mouseover', function(event) {
        const target = event.target;
        if (!target.classList.contains('bar')) return;
        if (pinnedTooltip !== null) return;

        const barElement = d3.select(target);
        const barData = barElement.datum();
        const songName = barElement.attr("name");

        highlight(songName);
        tooltip.transition().duration(C.TOOLTIP_SHOW_DURATION).style('opacity', '1');
        tooltip.style("transform", `translate(${event.clientX + C.TOOLTIP_OFFSET_X}px, ${event.clientY + C.TOOLTIP_OFFSET_Y}px)`);
        tooltip.html(generateTooltipHTML(barData));
    });

    chart.on('mouseout', function(event) {
        const target = event.target;
        if (!target.classList.contains('bar')) return;

        const barElement = d3.select(target);
        const songName = barElement.attr("name");
        unHighlight(songName);

        if (!barElement.classed('selected') && pinnedTooltip === null) {
            tooltip.transition().duration(C.TOOLTIP_FADE_DURATION).style('opacity', 0);
        }
    });
}

// Click to select/deselect and pin/unpin tooltip
chart.on('click', function(event) {
    const target = event.target;
    if (!target.classList.contains('bar')) return;

    const barElement = d3.select(target);
    const barData = barElement.datum();
    const songName = barElement.attr("name");

    if (barElement.classed('selected')) {
        // Deselect
        toggleSelect(songName);
        tooltip.transition().duration(C.TOOLTIP_FADE_DURATION).style('opacity', 0);
        tooltip.classed('pinned', false);
        pinnedTooltip = null;
    } else {
        // Select and pin tooltip
        toggleSelect(songName);
        tooltip.html(generateTooltipHTML(barData));
        tooltip.transition().duration(C.TOOLTIP_SHOW_DURATION).style('opacity', '1');

        if (!C.isMobile) {
            tooltip.style("transform", `translate(${event.clientX + C.TOOLTIP_OFFSET_X}px, ${event.clientY + C.TOOLTIP_OFFSET_Y}px)`);
        }

        tooltip.classed('pinned', true);
        pinnedTooltip = barData.track_id;
    }

    event.stopPropagation();
});

// ============================================================================
// EVENT HANDLERS - Scrolling
// ============================================================================

// Sync scrolling between fixed scrollbar and chart
svgContainer.addEventListener('scroll', () => {
    fixedScrollbar.scrollLeft = svgContainer.scrollLeft;
});

fixedScrollbar.addEventListener('scroll', () => {
    svgContainer.scrollLeft = fixedScrollbar.scrollLeft;
});

// Update sticky season labels on scroll
window.addEventListener('scroll', throttle(() => {
    const currentYear = calculateVisibleYear();
    if (currentYear !== lastVisibleYear) {
        updateStickySeasonLabels(currentYear);
        lastVisibleYear = currentYear;
    }
}, 100));

// Sync horizontal scroll between sticky labels and chart
const stickyLabels = document.getElementById('sticky-season-labels');
svgContainer.addEventListener('scroll', () => {
    stickyLabels.scrollLeft = svgContainer.scrollLeft;
});

// ============================================================================
// EVENT HANDLERS - Color Mode Selection
// ============================================================================

// Populate color mode dropdown
d3.select("#selectButton")
    .selectAll('showOptions')
    .data(C.colorOptions)
    .enter()
    .append('option')
    .text((data) => data)
    .attr('value', (data) => data);

// Handle color mode changes
d3.select("#selectButton").on("change", function(d) {
    let selectedFunction = d3.select(this).property("value");
    currentColorMode = selectedFunction;

    switch (selectedFunction) {
        case "Days Since Played":
            colorFunction = function(track) {
                return colorDaysSincePlayed(track.days_since_played);
            };
            break;
        case "Shows Since Played":
            colorFunction = function(track) {
                return colorShowsSincePlayed(track.shows_since_played);
            };
            break;
        case "Song Age":
            colorFunction = function(track) {
                return colorAge(calculateSongAge(track));
            };
            break;
        case "Likes":
            colorFunction = function(track) {
                return colorLikesCount(track.likes_count);
            };
            break;
        case "None":
            colorFunction = function() { return C.DEFAULT_COLOR };
    }

    const selectedColor = C.COLOR_MODE_STYLES[currentColorMode].selected;
    chart.selectAll('.bar')
        .data(selectedData, data => data.track_id)
        .style("fill", function(data) {
            const isSelected = d3.select(this).classed('selected');
            if (isSelected) {
                return selectedColor;
            } else if (data.missing) {
                return C.MISSING_COLOR;
            }
            return colorFunction(data);
        });
});

// ============================================================================
// EVENT HANDLERS - Search Functionality
// ============================================================================

const searchInput = document.getElementById('song-search');
const searchResults = document.getElementById('search-results');

function handleSearchInput(event) {
    const query = event.target.value.trim().toLowerCase();

    if (query === '') {
        searchResults.innerHTML = '';
        searchResults.classList.remove('active');
        return;
    }

    const matches = Array.from(songNameIndex.values())
        .filter(songName => songName.toLowerCase().includes(query))
        .sort()
        .slice(0, 10);

    if (matches.length > 0) {
        searchResults.innerHTML = matches
            .map(songName => `<div class="search-result-item" data-song="${stripForHTML(songName)}">${songName}</div>`)
            .join('');
        searchResults.classList.add('active');
    } else {
        searchResults.innerHTML = '<div class="search-result-item" style="color: #999; cursor: default;">No matches found</div>';
        searchResults.classList.add('active');
    }
}

searchInput.addEventListener('input', handleSearchInput);

// Hide search results when clicking outside
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.remove('active');
    }
});

// Show results when clicking back into search input
searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim() !== '') {
        handleSearchInput({ target: searchInput });
    }
});

// Search results hover (desktop only)
if (!C.isMobile) {
    searchResults.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('search-result-item')) {
            const songSlug = e.target.getAttribute('data-song');
            if (songSlug) highlight(songSlug);
        }
    });

    searchResults.addEventListener('mouseout', (e) => {
        if (e.target.classList.contains('search-result-item')) {
            const songSlug = e.target.getAttribute('data-song');
            if (songSlug) unHighlight(songSlug);
        }
    });
}

// Search results click
searchResults.addEventListener('click', (e) => {
    if (e.target.classList.contains('search-result-item')) {
        const songSlug = e.target.getAttribute('data-song');
        if (songSlug) {
            toggleSelect(songSlug);
            searchInput.value = '';
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
            e.stopPropagation();
        }
    }
});

// ============================================================================
// EVENT HANDLERS - Help Modal
// ============================================================================

const helpSlides = [
    'images/Phish How To (1).jpg',
    'images/Phish How To (2).jpg',
    'images/Phish How To (3).jpg',
    'images/Phish How To (4).jpg',
    'images/Phish How To (5).jpg'
];

let currentSlide = 0;

const modal = document.getElementById('help-modal');
const modalImage = document.getElementById('modal-image');
const slideCounter = document.getElementById('slide-counter');
const helpIcon = document.getElementById('help-icon');
const closeBtn = document.getElementById('modal-close');
const prevBtn = document.getElementById('prev-slide');
const nextBtn = document.getElementById('next-slide');

function showSlide(n) {
    currentSlide = Math.max(0, Math.min(n, helpSlides.length - 1));
    modalImage.src = helpSlides[currentSlide];
    slideCounter.textContent = `${currentSlide + 1} / ${helpSlides.length}`;
    prevBtn.disabled = currentSlide === 0;
    nextBtn.disabled = currentSlide === helpSlides.length - 1;
}

function handleOpenModal() {
    modal.classList.add('active');
    showSlide(0);
}

function handleCloseModal() {
    modal.classList.remove('active');
}

helpIcon.addEventListener('click', handleOpenModal);
closeBtn.addEventListener('click', handleCloseModal);
prevBtn.addEventListener('click', () => showSlide(currentSlide - 1));
nextBtn.addEventListener('click', () => showSlide(currentSlide + 1));

modal.addEventListener('click', (e) => {
    if (e.target === modal) handleCloseModal();
});

document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;
    if (e.key === 'Escape') handleCloseModal();
    if (e.key === 'ArrowLeft') showSlide(currentSlide - 1);
    if (e.key === 'ArrowRight') showSlide(currentSlide + 1);
});

// ============================================================================
// EVENT HANDLERS - Mobile-Specific
// ============================================================================

if (C.isMobile) {
    // Info icon: toggle footer visibility
    const infoIcon = document.getElementById('info-icon');
    const footer = document.getElementById('footer');
    const scrollbar = document.getElementById('fixed-scrollbar');

    infoIcon.addEventListener('click', (e) => {
        footer.classList.add('active');
        scrollbar.classList.add('footer-visible');
        e.stopPropagation();
    });

    document.addEventListener('click', (e) => {
        if (!footer.contains(e.target) && !infoIcon.contains(e.target)) {
            footer.classList.remove('active');
            scrollbar.classList.remove('footer-visible');
        }
    });

    // Controls FAB: open mobile control panel
    const controlsFab = document.getElementById('controls-fab');
    const controlsPanel = document.getElementById('controls-panel');
    const controlsPanelClose = document.getElementById('controls-panel-close');
    const mobileColorSelect = document.getElementById('mobile-color-select');
    const mobileSearchInput = document.getElementById('mobile-song-search');
    const mobileSearchResults = document.getElementById('mobile-search-results');

    controlsFab.addEventListener('click', (e) => {
        controlsPanel.classList.add('active');
        e.stopPropagation();
    });

    controlsPanelClose.addEventListener('click', () => {
        controlsPanel.classList.remove('active');
    });

    controlsPanel.addEventListener('click', (e) => {
        if (e.target === controlsPanel) {
            controlsPanel.classList.remove('active');
        }
    });

    // Sync mobile color select with desktop
    mobileColorSelect.value = currentColorMode;
    mobileColorSelect.addEventListener('change', function() {
        const value = this.value;
        currentColorMode = value;
        document.getElementById('selectButton').value = value;
        document.getElementById('selectButton').dispatchEvent(new Event('change'));
    });

    // Mobile search functionality
    function handleMobileSearchInput(event) {
        const query = event.target.value.trim().toLowerCase();

        if (query === '') {
            mobileSearchResults.innerHTML = '';
            mobileSearchResults.classList.remove('active');
            return;
        }

        const matches = Array.from(songNameIndex.values())
            .filter(songName => songName.toLowerCase().includes(query))
            .sort()
            .slice(0, 10);

        if (matches.length > 0) {
            mobileSearchResults.innerHTML = matches
                .map(songName => `<div class="search-result-item" data-song="${stripForHTML(songName)}">${songName}</div>`)
                .join('');
            mobileSearchResults.classList.add('active');
        } else {
            mobileSearchResults.innerHTML = '<div class="search-result-item" style="color: #999; cursor: default;">No matches found</div>';
            mobileSearchResults.classList.add('active');
        }
    }

    mobileSearchInput.addEventListener('input', handleMobileSearchInput);

    mobileSearchResults.addEventListener('click', (e) => {
        if (e.target.classList.contains('search-result-item')) {
            const songSlug = e.target.getAttribute('data-song');
            if (songSlug) {
                toggleSelect(songSlug);
                mobileSearchInput.value = '';
                mobileSearchResults.innerHTML = '';
                mobileSearchResults.classList.remove('active');
                controlsPanel.classList.remove('active');
                e.stopPropagation();
            }
        }
    });
}

// ============================================================================
// INITIALIZATION - Data Loading
// ============================================================================

fetch(SHOWS_URL)
    .then(function(response) {
        if (response.status !== 200) {
            console.log('Http response not ok. Status Code: ' + response.status);
            return;
        }
        response.json().then(data => unpackShows(data));
    })
    .catch(function(err) {
        console.log('Fetch Error :-S', err);
    });
