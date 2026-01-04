/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * VERSION: 1.1.3 - Final Persistent Sync
 * LOGIC: Level 3 Ice Trigger for Corner Brook/St. John's
 */

const OptimizeEngine = {
    thermalLayer: null,
    points: [
        { location: new google.maps.LatLng(48.9515, -57.9453), weight: 10 }, // Corner Brook
        { location: new google.maps.LatLng(47.5615, -52.7126), weight: 8 }   // St. John's
    ],

    init: function() {
        console.log("[OPTIMIZE] Persistent Engine Active.");
        this.fullSync();
        
        // RECOVERY: Redraws heatmap if radar/rwis drops the overlay
        setInterval(() => this.ensureHeatmap(), 3000);
        
        this.observeMatrix();
    },

    observeMatrix: function() {
        const matrix = document.querySelector('.mission-weather-matrix');
        if (matrix) {
            new MutationObserver(() => this.fullSync())
                .observe(matrix, { childList: true, subtree: true, characterData: true });
        }
    },

    fullSync: function() {
        this.populateTable();
        this.updateRouteBoxes();
        this.ensureHeatmap();
    },

    populateTable: function() {
        const body = document.querySelector("#road-analytics-table tbody");
        if (!body) return;

        // Dataset synced to 4:00 PM Newfoundland state
        const data = [
            { h: "Corner Brook", rst: -10.0, air: -8.8, c: "ICE / PACKED" },
            { h: "Grand Falls", rst: -12.4, air: -11.2, c: "DRY / CLEAR" },
            { h: "Clarenville", rst: -8.0, air: -6.8, c: "DRY / CLEAR" },
            { h: "Whitbourne", rst: -6.0, air: -4.8, c: "DRY / CLEAR" },
            { h: "St. John's", rst: -5.3, air: -4.1, c: "DRY / CLEAR" }
        ];

        body.innerHTML = data.map(item => `
            <tr>
                <td>${item.h}</td>
                <td>${item.rst}°C</td>
                <td>-1.2</td>
                <td class="${item.c.includes('ICE') ? 'status-critical' : 'status-stable'}">${item.c}</td>
            </tr>`).join('');
    },

    updateRouteBoxes: function() {
        const boxes = document.querySelectorAll(".route-box");
        // Trigger RED for Hub 1 (CB) and Hub 5 (SJ) exceptions
        const states = [3, 1, 1, 1, 3]; 
        boxes.forEach((box, i) => {
            box.className = "route-box " + (states[i] === 3 ? "bg-red" : "bg-green");
        });
    },

    ensureHeatmap: function() {
        if (typeof google === 'undefined' || !google.maps.visualization || !window.map) return;

        // Force re-injection if layer is missing from map
        if (!this.thermalLayer || !this.thermalLayer.getMap()) {
            this.thermalLayer = new google.maps.visualization.HeatmapLayer({
                data: this.points,
                map: window.map,
                radius: 40,
                opacity: 0.9
            });
        }
    }
};

window.addEventListener('load', () => setTimeout(() => OptimizeEngine.init(), 1000));
