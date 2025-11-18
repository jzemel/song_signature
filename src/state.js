// APPLICATION STATE MANAGEMENT

// Track data
export let allTracks = [];
export let selectedData = [];

// Song index for filtering
export const songIndex = new Map();

// Tooltip state
export let pinnedTooltip = null;

// Color function (defaults to returning default color)
export let colorFunction = null;

// Setters for state that needs to be updated
export function setAllTracks(tracks) {
    allTracks = tracks;
}

export function setSelectedData(data) {
    selectedData = data;
}

export function setPinnedTooltip(trackId) {
    pinnedTooltip = trackId;
}

export function setColorFunction(fn) {
    colorFunction = fn;
}
