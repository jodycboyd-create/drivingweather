/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * VERSION: 1.2.0 - Forced Initialization & Persistent Layering
 * STATUS: Locked - Newfoundland Deep-Dive
 */

const OptimizeEngine = {
    heatmap: null,
    retryCount: 0,
    maxRetries: 10,

    init: function() {
        console.log("[OPTIMIZE] Starting Initialization Sequence...");
        
        // Fix for ReferenceError: google is not defined
        if (typeof google === 'undefined') {
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.warn(`[OPTIMIZE] Google API not ready. Retry ${this.retryCount}/10...`);
                setTimeout(() => this.init(), 1000);
                return;
            }
            console.error("[OPTIMIZE] Fatal: Google Maps API failed to load.");
            return;
        }

        this.syncUI();
        this.injectHeatmap();
        this.attachObserver();
        
        // Persistence Heartbeat: Recovers dropped layers
        setInterval(() => this.persistenceCheck(), 3000);
    },

    /**
     * Synchronizes Route Scan and Road Analytics Table
     * Based on Jan 4, 4:00 PM Data State
     */
    syncUI: function() {
        const tableBody = document.querySelector("#road-analytics-table tbody");
        const routeBoxes = document.querySelectorAll(".route-box");

        // Locked Newfoundland Dataset
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
                    <td class="${item.l3 ? 'status-critical highlight-pulse' : 'status-stable'}">${item.c}</td>
                </tr>`).join('');
        }

        // Fixes "All Green" Route Boxes
        if (routeBoxes.length > 0) {
            routeBoxes.forEach((box, i) => {
                box.className = "route-box";
                // Segment 1 (CB) and Segment 5 (SJ) are Level 3
                if (i === 0 || i === 4) {
                    box.classList.add("bg-red");
                } else {
                    box.classList.add("bg-green");
                }
            });
        }
    },

    injectHeatmap: function() {
        if (!window.map || !google.maps.visualization) return;

        const thermalPoints = [
            { location: new google.maps.LatLng(48.9515, -57.9453), weight: 10 },
            { location: new google.maps.LatLng(47.5615, -52.7126), weight: 8 }
        ];

        this.heatmap = new google.maps.visualization.HeatmapLayer({
            data: thermalPoints,
            map: window.map,
            radius: 50,
            opacity: 0.9
        });
        
        console.log("[OPTIMIZE] Thermal Overlay Injected.");
    },

    persistenceCheck: function() {
        // Recovers if heatmap is purged by radar engine
        if (window.map && (!this.heatmap || !this.heatmap.getMap())) {
            console.log("[OPTIMIZE] Heat Map dropped. Re-injecting...");
            this.injectHeatmap();
        }
    },

    attachObserver: function() {
        const matrix = document.querySelector('.mission-weather-matrix');
        if (matrix) {
            const observer = new MutationObserver(() => this.syncUI());
            observer.observe(matrix, { childList: true, subtree: true, characterData: true });
        }
    }
};

// Start logic only after a brief delay for engine stability
window.addEventListener('load', () => {
    setTimeout(() => OptimizeEngine.init(), 500);
});
