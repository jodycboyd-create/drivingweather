/**
 * PROJECT: [weong-route] / [weong-bulletin]
 * FILE: optimize.js
 * VERSION: 1.0.9 - Baseline Build (Forced Overlay)
 * STATUS: Locked - Newfoundland Deep-Dive Integration
 */

const APP_CONFIG = {
    PROJECT_ID: "WEONG-ROUTE-NL",
    HEATMAP_RADIUS: 50,
    MATRIX_ID: "mission-weather-matrix"
};

const OptimizeEngine = {
    thermalLayer: null,

    init: function() {
        console.log("[OPTIMIZE] Forcing Heat Map Overlay...");
        this.syncAll();
        this.setupObserver();
    },

    setupObserver: function() {
        const matrix = document.querySelector('.mission-weather-matrix');
        if (!matrix) return;
        // Watch for pin movements updating the matrix text
        const observer = new MutationObserver(() => this.syncAll());
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

        // Population for all 6 active hubs
        const data = [
            { hub: "Corner Brook", rst: -10.0, air: -8.8, cond: "ICE / PACKED", vis: "1 km" },
            { hub: "Grand Falls", rst: -12.4, air: -11.2, cond: "DRY / CLEAR", vis: "24 km" },
            { hub: "Gander", rst: -9.0, air: -7.8, cond: "DRY / CLEAR", vis: "24 km" },
            { hub: "Clarenville", rst: -8.0, air: -6.8, cond: "DRY / CLEAR", vis: "3 km" },
            { hub: "Whitbourne", rst: -6.0, air: -4.8, cond: "DRY / CLEAR", vis: "1 km" },
            { hub: "St. John's", rst: -5.3, air: -4.1, cond: "DRY / CLEAR", vis: "0 km" }
        ];

        tableBody.innerHTML = data.map(item => {
            const delta = (item.rst - item.air).toFixed(1);
            const isCrit = item.cond.includes("ICE") || item.vis === "0 km";
            return `<tr>
                <td class="font-bold">${item.hub}</td>
                <td>${item.rst}°C</td>
                <td>${delta}</td>
                <td class="${isCrit ? 'status-critical' : 'status-stable'}">${item.cond}</td>
            </tr>`;
        }).join('');
    },

    updateRouteScanBoxes: function() {
        const boxes = document.querySelectorAll(".route-box");
        // Logic: Hub 1 (CB) and Hub 6 (SJ) are Level 3 triggers
        const states = [3, 1, 1, 1, 1, 3]; 
        boxes.forEach((box, i) => {
            box.className = "route-box " + (states[i] === 3 ? "bg-red" : "bg-green");
        });
    },

    injectHeatMap: function() {
        // ERROR TRAP 1: Visualization Library Check
        if (typeof google === 'undefined' || !google.maps.visualization) {
            console.error("HEATMAP ERROR: Missing '&libraries=visualization' in Google Maps Script tag.");
            return;
        }

        // ERROR TRAP 2: Map Object Check
        if (!window.map) return;

        const points = [
            { location: new google.maps.LatLng(48.9515, -57.9453), weight: 10 },
            { location: new google.maps.LatLng(48.9287, -55.6532), weight: 12 },
            { location: new google.maps.LatLng(48.1670, -53.9632), weight: 8 },
            { location: new google.maps.LatLng(47.5615, -52.7126), weight: 5 }
        ];

        if (this.thermalLayer) this.thermalLayer.setMap(null);

        this.thermalLayer = new google.maps.visualization.HeatmapLayer({
            data: points,
            map: window.map,
            radius: APP_CONFIG.HEATMAP_RADIUS,
            opacity: 1.0 // Maximum opacity to fight radar overlays
        });
    }
};

// INITIALIZATION: Wait for radar.js and other engines to finish
window.addEventListener('load', () => {
    setTimeout(() => OptimizeEngine.init(), 2000);
});
