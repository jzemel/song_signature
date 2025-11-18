let selectedData;
let allTracks;

// LAYOUT PARAMETERS

// TODO replace this with automatic check of running locally or not
const USE_LOCAL_DATA = false;
const SHOWS_URL = USE_LOCAL_DATA 
    ? "/data/shows.json" 
    : "https://jzemel.github.io/song_signature/data/shows.json";

const YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2004, 2003, 2002, 2000, 1999, 1998, 1997, 1996, 1995, 1994, 1993, 1992, 1991, 1990, 1989,1988,1987,1986,1985,1984];
const MARGINS = {top: 55, bottom: 20, left: 90};
const PX_PER_MIN =2;
const BAR_WIDTH = 16;  // Slightly narrower
const GAP_WIDTH = 10;  // Slightly wider gap - not actually used with x scaling
const SET_HEIGHT_MINUTES = 105;
const E_HEIGHT_MINUTES = 35;
const YEAR_HEIGHT = 2 * SET_HEIGHT_MINUTES + E_HEIGHT_MINUTES + 20;
const CHART_WIDTH = 3600;
const CHART_HEIGHT = (YEAR_HEIGHT * YEARS.length)*PX_PER_MIN + 100;


const DEFAULT_COLOR = "#f4a261";  // Softer orange
const SELECTED_COLOR = "#2a9d8f";  // Teal instead of blue
const MISSING_COLOR = "#e9ecef";
const MISSING_DURATION = 8.5; // minutes

// Magic number constants
const BAR_STROKE_COLOR = "#fafafa";
const BAR_STROKE_WIDTH = 1.8;
const BAR_BORDER_RADIUS = 1;
const TOOLTIP_OFFSET_X = 5;
const TOOLTIP_OFFSET_Y = -5;
const TOOLTIP_FADE_DURATION = 200;
const TOOLTIP_SHOW_DURATION = 0.5;
const HIGHLIGHT_DURATION = 50;
const HIGHLIGHT_BRIGHTNESS = 0.85;
const YEAR_DIVIDER_OFFSET_X = -10;
const YEAR_DIVIDER_OFFSET_Y = -15;
const YEAR_DIVIDER_COLOR = '#e0e0e0';
const YEAR_DIVIDER_WIDTH = 1;
const YEAR_DIVIDER_OPACITY = 0.5;
const YEAR_LABEL_OFFSET_X = -15;
const YEAR_LABEL_OFFSET_Y = 20;
const SET_LABEL_OFFSET_X = -15;
const SET_LABEL_OFFSET_Y = 10;
const SEASON_DIVIDER_COLOR = '#d0d0d0';
const SEASON_DIVIDER_OPACITY = 0.4;
const SHOWS_SINCE_PLAYED_DOMAIN_MIN = -20;
const SHOWS_SINCE_PLAYED_DOMAIN_MAX = 80;
const SONG_AGE_DOMAIN_MIN = 0;
const SONG_AGE_DOMAIN_MAX = 20;
const COLOR_SCALE_UNKNOWN = "#e9ecef";
const X_SCALE_MIN = 0;
const X_SCALE_MAX = 140;
const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365;
const SET_MAPPING_ENCORE = "3"; // Maps 'E' to '3' for positioning

const colorOptions = ["None", "Shows Since Played","Song Age"];
let colorFunction = function() { return DEFAULT_COLOR };

const colorShowsSincePlayed = d3.scaleSequential()
    .domain([SHOWS_SINCE_PLAYED_DOMAIN_MIN, SHOWS_SINCE_PLAYED_DOMAIN_MAX])
    .interpolator(d3.interpolateYlGnBu)
    .unknown(COLOR_SCALE_UNKNOWN);

const colorAge = d3.scaleSequential()
    .domain([SONG_AGE_DOMAIN_MIN, SONG_AGE_DOMAIN_MAX])
    .interpolator(d3.interpolateOranges)
    .unknown(COLOR_SCALE_UNKNOWN);

const x = d3.scaleLinear().range([0, CHART_WIDTH]);
x.domain([X_SCALE_MIN, X_SCALE_MAX]);


// OTHER PARAMETERS
let SONG_INDEX = {};
const SHOW_SETS = ["1","2","E"]; //which sets are to be included (hides any set 4s or E2s for simplicity)
//TODO add 3rd set functinoality (and cypress!)



const chartContainer = d3
    .select('svg')
    .attr('width', CHART_WIDTH)
    .attr('height', CHART_HEIGHT)
    .style('background-color', '#fafafa');

const chart = chartContainer.append('g'); //group of chart elements

var TOOLTIP = d3.select(".tooltip-donut")
     .style("opacity", 0)
     .on('click', function(event) {
         // Stop propagation so clicking tooltip doesn't hide it
         event.stopPropagation();
     });

// Track if tooltip is pinned to a selected bar
var pinnedTooltip = null;

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
        ${phishinUrl ? `
        <div class="tooltip-links">
            <a href="${phishinUrl}" target="_blank">Listen</a>
        </div>
        ` : ''}
    `;
}

/**
 * Calculate the Y position for a bar based on track data
 * @param {Object} data - Track data object
 * @returns {number} Y coordinate in pixels
 */
function calculateBarY(data) {
    if (data.missing === true) {
        return ((YEARS.indexOf(data.year)) * YEAR_HEIGHT + (data.position - 1) * MISSING_DURATION) * PX_PER_MIN + MARGINS.top;
    }
    return ((YEARS.indexOf(data.year)) * YEAR_HEIGHT + (parseInt(data.set.replace("E", SET_MAPPING_ENCORE)) - 1) * SET_HEIGHT_MINUTES + data.start_time) * PX_PER_MIN + MARGINS.top;
}

/**
 * Calculate the height for a bar based on track data
 * @param {Object} data - Track data object
 * @returns {number} Height in pixels
 */
function calculateBarHeight(data) {
    const duration = data.missing ? MISSING_DURATION : data.duration;
    return duration * PX_PER_MIN;
}

// Event delegation - attach listeners once to parent chart instead of every bar
chart.on('mouseover', function(event) {
    const target = event.target;
    if (!target.classList.contains('bar')) return;

    // If tooltip is pinned, don't update on hover
    if (pinnedTooltip !== null) return;

    const barElement = d3.select(target);
    const barData = barElement.datum();

    const songName = barElement.attr("name");
    highlight(songName);
    TOOLTIP.transition().duration(TOOLTIP_SHOW_DURATION).style('opacity','1');
    TOOLTIP.style("transform", `translate(${event.clientX + TOOLTIP_OFFSET_X}px, ${event.clientY + TOOLTIP_OFFSET_Y}px)`);

    const tooltipHTML = generateTooltipHTML(barData);
    TOOLTIP.html(tooltipHTML);
});

chart.on('mouseout', function(event) {
    const target = event.target;
    if (!target.classList.contains('bar')) return;

    const barElement = d3.select(target);
    const songName = barElement.attr("name");
    unHighlight(songName);

    // Only hide tooltip if this bar is not selected AND tooltip is not pinned
    if (!barElement.classed('selected') && pinnedTooltip === null) {
        TOOLTIP.transition().duration(TOOLTIP_FADE_DURATION).style('opacity',0);
    }
});

chart.on('click', function(event) {
    const target = event.target;
    if (!target.classList.contains('bar')) return;

    const barElement = d3.select(target);
    const barData = barElement.datum();
    const songName = barElement.attr("name");

    // If clicking an already selected bar, deselect it and hide tooltip
    if (barElement.classed('selected')) {
        toggleSelect(songName);
        TOOLTIP.transition().duration(TOOLTIP_FADE_DURATION).style('opacity',0);
        TOOLTIP.classed('pinned', false);
        pinnedTooltip = null;
    } else {
        // Otherwise select it and keep tooltip visible (pin it)
        toggleSelect(songName);
        TOOLTIP.classed('pinned', true);
        pinnedTooltip = barData.track_id;
    }

    // Stop event from bubbling to body
    event.stopPropagation();
});

const showPromise = fetch(SHOWS_URL)
  .then(
    function(response) {
      if (response.status !== 200) {
        console.log('Http response not ok. Status Code: ' +
          response.status);
        return;
      }

      // Process the response
      response.json().then(data => unpackShows(data));
    }
  )
  .catch(function(err) {
    console.log('Fetch Error :-S', err);
  });

/**
 * Get season information from a date string
 * @param {string} datestr - Date string in YYYY-MM-DD format
 * @returns {Object} Object with season name and index (0-4)
 */
function getSeasonInfo(datestr) {
    const date = new Date(datestr);
    const month = date.getMonth(); // 0-11

    // Winter1: Jan-Feb (months 0-1)
    // Spring: Mar-May (months 2-4)
    // Summer: Jun-Aug (months 5-7)
    // Fall: Sep-Nov (months 8-10)
    // Winter2: Dec (month 11)

    if (month <= 1) return { season: 'winter1', season_index: 0 };
    if (month <= 4) return { season: 'spring', season_index: 1 };
    if (month <= 7) return { season: 'summer', season_index: 2 };
    if (month <= 10) return { season: 'fall', season_index: 3 };
    return { season: 'winter2', season_index: 4 };
}

/**
 * Flatten show data into tracks, build song index, and render chart
 * @param {Object} shows - Shows data object from API
 */
function unpackShows(shows) {
    let maxShows = 1;
    allTracks = [];

    // First pass: collect all tracks with basic info
    const tracksWithDates = [];
    for (i in shows) {
        if(shows[i].tracks[0].show_position > maxShows){
            maxShows=shows[i].tracks[0].show_position;
        }
        shows[i].tracks.forEach((track) => {
            if(SHOW_SETS.includes(track.set)) {
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
                if(song_id in SONG_INDEX){
                    SONG_INDEX[song_id].push(track.show_id);
                } else {
                    SONG_INDEX[song_id] = [track.show_id];
                }
            })
        });
    }

    // Second pass: calculate position within each season
    // Group by year and season, then sort by date
    const seasonPositions = {};

    // Sort all tracks by date
    tracksWithDates.sort((a, b) => new Date(a.datestr) - new Date(b.datestr));

    // Assign positions within each year-season combination
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
 * Render the main chart with bars, labels, and dividers
 */
function renderChart() {

    chart.selectAll('.bar')
        .data(selectedData, data => data.track_id)
        .enter()
        .append('rect')
        .attr('name', (data) => stripForHTML(data.song_name))
        .attr('class', (data) => stripForHTML(data.song_name))
        .classed('bar',true)
        .attr('id', (data) => "s" + data.track_id)
        .attr('width', BAR_WIDTH)
        .attr('height', data => calculateBarHeight(data))
        .attr('duration', data => data.duration)
        .attr('x', data => x(data.show_position) + MARGINS.left)
        .attr('y', data => calculateBarY(data))
        .style("fill", data => {
            if (data.missing) {
                return MISSING_COLOR;
            }
            return colorFunction(data);
        })
        .style("stroke", BAR_STROKE_COLOR)
        .style("stroke-width", BAR_STROKE_WIDTH)
        .attr("rx", BAR_BORDER_RADIUS)
        .attr("ry", BAR_BORDER_RADIUS);

    chart.selectAll('.bar').data(selectedData, data => data.track_id).exit().remove();

    // Click anywhere to hide tooltip and deselect all bars
    d3.select('body').on('click', function() {
        TOOLTIP.transition().duration(TOOLTIP_FADE_DURATION).style('opacity',0);
        TOOLTIP.classed('pinned', false); // Remove pinned class
        pinnedTooltip = null; // Unpin tooltip
        // Deselect all selected bars
        d3.selectAll('.bar.selected').each(function(data) {
            d3.select(this).classed('selected', false).style("fill", () => {
                if (data.missing) {
                    return MISSING_COLOR;
                }
                return colorFunction(data);
            });
        });
    });

    // Calculate season boundaries for dividers
    const seasonBoundaries = [];

    // Group tracks by year and find first show of each season
    YEARS.forEach(year => {
        const yearTracks = selectedData.filter(d => d.year === year);
        if (yearTracks.length === 0) return;

        // Sort by show_position to get chronological order
        yearTracks.sort((a, b) => a.show_position - b.show_position);

        let currentSeason = null;
        let previousTrack = null;

        yearTracks.forEach(track => {
            // When season changes, mark a boundary between previous and current
            if (currentSeason !== null && track.season_index !== currentSeason && previousTrack) {
                // Position halfway between last show of previous season and first show of new season
                // Use center of each bar (left edge + half width)
                const prevX = x(previousTrack.show_position) + MARGINS.left + BAR_WIDTH / 2;
                const currX = x(track.show_position) + MARGINS.left + BAR_WIDTH / 2;
                const midX = (prevX + currX) / 2;

                seasonBoundaries.push({
                    year: year,
                    x: midX,
                    yearIndex: YEARS.indexOf(year)
                });
            }
            currentSeason = track.season_index;
            previousTrack = track;
        });

        // If first show is not winter1 (season_index 0), add divider before first bar
        if (yearTracks.length > 0 && yearTracks[0].season_index > 0) {
            const firstX = x(yearTracks[0].show_position) + MARGINS.left;
            seasonBoundaries.push({
                year: year,
                x: firstX - BAR_WIDTH / 2 - 2,
                yearIndex: YEARS.indexOf(year),
                isStart: true
            });
        }
    });

    // Add season dividers
    chart.selectAll('.season-divider')
        .data(seasonBoundaries)
        .enter()
        .append('line')
        .classed('season-divider', true)
        .attr('x1', d => d.x)
        .attr('x2', d => d.x)
        .attr('y1', d => (d.yearIndex * YEAR_HEIGHT * PX_PER_MIN) + MARGINS.top + YEAR_DIVIDER_OFFSET_Y)
        .attr('y2', d => ((d.yearIndex + 1) * YEAR_HEIGHT * PX_PER_MIN) + MARGINS.top + YEAR_DIVIDER_OFFSET_Y)
        .style('stroke', SEASON_DIVIDER_COLOR)
        .style('stroke-width', 1)
        .style('opacity', SEASON_DIVIDER_OPACITY);

    // Add season labels at the top (for 2025)
    const seasonLabels = [];
    const topYear = YEARS[0]; // 2025
    const topYearTracks = selectedData.filter(d => d.year === topYear);

    if (topYearTracks.length > 0) {
        topYearTracks.sort((a, b) => a.show_position - b.show_position);

        const seasonNames = {
            0: 'WINTER',
            1: 'SPRING',
            2: 'SUMMER',
            3: 'FALL',
            4: 'WINTER'
        };

        let seenSeasons = new Set();
        topYearTracks.forEach(track => {
            if (!seenSeasons.has(track.season_index)) {
                seasonLabels.push({
                    season: seasonNames[track.season_index],
                    x: x(track.show_position) + MARGINS.left
                });
                seenSeasons.add(track.season_index);
            }
        });
    }

    chart.selectAll('.season-label')
        .data(seasonLabels)
        .enter()
        .append('text')
        .classed('season-label', true)
        .text(d => d.season)
        .attr('x', d => d.x)
        .attr('y', MARGINS.top - 25)
        .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
        .style('font-size', '11px')
        .style('font-weight', '500')
        .style('fill', '#999')
        .style('text-anchor', 'start');

    // Add year divider lines
    chart.selectAll('.year-divider')
        .data(YEARS)
        .enter()
        .append('line')
        .classed('year-divider', true)
        .attr('x1', MARGINS.left + YEAR_DIVIDER_OFFSET_X)
        .attr('x2', CHART_WIDTH)
        .attr('y1', data => ((YEARS.indexOf(data))*YEAR_HEIGHT*PX_PER_MIN) + MARGINS.top + YEAR_DIVIDER_OFFSET_Y)
        .attr('y2', data => ((YEARS.indexOf(data))*YEAR_HEIGHT*PX_PER_MIN) + MARGINS.top + YEAR_DIVIDER_OFFSET_Y)
        .style('stroke', YEAR_DIVIDER_COLOR)
        .style('stroke-width', YEAR_DIVIDER_WIDTH)
        .style('opacity', YEAR_DIVIDER_OPACITY);

    var yearLabels = chart.selectAll('.label')
        .data(YEARS)
        .enter()
        .append("g");
    
    yearLabels
        .append('text')
        .classed('year-label', true)
        .text((data) => data)
        .attr('x', MARGINS.left + YEAR_LABEL_OFFSET_X)
        .attr('y', data => ((YEARS.indexOf(data))*YEAR_HEIGHT*PX_PER_MIN) + YEAR_LABEL_OFFSET_Y)
        .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
        .style('font-size', '16px')
        .style('font-weight', '600')  // Semi-bold instead of bold
        .style('fill', '#666')  // Gray instead of blue
        .style('text-anchor', 'end');
    
    // Create set labels for each year
    var setLabels = chart.selectAll('.set-label-group')
        .data(YEARS.flatMap(year => 
            [{'year': year, 'num': 1, 'text': "SET 1"},
             {'year': year, 'num': 2, 'text': "SET 2"}, 
             {'year': year, 'num': 3, 'text': "E"}]))
        .enter()
        .append('text')
        .classed('set-label', true)
        .text(data => data.text)
        .attr('x', MARGINS.left + SET_LABEL_OFFSET_X)
        .attr('y', data => ((YEARS.indexOf(data.year))*YEAR_HEIGHT*PX_PER_MIN + (data.num-1)*SET_HEIGHT_MINUTES * PX_PER_MIN) + MARGINS.top + SET_LABEL_OFFSET_Y)
        .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
        .style('font-size', '12px')
        .style('font-weight', '500')  // Regular weight
        .style('fill', '#999')  // Lighter gray
        .style('text-anchor', 'end');
}

/**
 * Filter tracks to only shows containing specified songs
 * @param {Array} songIDs - Array of song IDs to filter by
 */
function filterTo(songIDs) {
    selectedShows = [];
    songIDs.forEach(s => selectedShows = selectedShows.concat(SONG_INDEX[s]));
    selectedData = allTracks.filter((track) => selectedShows.includes(track.show_id));
}

/**
 * Find a track by its ID
 * @param {string} id - Track ID to find
 * @returns {Object|undefined} The track object or undefined if not found
 */
function getTrackByID(id){
    for (let i = 0; i < selectedData.length; i++){
        if (selectedData[i].track_id === id){
            return selectedData[i];
        }
    }
}

d3.select("#selectButton")
    .selectAll('showOptions')
    .data(colorOptions)
    .enter()
    .append('option')
    .text((data) => data)
    .attr('value',(data) => data);

d3.select("#selectButton").on("change",function(d) {
    let selectedFunction = d3.select(this).property("value");
    //selectedData = DUMMY_TRACKS.filter(d => d.name != selectedSong);
    switch(selectedFunction) {
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
                return colorAge(Age(track));
            };
            break;
        case "None":
            colorFunction = function() { return DEFAULT_COLOR };
    }

    chart.selectAll('.bar')
        .data(selectedData, data => data.track_id)
        .style("fill", data => {
            if (data.missing) {
                return MISSING_COLOR;
            }
            return colorFunction(data);
        });
    });

/**
 * Highlight all bars with the same song name
 * @param {string} className - Sanitized song name used as class
 */
function highlight(className) {
    d3.selectAll("." + className)
        .transition()
        .duration(HIGHLIGHT_DURATION)
        .style('fill', function(data) {
            // Don't brighten missing tracks
            // if (data.missing) {
            //     return MISSING_COLOR;
            // }
            const currentColor = d3.select(this).style('fill');
            return d3.color(currentColor).brighter(HIGHLIGHT_BRIGHTNESS);
        });
}

/**
 * Toggle selection state for all bars with the same song name
 * @param {string} className - Sanitized song name used as class
 */
function toggleSelect(className) {
    if (d3.selectAll("." + className).classed('selected')) {
        d3.selectAll("." + className).classed('selected', false).style("fill", data => {
            if (data.missing) {
                return MISSING_COLOR;
            }
            return colorFunction(data);
        });
    } else {
        d3.selectAll("." + className).classed('selected', true).style("fill", SELECTED_COLOR);
    }
}

/**
 * Remove highlight from all bars with the same song name
 * @param {string} className - Sanitized song name used as class
 */
function unHighlight(className) {
    d3.selectAll("." + className)
        .transition()
        .duration(HIGHLIGHT_DURATION)
        .style('fill', function(data) {
            // Check if this element is selected
            const isSelected = d3.select(this).classed('selected');
            if (isSelected) {
                return SELECTED_COLOR;
            } else if (data.missing) {
                return MISSING_COLOR;
            } else {
                return colorFunction(data);
            }
        });
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
 * Calculate the age of a song in years
 * @param {Object} track - Track object with first_date_played property
 * @returns {number} Age in years
 */
function Age(track){
    const age_ms = Date.now() - new Date(track.first_date_played);
    return age_ms / MS_PER_YEAR;
}