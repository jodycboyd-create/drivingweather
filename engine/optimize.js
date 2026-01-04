/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * VERSION: 1.2.5 - Direct Injection Baseline
 * ----------------------------------------------------------------
 * This version is designed to run even if RWIS is active or disabled.
 */

const OptimizeEngine = {
    heatmap: null,

    // Data points locked to Level 3 exceptions
    thermalPoints: [
        { location: new google.maps.LatLng(48.9515, -57.9453), weight: 15 }, // Corner Brook
        { location: new google.maps.LatLng(47.5615, -52.7126), weight: 10 }  // St. John's
    ],

    init: function() {
        console.log("[OPTIMIZE] Initializing Heatmap Window...");
        this.renderTable();
        this.renderRouteScan();
        this.injectHeatmap();
    },

    renderTable: function() {
        const table = document.querySelector("#road-analytics-table tbody");
        if (!table) return;

        // Dataset matching the Jan 4 4:00 PM deep-dive
        const hubs = [
            { name: "Corner Brook", rst: "-10.0°C", cond: "ICE / PACKED", status: "status-critical" },
            { name: "Grand Falls", rst: "-12.4°C", cond: "DRY / CLEAR", status: "status-stable" },
            { name: "Clarenville", rst: "-8.0°C", cond: "DRY / CLEAR", status: "status-stable" },
            { name: "Whitbourne", rst: "-6.0°C", cond: "DRY / CLEAR", status: "status-stable" },
            { name: "St. John's", rst: "-5.3°C", cond: "DRY / CLEAR", status: "status-stable" }
        ];

        table.innerHTML = hubs.map(h => `
            <tr>
                <td class="font-bold">${h.name}</td>
                <td>${h.rst}</td>
                <td>-1.2</td>
                <td class="${h.status}">${h.cond}</td>
            </tr>`).join('');
    },

    renderRouteScan: function() {
        const boxes = document.querySelectorAll(".route-box");
        if (boxes.length > 0) {
            // Force Segment 1 to RED for Corner Brook ICE
            boxes.forEach((box, i) => {
                box.className = "route-box " + (i === 0 ? "bg-red" : "bg-green");
            });
        }
    },

    injectHeatmap: function() {
        if (!window.map || !google.maps.visualization) return;

        this.heatmap = new google.maps.visualization.HeatmapLayer({
            data: this.thermalPoints,
            map: window.map,
            radius: 50,
            opacity: 0.9
        });
        console.log("[OPTIMIZE] Heatmap successfully pushed to map.");
    }
};

// Polling loader to avoid "google is not defined"
const loader = setInterval(() => {
    if (window.map && typeof google !== 'undefined' && google.maps.visualization) {
        clearInterval(loader);
        // Delay by 1 second to ensure rwis.js finish its sync if still active
        setTimeout(() => OptimizeEngine.init(), 1000);
    }
}, 500);
