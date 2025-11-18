// USER INTERACTION HANDLERS

import { HIGHLIGHT_DURATION, HIGHLIGHT_BRIGHTNESS, MISSING_COLOR, SELECTED_COLOR } from './config.js';
import { pinnedTooltip, setPinnedTooltip, selectedData, colorFunction } from './state.js';
import { generateTooltipHTML, showTooltip, hideTooltip, pinTooltip, unpinTooltip } from './tooltip.js';
import { stripForHTML } from './utils.js';

/**
 * Handle mouseover event on bars
 * @param {Event} event - Mouse event
 */
export function handleBarMouseover(event) {
    const target = event.target;
    if (!target.classList.contains('bar')) return;

    // If tooltip is pinned, don't update on hover
    if (pinnedTooltip !== null) return;

    const barElement = d3.select(target);
    const barData = barElement.datum();

    const songName = barElement.attr("name");
    highlight(songName);

    const html = generateTooltipHTML(barData);
    showTooltip(event.clientX, event.clientY, html);
}

/**
 * Handle mouseout event on bars
 * @param {Event} event - Mouse event
 */
export function handleBarMouseout(event) {
    const target = event.target;
    if (!target.classList.contains('bar')) return;

    const barElement = d3.select(target);
    const songName = barElement.attr("name");
    unHighlight(songName);

    // Only hide tooltip if this bar is not selected AND tooltip is not pinned
    if (!barElement.classed('selected') && pinnedTooltip === null) {
        hideTooltip();
    }
}

/**
 * Handle click event on bars
 * @param {Event} event - Mouse event
 */
export function handleBarClick(event) {
    const target = event.target;
    if (!target.classList.contains('bar')) return;

    const barElement = d3.select(target);
    const barData = barElement.datum();
    const songName = barElement.attr("name");

    // If clicking an already selected bar, deselect it and hide tooltip
    if (barElement.classed('selected')) {
        toggleSelect(songName);
        hideTooltip();
        unpinTooltip();
        setPinnedTooltip(null);
    } else {
        // Otherwise select it and keep tooltip visible (pin it)
        toggleSelect(songName);
        pinTooltip();
        setPinnedTooltip(barData.track_id);
    }

    // Stop event from bubbling to body
    event.stopPropagation();
}

/**
 * Handle click on body (deselect all)
 */
export function handleBodyClick() {
    hideTooltip();
    unpinTooltip();
    setPinnedTooltip(null);

    // Deselect all selected bars
    d3.selectAll('.bar.selected').each(function(data) {
        d3.select(this).classed('selected', false).style("fill", () => {
            if (data.missing) {
                return MISSING_COLOR;
            }
            return colorFunction(data);
        });
    });
}

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
            if (data.missing) {
                return MISSING_COLOR;
            }
            const currentColor = d3.select(this).style('fill');
            return d3.color(currentColor).brighter(HIGHLIGHT_BRIGHTNESS);
        });
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
                return SELECTED_COLOR; // Keep selected color if selected
            } else if (data.missing) {
                return MISSING_COLOR; // Keep missing color for missing tracks
            } else {
                return colorFunction(data); // Otherwise restore original
            }
        });
}

/**
 * Toggle selection state for all bars with the same song name
 * @param {string} className - Sanitized song name used as class
 */
function toggleSelect(className) {
    if (d3.selectAll("." + className).classed('selected')) {
        d3.selectAll("." + className)
            .classed('selected', false)
            .style("fill", data => {
                if (data.missing) {
                    return MISSING_COLOR;
                }
                return colorFunction(data);
            });
    } else {
        d3.selectAll("." + className)
            .classed('selected', true)
            .style("fill", SELECTED_COLOR);
    }
}
