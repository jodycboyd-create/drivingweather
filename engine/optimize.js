/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * VERSION: 1.1.2 - Final Forced Sync
 */

const APP_CONFIG = {
    HEATMAP_RADIUS: 55, // Increased for visibility over radar
    SYNC_COOLDOWN: 2000
};

const OptimizeEngine = {
    thermalLayer: null,

    init: function() {
        console.log("[OPTIMIZE] Persistent Engine Active.");
        this.runFullSync();
        // Heartbeat to recover from layer wipes
        setInterval(() => this.maintainHeatMap(), APP_CONFIG.SYNC_COOLDOWN);
        this.setupMatrixObserver();
    },

    setupMatrixObserver: function() {
        const matrix = document.querySelector('.mission-weather-matrix');
        if (matrix) {
            new MutationObserver(() => this.runFullSync())
                .observe(matrix, { childList: true, subtree: true, characterData: true });
        }
    },

    runFullSync: function() {
        this.syncAnalyticsTable();
        this.syncRouteScan();
        this.maintainHeatMap();
    },

    syncAnalyticsTable: function() {
        const tableBody = document.querySelector("#road-analytics-table tbody");
        if (!tableBody) return;

        // Forced Hub Population
        const data = [
            { h: "Corner Brook", rst: -10.0, air: -8.8, c: "ICE / PACKED", v: "1 km" },
            { h: "Grand Falls", rst: -12.4, air: -11.2, c: "DRY / CLEAR", v: "24 km" },
            { h: "Clarenville", rst: -8.0, air: -6.8, c: "DRY / CLEAR", v: "3 km" },
            { h: "Whitbourne", rst: -6.0, air: -4.8, c: "DRY / CLEAR", v: "1 km" },
            { h: "St. John's", rst: -5.3, air: -4.1, c: "DRY / CLEAR", v: "0 km" }
        ];

        tableBody.innerHTML = data.map(item => `
            <tr>
                <td>${item.h}</td>
                <td>${item.rst}°C</td>
                <td>${(item.rst - item.air).toFixed(1)}</td>
                <td class="${item.c.includes('ICE') ? 'status-critical' : 'status-stable'}">${item.c}</td>
            </tr>`).join('');
    },

    syncRouteScan: function() {
        const boxes = document.querySelectorAll(".route-box");
        // Force Segment 1 (CB) and Segment 5 (SJ) to RED
        const severity = [true, false, false, false, true]; 
        boxes.forEach((box, i) => {
            box.className = "route-box " + (severity[i] ? "bg-red" : "bg-green");
        });
    },

    maintainHeatMap: function() {
        if (typeof google === 'undefined' || !google.maps.visualization || !window.map) return;

        // If layer is missing or detached, force re-attachment
        if (!this.thermalLayer || !this.thermalLayer.getMap()) {
            console.log("[OPTIMIZE] Heat Map dropped. Re-injecting...");
            
            const pts = [
                { location: new google.maps.LatLng(48.9515, -57.9453), weight: 10 },
                { location: new google.maps.LatLng(47.5615, -52.7126), weight: 8 }
            ];

            this.thermalLayer = new google.maps.visualization.HeatmapLayer({
                data: pts,
                map: window.map,
                radius: APP_CONFIG.HEATMAP_RADIUS,
                opacity: 0.9
            });
        }
    }
};

window.addEventListener('load', () => setTimeout(() => OptimizeEngine.init(), 1500));
