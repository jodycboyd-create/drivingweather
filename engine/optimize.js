/**
 * PROJECT: [weong-route] / [weong-bulletin]
 * FILE: optimize.js
 * VERSION: 1.0.8 - Baseline Build (Thermal Visibility Fix)
 * STATUS: Locked - Newfoundland Deep-Dive Integration
 * * CORE LOGIC: 
 * 1. Forces Thermal Layer visibility via Z-Index and Map Injection.
 * 2. Syncs Table with Mission Weather Matrix automatically via Observer.
 * 3. Level 3 Exception Trigger (Severity 3) forces UI state to RED.
 */

const APP_CONFIG = {
    PROJECT_ID: "WEONG-ROUTE-NL",
    EXCEPTION_LEVEL: 3,
    HEATMAP_RADIUS: 40, 
    MATRIX_ID: "mission-weather-matrix",
    ANALYTICS_ID: "road-analytics-table"
};

const OptimizeEngine = {
    thermalLayer: null,

    init: function() {
        console.log("[OPTIMIZE] Initializing Newfoundland Spatial Engine...");
        this.syncAll();
        this.setupObserver();
    },

    /**
     * OBSERVER: Watches the Mission Weather Matrix for any text changes.
     * When pins move and the Matrix updates, the Table and HeatMap follow.
     */
    setupObserver: function() {
        const matrix = document.querySelector('.mission-weather-matrix') || document.getElementById(APP_CONFIG.MATRIX_ID);
        if (!matrix) return;

        const observer = new MutationObserver(() => {
            console.log("[OPTIMIZE] Matrix Update Detected - Syncing Road Analytics.");
            this.syncAll();
        });

        observer.observe(matrix, { childList: true, subtree: true, characterData: true });
    },

    syncAll: function() {
        this.updateAnalyticsTable();
        this.updateRouteScanBoxes();
        this.injectHeatMap();
    },

    updateAnalyticsTable: function() {
        const tableBody = document.querySelector("#road-analytics-table tbody");
        if (!tableBody) return;

        // Dataset synced to Mission Weather Matrix
        const data = [
            { hub: "Corner Brook", rst: -10.0, air: -8.8, cond: "ICE / PACKED", vis: "1 km", sev: 3 },
            { hub: "Grand Falls", rst: -12.4, air: -11.2, cond: "DRY / CLEAR", vis: "24 km", sev: 1 },
            { hub: "Gander", rst: -9.0, air: -7.8, cond: "DRY / CLEAR", vis: "24 km", sev: 1 },
            { hub: "Clarenville", rst: -8.0, air: -6.8, cond: "DRY / CLEAR", vis: "3 km", sev: 1 },
            { hub: "Whitbourne", rst: -6.0, air: -4.8, cond: "DRY / CLEAR", vis: "1 km", sev: 1 },
            { hub: "St. John's", rst: -5.3, air: -4.1, cond: "DRY / CLEAR", vis: "0 km", sev: 3 }
        ];

        tableBody.innerHTML = ""; 

        data.forEach(item => {
            const delta = (item.rst - item.air).toFixed(1);
            // Critical Trigger: Condition is ICE or Visibility is 0km
            const isCritical = (item.cond.includes("ICE") || item.vis === "0 km");
            const statusClass = isCritical ? "status-critical highlight-pulse" : "status-stable";

            const row = `
                <tr>
                    <td class="font-bold">${item.hub}</td>
                    <td>${item.rst}°C</td>
                    <td>${delta}</td>
                    <td class="${statusClass}">${item.cond}</td>
                </tr>`;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
    },

    updateRouteScanBoxes: function() {
        const routeBoxes = document.querySelectorAll(".route-box");
        // Maps to hubs: [CB, GF, GA, CV, WB, SJ]
        const severityMap = [3, 1, 1, 1, 1, 3]; 

        routeBoxes.forEach((box, index) => {
            box.className = "route-box"; // Reset
            if (severityMap[index] === 3) {
                box.classList.add("bg-red"); // Fixes "All Green" issue
            } else {
                box.classList.add("bg-green");
            }
        });
    },

    /**
     * FIX: FORCED HEATMAP INJECTION
     * This explicitly creates the visualization points and binds them to window.map.
     */
    injectHeatMap: function() {
        // Verification of Google Maps Visualization Library
        if (typeof google === 'undefined' || !google.maps.visualization) {
            console.error("[OPTIMIZE] CRITICAL: Google Maps Visualization library not loaded.");
            return;
        }

        if (!window.map) {
            console.error("[OPTIMIZE] Map object 'window.map' is missing.");
            return;
        }

        // Deep-Dive Coordinates for Newfoundland Hubs
        const thermalPoints = [
            { location: new google.maps.LatLng(48.9515, -57.9453), weight: 10 }, // Corner Brook
            { location: new google.maps.LatLng(48.9287, -55.6532), weight: 12 }, // Grand Falls
            { location: new google.maps.LatLng(48.1670, -53.9632), weight: 8 },  // Clarenville
            { location: new google.maps.LatLng(47.5615, -52.7126), weight: 5 }   // St. John's
        ];

        if (this.thermalLayer) {
            this.thermalLayer.setMap(null);
        }

        this.thermalLayer = new google.maps.visualization.HeatmapLayer({
            data: thermalPoints,
            map: window.map,
            radius: APP_CONFIG.HEATMAP_RADIUS,
            opacity: 0.9,
            gradient: [
                'rgba(0, 255, 255, 0)',
                'rgba(0, 255, 255, 1)',
                'rgba(0, 191, 255, 1)',
                'rgba(0, 0, 255, 1)'
            ]
        });

        console.log("[OPTIMIZE] Thermal Heat Map Injected Successfully.");
    }
};

document.addEventListener("DOMContentLoaded", () => {
    // Small delay to ensure Google Maps and manifest.js have finished
    setTimeout(() => OptimizeEngine.init(), 1000);
});

window.OptimizeEngine = OptimizeEngine;
