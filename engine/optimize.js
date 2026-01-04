/**
 * PROJECT: [weong-route] / [weong-bulletin]
 * FILE: optimize.js
 * VERSION: 1.2.3 - Passive Overlay Reset
 * STATUS: Locked - Newfoundland Deep-Dive
 * * CORE LOGIC:
 * 1. Only initializes when window.map and google.maps are both present.
 * 2. Uses a persistent heartbeat to re-draw if other engines purge overlays.
 * 3. Forces Route Scan and Road Analytics to match Level 3 triggers.
 */

const OptimizeEngine = {
    heatmap: null,
    
    // Core data coordinates for Newfoundland Hubs
    locations: {
        cornerBrook: { lat: 48.9515, lng: -57.9453 },
        stJohns: { lat: 47.5615, lng: -52.7126 }
    },

    init: function() {
        console.log("[OPTIMIZE] Spatial Engine Active. Syncing UI...");
        this.updateUIState();
        this.renderHeatmap();
        
        // Persistent Heartbeat: Monitors if heatmap is wiped by radar.js
        setInterval(() => {
            if (window.map && (!this.heatmap || !this.heatmap.getMap())) {
                this.renderHeatmap();
            }
        }, 5000);
    },

    updateUIState: function() {
        const routeBoxes = document.querySelectorAll(".route-box");
        const analyticsBody = document.querySelector("#road-analytics-table tbody");

        // Force Route Scan to match Jan 4 Level 3 exceptions
        // Segment 1 (Corner Brook) and Segment 5 (St. John's) must be RED
        if (routeBoxes.length >= 5) {
            routeBoxes.forEach((box, i) => {
                box.className = "route-box " + ((i === 0 || i === 4) ? "bg-red" : "bg-green");
            });
        }

        // Populate Table with Newfoundland deep-dive data
        if (analyticsBody) {
            const hubs = [
                { name: "Corner Brook", rst: "-10.0°C", cond: "ICE / PACKED", crit: true },
                { name: "Grand Falls", rst: "-12.4°C", cond: "DRY / CLEAR", crit: false },
                { name: "Clarenville", rst: "-8.0°C", cond: "DRY / CLEAR", crit: false },
                { name: "Whitbourne", rst: "-6.0°C", cond: "DRY / CLEAR", crit: false },
                { name: "St. John's", rst: "-5.3°C", cond: "DRY / CLEAR", crit: false }
            ];

            analyticsBody.innerHTML = hubs.map(h => `
                <tr>
                    <td class="font-bold">${h.name}</td>
                    <td>${h.rst}</td>
                    <td>-1.2</td>
                    <td class="${h.crit ? 'status-critical' : 'status-stable'}">${h.cond}</td>
                </tr>`).join('');
        }
    },

    renderHeatmap: function() {
        if (typeof google === 'undefined' || !google.maps.visualization || !window.map) return;

        const points = [
            { location: new google.maps.LatLng(this.locations.cornerBrook.lat, this.locations.cornerBrook.lng), weight: 10 },
            { location: new google.maps.LatLng(this.locations.stJohns.lat, this.locations.stJohns.lng), weight: 5 }
        ];

        if (this.heatmap) this.heatmap.setMap(null);

        this.heatmap = new google.maps.visualization.HeatmapLayer({
            data: points,
            map: window.map,
            radius: 50,
            opacity: 0.8
        });
        
        console.log("[OPTIMIZE] Heatmap overlay applied to active window.");
    }
};

/**
 * FAIL-SAFE LOADER
 * This replaces the "retry" logic with a silent event listener.
 * It waits for the map to be fully loaded before starting optimize.js.
 */
const bootLoader = setInterval(() => {
    if (window.map && typeof google !== 'undefined' && google.maps.visualization) {
        clearInterval(bootLoader);
        OptimizeEngine.init();
    }
}, 1000);
