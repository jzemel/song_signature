// CHART RENDERING

import {
    YEARS, MARGINS, PX_PER_MIN, BAR_WIDTH, SET_HEIGHT_MINUTES,
    YEAR_HEIGHT, CHART_WIDTH, CHART_HEIGHT, MISSING_DURATION,
    MISSING_COLOR, E_HEIGHT_MINUTES, BAR_STROKE_COLOR, BAR_STROKE_WIDTH,
    BAR_BORDER_RADIUS, X_SCALE_MIN, X_SCALE_MAX, YEAR_LABEL_OFFSET_X,
    YEAR_LABEL_OFFSET_Y, YEAR_DIVIDER_OFFSET_X, YEAR_DIVIDER_OFFSET_Y,
    YEAR_DIVIDER_COLOR, YEAR_DIVIDER_WIDTH, YEAR_DIVIDER_OPACITY,
    SET_LABEL_OFFSET_X, SET_LABEL_OFFSET_Y
} from './config.js';
import { selectedData, colorFunction } from './state.js';
import { stripForHTML } from './utils.js';
import { handleBarMouseover, handleBarMouseout, handleBarClick, handleBodyClick } from './interactions.js';

// D3 scales
const xScale = d3.scaleLinear().range([0, CHART_WIDTH]).domain([X_SCALE_MIN, X_SCALE_MAX]);

// Chart container and main group
export const chartContainer = d3.select('svg')
    .attr('width', CHART_WIDTH)
    .attr('height', CHART_HEIGHT)
    .style('background-color', '#fafafa');

export const chart = chartContainer.append('g');

// Setup event delegation (only once)
let eventListenersAttached = false;

function attachEventListeners() {
    if (eventListenersAttached) return;

    chart.on('mouseover', handleBarMouseover);
    chart.on('mouseout', handleBarMouseout);
    chart.on('click', handleBarClick);
    d3.select('body').on('click', handleBodyClick);

    eventListenersAttached = true;
}

/**
 * Calculate Y position for a track
 * @param {Object} data - Track data
 * @returns {number} Y coordinate
 */
function calculateY(data) {
    if (data.missing === true) {
        return ((YEARS.indexOf(data.year)) * YEAR_HEIGHT + (data.position - 1) * MISSING_DURATION) * PX_PER_MIN + MARGINS.top;
    }
    return ((YEARS.indexOf(data.year)) * YEAR_HEIGHT + (parseInt(data.set.replace("E", "3")) - 1) * SET_HEIGHT_MINUTES + data.start_time) * PX_PER_MIN + MARGINS.top;
}

// Calculate bar height for a track
// TODO height and y to adjust for 3 set shows and cypress
function calculateHeight(data) {
    const duration = data.missing ? MISSING_DURATION : data.duration;
    return duration * PX_PER_MIN;   
}


/**
 * Render the main chart
 */
export function renderChart() {
    // Attach event listeners on first render
    attachEventListeners();

    // Render bars
    chart.selectAll('.bar')
        .data(selectedData, data => data.track_id)
        .enter()
        .append('rect')
        .attr('name', data => stripForHTML(data.song_name))
        .attr('class', data => stripForHTML(data.song_name))
        .classed('bar', true)
        .attr('id', data => "s" + data.track_id)
        .attr('width', BAR_WIDTH)
        .attr('height', data => calculateHeight(data))
        .attr('duration', data => data.duration)
        .attr('x', data => xScale(data.show_position) + MARGINS.left)
        .attr('y', data => calculateY(data))
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

    chart.selectAll('.bar')
        .data(selectedData, data => data.track_id)
        .exit()
        .remove();
}

/**
 * Render static chart elements (year labels, dividers, etc.)
 * Call this once on initialization
 */
export function renderStaticElements() {
    // Add year divider lines
    chart.selectAll('.year-divider')
        .data(YEARS)
        .enter()
        .append('line')
        .classed('year-divider', true)
        .attr('x1', MARGINS.left + YEAR_DIVIDER_OFFSET_X)
        .attr('x2', CHART_WIDTH)
        .attr('y1', data => ((YEARS.indexOf(data)) * YEAR_HEIGHT * PX_PER_MIN) + MARGINS.top + YEAR_DIVIDER_OFFSET_Y)
        .attr('y2', data => ((YEARS.indexOf(data)) * YEAR_HEIGHT * PX_PER_MIN) + MARGINS.top + YEAR_DIVIDER_OFFSET_Y)
        .style('stroke', YEAR_DIVIDER_COLOR)
        .style('stroke-width', YEAR_DIVIDER_WIDTH)
        .style('opacity', YEAR_DIVIDER_OPACITY);

    // Add year labels
    const yearLabels = chart.selectAll('.year-label-group')
        .data(YEARS)
        .enter()
        .append("g");

    yearLabels
        .append('text')
        .classed('year-label', true)
        .text(data => data)
        .attr('x', MARGINS.left + YEAR_LABEL_OFFSET_X)
        .attr('y', data => ((YEARS.indexOf(data)) * YEAR_HEIGHT * PX_PER_MIN) + YEAR_LABEL_OFFSET_Y)
        .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .style('fill', '#666')
        .style('text-anchor', 'end');

    // Create set labels for each year
    const setLabels = chart.selectAll('.set-label-group')
        .data(YEARS.flatMap(year => [
            { year: year, num: 1, text: "SET 1" },
            { year: year, num: 2, text: "SET 2" },
            { year: year, num: 3, text: "E" }
        ]))
        .enter()
        .append('text')
        .classed('set-label', true)
        .text(data => data.text)
        .attr('x', MARGINS.left + SET_LABEL_OFFSET_X)
        .attr('y', data => ((YEARS.indexOf(data.year)) * YEAR_HEIGHT * PX_PER_MIN + (data.num - 1) * SET_HEIGHT_MINUTES * PX_PER_MIN) + MARGINS.top + SET_LABEL_OFFSET_Y)
        .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('fill', '#999')
        .style('text-anchor', 'end');
}

/**
 * Update bar colors based on current color function
 */
export function updateBarColors() {
    chart.selectAll('.bar')
        .data(selectedData, data => data.track_id)
        .style("fill", data => {
            if (data.missing) {
                return MISSING_COLOR;
            }
            return colorFunction(data);
        });
}
