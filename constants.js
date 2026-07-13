// Mobile detection
export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Magic phish knowledge constants
export const YEARS_ALL = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2004, 2003, 2002, 2000, 1999, 1998, 1997, 1996, 1995, 1994, 1993, 1992, 1991, 1990, 1989, 1988, 1987, 1986, 1985, 1984];
export const CHUNK_YEARS = {
    '1.0': [2000, 1999, 1998, 1997, 1996, 1995, 1994, 1993, 1992, 1991, 1990, 1989, 1988, 1987, 1986, 1985, 1984, 1983],
    '2.0': [2004, 2003, 2002],
    '3.0': [2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009],
    '4.0': [2026, 2025, 2024, 2023, 2022, 2021],
    'all': YEARS_ALL
};

// Load appropriate chunk based on device
export const CHUNK_VERSION = isMobile ? '4.0' : 'all';
export const YEARS = CHUNK_YEARS[CHUNK_VERSION];
export const SHOW_SETS = ["1","2", "3", "E"]; //which sets are to be included (hides any set 4s or E2s for simplicity)

// Scale for 3-set shows that need vertical compression to fit standard bounds
export const THREE_SET_SCALE = 0.7;

export const SHOW_SCALE_OVERRIDES = {
    // Special cases
    '1999-12-31': 0.45,  // Extra long NYE show
    '2024-08-16': 0.95,
    '2024-04-18': 0.95,

    // NYE, Halloween, other 3-set shows
    ...Object.fromEntries([
        '2025-12-31', '2024-12-31', '2023-12-31', '2022-04-22', '2022-12-31', '2021-10-31', '2021-12-31',
        '2019-12-31', '2018-12-31', '2018-10-31', '2017-12-31', '2016-12-31', '2016-10-31',
        '2015-08-22', '2015-12-31', '2014-12-31', '2014-10-31', '2013-12-31', '2013-10-31',
        '2013-07-20', '2012-12-31', '2011-12-31', '2011-07-02', '2010-12-31', '2010-10-31',
        '2009-12-31', '2009-10-31', '2009-11-01', '2004-08-15', '2004-08-14', '2003-12-31',
        '2003-08-03', '2003-08-02', '2002-12-31', '1999-12-30', '1999-07-18', '1998-12-31',
        '1998-10-31', '1998-08-16', '1998-08-15', '1997-08-17', '1997-08-16', '1997-12-31',
        '1996-12-31', '1996-10-31', '1996-08-17', '1996-08-16', '1995-12-31', '1995-10-31',
        '1994-12-31', '1994-10-31', '1993-12-31', '1992-12-31', '1991-12-31', '1991-08-03',
        '1991-07-14', '1990-06-16'
    ].map(date => [date, THREE_SET_SCALE]))
};

// Layout parameters
export const MARGINS = {top: 55, bottom: 20, left: 60};
export const PX_PER_MIN = 2;
export const BAR_WIDTH = isMobile ? 20 : 16; // Wider on mobile for easier tapping
export const GAP_WIDTH = 10; // Not currently used with x scaling
export const SET_HEIGHT_MINUTES = 105;
export const E_HEIGHT_MINUTES = 35;
export const YEAR_HEIGHT = 2 * SET_HEIGHT_MINUTES + E_HEIGHT_MINUTES + 20;
export const CHART_WIDTH = 3600;
export const CHART_HEIGHT = (YEAR_HEIGHT * YEARS.length) * PX_PER_MIN + 100;

// Sticky element positioning (matches CSS values)
export const CONTROLS_HEIGHT = 80; // Approximate height of controls sticky element
export const CONTROLS_PADDING_BOTTOM = 10; // Padding below controls
export const STICKY_SEASON_LABELS_TOP = CONTROLS_HEIGHT + CONTROLS_PADDING_BOTTOM; // 90px - positions below controls
export const STICKY_SEASON_LABELS_HEIGHT = 30;
export const CHART_WRAPPER_MARGIN_TOP = -MARGINS.top; // -55px - pull chart up to align with sticky labels

// Colors
export const DEFAULT_COLOR = "#f4a261";  // Softer orange
export const MISSING_COLOR = "#e9ecef";
export const MISSING_DURATION = 8.5; // minutes

// Color mode-specific highlight and selected colors
export const COLOR_MODE_STYLES = {
    "None": {
        highlight: "#ffdb83",  // Brightened orange (matches old brighten effect)
        selected: "#2589BD"    // Ocean blue
    },
    "Shows Since Played": {
        highlight: "#ff1493",  // Deep pink (outside YlGnBu gradient)
        selected: "#91171F"    // Deep crimson
    },
    "Song Age": {
        highlight: "#00d4ff",  // Bright cyan (outside Oranges gradient)
        selected: "#0099ff"    // Vivid blue
    },
    "Likes": {
        highlight: "#F39C6B",  // Tangerine dream (outside Purples gradient)
        selected: "#DD8E61"    // Toasted almond (alt: FFF05A, 482728)
    },
    "Length vs Typical": {
        highlight: "#00ff88",  // Bright green (outside blue-red gradient)
        selected: "#006644"    // Dark green
    }
};

// Magic number constants
export const BAR_STROKE_COLOR = "#fafafa";
export const BAR_STROKE_WIDTH = 1.8;
export const BAR_BORDER_RADIUS = 1;
export const TOOLTIP_OFFSET_X = 5;
export const TOOLTIP_OFFSET_Y = -5;
export const TOOLTIP_FADE_DURATION = 200;
export const TOOLTIP_SHOW_DURATION = 50;
export const HIGHLIGHT_DURATION = 0;
export const YEAR_DIVIDER_OFFSET_X = -10;
export const YEAR_DIVIDER_OFFSET_Y = -15;
export const YEAR_DIVIDER_COLOR = '#e0e0e0';
export const YEAR_DIVIDER_WIDTH = 1;
export const YEAR_DIVIDER_OPACITY = 0.5;
export const YEAR_LABEL_OFFSET_X = -15;
export const YEAR_LABEL_OFFSET_Y = 20;
export const SET_LABEL_OFFSET_X = -15;
export const SET_LABEL_OFFSET_Y = 10;
export const SEASON_DIVIDER_COLOR = '#d0d0d0';
export const SEASON_DIVIDER_OPACITY = 0.4;
export const SHOWS_SINCE_PLAYED_DOMAIN_MIN = -20;
export const SHOWS_SINCE_PLAYED_DOMAIN_MAX = 80;
export const SONG_AGE_DOMAIN_MIN = 0;
export const SONG_AGE_DOMAIN_MAX = 20;
export const LIKES_COUNT_DOMAIN_MIN = -25;
export const LIKES_COUNT_DOMAIN_MAX = 55;
export const COLOR_SCALE_UNKNOWN = "#e9ecef";
export const X_SCALE_MIN = 0;
export const X_SCALE_MAX = 140;
export const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365;

export const LENGTH_VS_TYPICAL_DOMAIN_MIN = -3;
export const LENGTH_VS_TYPICAL_DOMAIN_MAX = 4;

export const colorOptions = ["Shows Since Played", "Song Age", "Likes", "Length vs Typical", "None"];
