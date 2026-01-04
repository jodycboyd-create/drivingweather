/**
 * PROJECT: [weong-route] / [weong-bulletin]
 * FILE: optimize.js
 * VERSION: 1.2.4 - Restoration Baseline
 * STATUS: Locked - Newfoundland Deep-Dive
 * ----------------------------------------------------------------
 * RESET LOGIC: 
 * 1. Direct injection on 'tilesloaded' to avoid ReferenceErrors.
 * 2. Hard-coded NL Dataset to match Jan 4 4:00 PM Matrix.
 * 3. Segment 1 & Segment 5 RED state forced for L3 exceptions.
 */

const OptimizeEngine = {
    heatmap: null,

    // Coordinates for primary thermal signatures
    thermalPoints: [
        { location: new google.maps.LatLng(48.9515, -57.9453), weight: 15 }, // Corner Brook (ICE)
        { location: new google.maps.LatLng(47.5615, -52.7126), weight: 10 }  // St. John's (0km VIS)
    ],

    init: function() {
        console.log("[OPTIMIZE] Restoration Engine Active. Applying Jan 4 4:00PM State.");
        this.syncRoadAnalytics();
        this.syncRouteScan();
        this.injectHeatmap();
    },

    syncRoadAnalytics: function() {
        const table = document.querySelector("#road-analytics-table tbody");
        if (!table) return;

        // Dataset synced to Mission Matrix
        const hubs = [
            { n: "Corner Brook", r: "-10.0°C", c: "ICE / PACKED", crit: true },
            { n: "Grand Falls", r: "-12.4°C", c: "DRY / CLEAR", crit: false },
            { n: "Clarenville", r: "-8.0°C", c: "DRY / CLEAR", crit: false },
            { n: "Whitbourne", r: "-6.0°C", c: "DRY / CLEAR", crit: false },
            { n: "St. John's", r: "-5.3°C", c: "DRY / CLEAR", crit: true }
        ];

        table.innerHTML = hubs.map(hub => `
            <tr>
                <td class="font-bold">${hub.n}</td>
                <td>${hub.r}</td>
                <td>-1.2</td>
                <td class="${hub.crit ? 'status-critical highlight-pulse' : 'status-stable'}">${hub.c}</td>
            </tr>`).join('');
    },

    syncRouteScan: function() {
        const boxes = document.querySelectorAll(".route-box");
        // Force RED for Corner Brook (Idx 0) and St. John's (Idx 4)
        if (boxes.length > 0) {
            boxes.forEach((box, i) => {
                box.className = "route-box " + ((i === 0 || i === 4) ? "bg-red" : "bg-green");
            });
        }
    },

    injectHeatmap: function() {
        if (!window.map || !google.maps.visualization) return;

        // Clean re-injection
        if (this.heatmap) this.heatmap.setMap(null);

        this.heatmap = new google.maps.visualization.HeatmapLayer({
            data: this.thermalPoints,
            map: window.map,
            radius: 45,
            opacity: 0.85
        });
        
        console.log("[OPTIMIZE] Heatmap Window Successfully Rendered.");
    }
};

/**
 * RESTORATION LOADER
 * Anchors the engine to the map's internal ready state.
 */
const anchorEngine = setInterval(() => {
    if (window.map && typeof google !== 'undefined' && google.maps.visualization) {
        clearInterval(anchorEngine);
        // Wait for tiles to load once to ensure the window is visible
        google.maps.event.addListenerOnce(window.map, 'tilesloaded', () => {
            OptimizeEngine.init();
        });
    }
}, 1000);
