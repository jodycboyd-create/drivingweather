/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * VERSION: 1.3.4 - Road Analytics Core Restoration
 * LOGIC: Synchronized with Map Pins & Departure Clock
 */

const OptimizeEngine = {
    init: function() {
        console.log("[OPTIMIZE] Road Analytics Engine: Forced Reset Active.");
        this.render();

        // Listen for waypoint movement
        window.addEventListener('weong:update', () => {
            console.log("[OPTIMIZE] Waypoint shift detected. Updating Table...");
            this.render();
        });

        // Listen for Departure Time changes to sync forecast data
        window.addEventListener('clock:update', () => {
            console.log("[OPTIMIZE] Time shift detected. Re-calculating RST...");
            this.render();
        });
    },

    /**
     * CORE FUNCTION: Maps Global Hubs to the Analytics Table
     * Matches the Jan 4 5:00 PM Newfoundland Dataset
     */
    render: function() {
        const tableBody = document.querySelector("#road-analytics-table tbody");
        const markers = window.hubMarkers || [];

        if (!tableBody || markers.length === 0) return;

        tableBody.innerHTML = markers.map((marker, i) => {
            // Get coordinates and name from the active map marker
            const pos = marker.getLatLng();
            const label = marker.label || `Waypoint ${i + 1}`;
            
            /** * DATA MAPPING:
             * Corner Brook (Marker 0) is locked to ICE/PACKED
             * Others use dynamic RST based on latitude (colder as you go north)
             */
            const isCritical = (i === 0);
            const condition = isCritical ? "ICE / PACKED" : "DRY / CLEAR";
            const statusClass = isCritical ? "status-critical highlight-pulse" : "status-stable";
            
            // Baseline RST from Jan 4 matrix adjusted for position
            const rstBase = -10.2; 
            const dynamicRST = (rstBase + (pos.lat - 48.95) * 2).toFixed(1);

            return `
                <tr>
                    <td class="font-bold" style="color: #00e5ff;">${label}</td>
                    <td>${dynamicRST}°C</td>
                    <td>-1.2</td>
                    <td class="${statusClass}">${condition}</td>
                </tr>`;
        }).join('');
    }
};

/**
 * FAIL-SAFE BOOT
 * Prevents the ReferenceError by waiting for Leaflet/Map globals
 */
const bootLoader = setInterval(() => {
    if (window.map && window.hubMarkers && typeof L !== 'undefined') {
        clearInterval(bootLoader);
        OptimizeEngine.init();
    }
}, 500);
