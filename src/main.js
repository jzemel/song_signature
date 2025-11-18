// MAIN ENTRY POINT

import { COLOR_OPTIONS, DEFAULT_COLOR } from './config.js';
import { setColorFunction } from './state.js';
import { fetchShowData } from './dataLoader.js';
import { renderChart, renderStaticElements, updateBarColors, chart } from './rendering.js';
import { calculateSongAge } from './utils.js';

// Initialize color scales
const colorShowsSincePlayed = d3.scaleSequential()
    .domain([-20, 80])
    .interpolator(d3.interpolateYlGnBu)
    .unknown("#e9ecef");

const colorAge = d3.scaleSequential()
    .domain([0, 20])
    .interpolator(d3.interpolateOranges)
    .unknown("#e9ecef");

// Set initial color function
setColorFunction(() => DEFAULT_COLOR);

// Populate color dropdown
d3.select("#selectButton")
    .selectAll('option')
    .data(COLOR_OPTIONS)
    .enter()
    .append('option')
    .text(data => data)
    .attr('value', data => data);

// Handle color selection change
d3.select("#selectButton").on("change", function() {
    const selectedOption = d3.select(this).property("value");

    switch(selectedOption) {
        case "Shows Since Played":
            setColorFunction(track => colorShowsSincePlayed(track.shows_since_played));
            break;
        case "Song Age":
            setColorFunction(track => colorAge(calculateSongAge(track)));
            break;
        case "None":
        default:
            setColorFunction(() => DEFAULT_COLOR);
    }

    updateBarColors();
});

// Initialize application
async function init() {
    try {
        await fetchShowData();
        renderStaticElements();
        renderChart();
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
}

// Start the application
init();
