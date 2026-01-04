/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * VERSION: 1.2.6 - Scope Encapsulation Fix
 * STATUS: Locked - Newfoundland Deep-Dive
 */

const OptimizeEngine = {
    heatmap: null,

    init: function() {
        console.log("[OPTIMIZE] Initializing Heatmap Window...");
        
        // FIX: Define points INSIDE init to avoid 'google is not defined' at load
        const thermalPoints = [
            { location: new google.maps.LatLng(48.9515, -57.9453), weight: 15 }, // Corner Brook
            { location: new google.maps.LatLng(47.5615, -52.7126), weight: 10 }  // St. John's
        ];

        this.renderTable();
        this.renderRouteScan();
        this.injectHeatmap(thermalPoints);
    },

    renderTable: function() {
        const table = document.querySelector("#road-analytics-table tbody");
        if (!table) return;

        // Dataset matching the Jan 4 4:00 PM Matrix
        const hubs = [
            { name: "Corner Brook", rst: "-10.0°C", cond: "ICE / PACKED", status: "status-critical" },
            { name: "Grand Falls", rst: "-12.4°C", cond: "DRY / CLEAR", status: "status-stable" },
            { name: "Gander", rst: "-9.0°C", cond: "DRY / CLEAR", status: "status-stable" },
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
            // Force Segment 1 (CB) to RED for Level 3 ICE
            boxes.forEach((box, i) => {
                box.className = "route-box " + (i === 0 ? "bg-red" : "bg-green");
            });
        }
    },

    injectHeatmap: function(points) {
        if (!window.map || !google.maps.visualization) return;

        this.heatmap = new google.maps.visualization.HeatmapLayer({
            data: points,
            map: window.map,
            radius: 50,
            opacity: 0.9
        });
        console.log("[OPTIMIZE] Heatmap Window Rendered.");
    }
};

// RECOVERY LOADER: Polling to ensure Google and Map are ready
const bootSequence = setInterval(() => {
    if (window.map && typeof google !== 'undefined' && google.maps.visualization) {
        clearInterval(bootSequence);
        // Small 500ms buffer to allow base tiles to settle
        setTimeout(() => OptimizeEngine.init(), 500);
    }
}, 500);
