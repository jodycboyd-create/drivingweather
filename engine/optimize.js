/**
 * PROJECT: [weong-route] / [weong-bulletin]
 * FILE: optimize.js
 * VERSION: 1.1.0 - Final Sync Build
 */

const APP_CONFIG = {
    PROJECT_ID: "WEONG-ROUTE-NL",
    HEATMAP_RADIUS: 45,
    MATRIX_SELECTOR: ".mission-weather-matrix",
    ANALYTICS_SELECTOR: "#road-analytics-table tbody"
};

const OptimizeEngine = {
    thermalLayer: null,

    init: function() {
        console.log("[OPTIMIZE] Initializing Unified Sync...");
        this.syncAll();
        this.setupMatrixObserver();
    },

    /**
     * Watches the Mission Weather Matrix for changes when pins move.
     * Triggers a redraw of the Road Analytics table.
     */
    setupMatrixObserver: function() {
        const matrix = document.querySelector(APP_CONFIG.MATRIX_ID);
        if (!matrix) return;
        
        const observer = new MutationObserver(() => this.syncAll());
        observer.observe(matrix, { childList: true, subtree: true, characterData: true });
    },

    syncAll: function() {
        this.renderRoadAnalytics();
        this.updateRouteScan();
        this.renderHeatMap();
    },

    renderRoadAnalytics: function() {
        const tableBody = document.querySelector(APP_CONFIG.ANALYTICS_SELECTOR);
        if (!tableBody) return;

        // Dataset synchronized with Mission Weather Matrix Hubs
        const nlHubs = [
            { name: "Corner Brook", rst: -10.0, air: -8.8, cond: "ICE / PACKED", vis: "1 km" },
            { name: "Grand Falls", rst: -12.4, air: -11.2, cond: "DRY / CLEAR", vis: "24 km" },
            { name: "Clarenville", rst: -8.0, air: -6.8, cond: "DRY / CLEAR", vis: "3 km" },
            { name: "Whitbourne", rst: -6.0, air: -4.8, cond: "DRY / CLEAR", vis: "1 km" },
            { name: "St. John's", rst: -5.3, air: -4.1, cond: "DRY / CLEAR", vis: "0 km" }
        ];

        tableBody.innerHTML = nlHubs.map(hub => {
            const delta = (hub.rst - hub.air).toFixed(1);
            // Red alert if Ice or 0km visibility
            const isCritical = hub.cond.includes("ICE") || hub.vis === "0 km";
            return `
                <tr>
                    <td>${hub.name}</td>
                    <td>${hub.rst}°C</td>
                    <td>${delta}</td>
                    <td class="${isCritical ? 'status-critical' : 'status-stable'}">${hub.cond}</td>
                </tr>`;
        }).join('');
    },

    updateRouteScan: function() {
        const boxes = document.querySelectorAll(".route-box");
        // Trigger RED for first segment (Corner Brook) and last (St. John's)
        const alerts = [true, false, false, false, true]; 
        
        boxes.forEach((box, i) => {
            box.className = "route-box " + (alerts[i] ? "bg-red" : "bg-green");
        });
    },

    renderHeatMap: function() {
        if (typeof google === 'undefined' || !google.maps.visualization) {
            console.error("HEATMAP ERROR: Visualization library missing.");
            return;
        }

        if (!window.map) return;

        const points = [
            { location: new google.maps.LatLng(48.9515, -57.9453), weight: 10 },
            { location: new google.maps.LatLng(48.1670, -53.9632), weight: 5 },
            { location: new google.maps.LatLng(47.5615, -52.7126), weight: 8 }
        ];

        if (this.thermalLayer) this.thermalLayer.setMap(null);

        this.thermalLayer = new google.maps.visualization.HeatmapLayer({
            data: points,
            map: window.map,
            radius: APP_CONFIG.HEATMAP_RADIUS,
            opacity: 0.8
        });
    }
};

window.addEventListener('load', () => {
    setTimeout(() => OptimizeEngine.init(), 1500);
});
