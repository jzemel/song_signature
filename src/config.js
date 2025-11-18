// CONFIGURATION AND CONSTANTS

// Data source configuration
export const USE_LOCAL_DATA = false;
export const SHOWS_URL = USE_LOCAL_DATA
    ? "/data/shows.json"
    : "https://jzemel.github.io/song_signature/data/shows.json";

// Year range for visualization
export const YEARS = [
    2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016,
    2015, 2014, 2013, 2012, 2011, 2010, 2009, 2004, 2003, 2002,
    2000, 1999, 1998, 1997, 1996, 1995, 1994, 1993, 1992, 1991,
    1990, 1989, 1988, 1987, 1986, 1985, 1984
];

// Layout dimensions
export const MARGINS = { top: 55, bottom: 20, left: 90 };
export const PX_PER_MIN = 2;
export const BAR_WIDTH = 18;
export const GAP_WIDTH = 15;
export const SET_HEIGHT_MINUTES = 105;
export const E_HEIGHT_MINUTES = 35;
export const YEAR_HEIGHT = 2 * SET_HEIGHT_MINUTES + E_HEIGHT_MINUTES + 20;
export const CHART_WIDTH = 4200;
export const CHART_HEIGHT = (YEAR_HEIGHT * YEARS.length) * PX_PER_MIN + 100;

// Color scheme
export const DEFAULT_COLOR = "#f4a261";
export const SELECTED_COLOR = "#2a9d8f";
export const MISSING_COLOR = "#e9ecef";

// Track configuration
export const MISSING_DURATION = 8.5; // minutes
export const SHOW_SETS = ["1", "2", "E"]; // which sets are to be included

// Color options for dropdown
export const COLOR_OPTIONS = ["None", "Shows Since Played", "Song Age"];

// Interaction constants
export const TOOLTIP_OFFSET_X = 5;
export const TOOLTIP_OFFSET_Y = -5;
export const TOOLTIP_FADE_DURATION = 200;
export const HIGHLIGHT_DURATION = 50;
export const HIGHLIGHT_BRIGHTNESS = 0.7;
