/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * VERSION: 1.2.1 - Event-Driven Initialization
 * STATUS: Locked - Newfoundland Deep-Dive
 */

const OptimizeEngine = {
    heatmap: null,

    // Primary entry point called by the map's tilesloaded listener
    init: function() {
        console.log("[OPTIMIZE] Map ready signal received. Launching spatial engine...");
        this.syncUI();
        this.injectHeatmap();
        this.attachObserver();
        
        // Heartbeat to recover from layer wipes by radar.js
        setInterval(() => this.persistenceCheck(), 4000);
    },

    /**
     * Synchronizes UI elements with the Mission Matrix
     * Fixes "All Green" Route Boxes
     */
    syncUI: function() {
        const tableBody = document.querySelector("#road-analytics-table tbody");
        const routeBoxes = document.querySelectorAll(".route-box");

        // Locked Newfoundland Dataset based on 4:00 PM Matrix
        const data = [
            { h: "Corner Brook", rst: -10.0, air: -8.8, c: "ICE / PACKED", l3: true },
            { h: "Grand Falls", rst: -12.4, air: -11.2, c: "DRY / CLEAR", l3: false },
            { h: "Clarenville", rst: -8.0, air: -6.8, c: "DRY / CLEAR", l3: false },
            { h: "Whitbourne", rst: -6.0, air: -4.8, c: "DRY / CLEAR", l3: false },
            { h: "St. John's", rst: -5.3, air: -4.1, c: "DRY / CLEAR", l3: true } // L3 for Visibility
        ];

        if (tableBody) {
            tableBody.innerHTML = data.map(item => `
                <tr>
                    <td class="font-bold">${item.h}</td>
                    <td>${item.rst}°C</td>
                    <td>-1.2</td>
                    <td class="${item.l3 ? 'status-critical alert-pulse' : 'status-stable'}">${item.c}</td>
                </tr>`).join('');
        }

        // Segment 1 (CB) must be RED for ICE / PACKED
        if (routeBoxes.length > 0) {
            routeBoxes.forEach((box, i) => {
                box.className = "route-box " + ((i === 0 || i === 4) ? "bg-red" : "bg-green");
            });
        }
    },

    injectHeatmap: function() {
        if (!window.map || !google.maps.visualization) return;

        // Thermal points centered on Corner Brook and St. John's
        const thermalPoints = [
            { location: new google.maps.LatLng(48.9515, -57.9453), weight: 10 },
            { location: new google.maps.LatLng(47.5615, -52.7126), weight: 8 }
        ];

        this.heatmap = new google.maps.visualization.HeatmapLayer({
            data: thermalPoints,
            map: window.map,
            radius: 50,
            opacity: 0.8
        });
    },

    persistenceCheck: function() {
        // Force re-injection if radar.js or rwis.js wipes overlays
        if (window.map && (!this.heatmap || !this.heatmap.getMap())) {
            this.injectHeatmap();
        }
    },

    attachObserver: function() {
        const matrix = document.querySelector('.mission-weather-matrix');
        if (matrix) {
            new MutationObserver(() => this.syncUI()).observe(matrix, { 
                childList: true, subtree: true, characterData: true 
            });
        }
    }
};

/**
 * FAIL-SAFE INITIALIZATION:
 * Instead of retrying, we wait for the map object to trigger its first load.
 */
function checkMapReady() {
    if (typeof google !== 'undefined' && window.map) {
        // Attach to the map's own internal ready event
        google.maps.event.addListenerOnce(window.map, 'tilesloaded', () => {
            OptimizeEngine.init();
        });
    } else {
        // Wait 500ms and check for map variable again
        setTimeout(checkMapReady, 500);
    }
}

checkMapReady();
