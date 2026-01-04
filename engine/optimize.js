/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * VERSION: 1.3.1 - Event-Linked Restoration
 * LOGIC: Synchronized with Core Routing Engine weong:update
 */

const OptimizeEngine = {
    heatLayer: null,
    
    // Core data coordinates for Newfoundland Hubs
    locations: [
        { name: "Corner Brook", lat: 48.9515, lng: -57.9453, rst: -10.2, cond: "ICE / PACKED" },
        { name: "Grand Falls", lat: 48.9339, lng: -55.6364, rst: -12.9, cond: "DRY / CLEAR" },
        { name: "Clarenville", lat: 48.1670, lng: -53.9660, rst: -8.1, cond: "DRY / CLEAR" },
        { name: "Whitbourne", lat: 47.4260, lng: -53.5300, rst: -6.2, cond: "DRY / CLEAR" },
        { name: "St. John's", lat: 47.5615, lng: -52.7126, rst: -5.3, cond: "DRY / CLEAR" }
    ],

    init: function() {
        console.log("[OPTIMIZE] Spatial Sync Engine Online.");
        this.refreshAll();
        
        // HOOK: Matches Core Routing Engine behavior
        window.addEventListener('weong:update', () => {
            console.log("[OPTIMIZE] Movement detected. Re-plotting Heatmap/Analytics...");
            this.refreshAll();
        });
    },

    refreshAll: function() {
        this.updateRoadAnalytics();
        this.drawPredictiveHeatmap();
    },

    updateRoadAnalytics: function() {
        const tableBody = document.querySelector("#road-analytics-table tbody");
        if (!tableBody) return;

        // Populate table with Jan 4 5:00 PM RST state
        tableBody.innerHTML = this.locations.map(loc => `
            <tr>
                <td class="font-bold">${loc.name}</td>
                <td>${loc.rst}°C</td>
                <td>-1.2</td>
                <td class="${loc.cond.includes('ICE') ? 'status-critical' : 'status-stable'}">${loc.cond}</td>
            </tr>`).join('');
    },

    drawPredictiveHeatmap: function() {
        if (!window.map) return;

        // Remove old heat layer to prevent stacking
        if (this.heatLayer) window.map.removeLayer(this.heatLayer);

        /**
         * GENERATING BLENDED HEAT TILES
         * Logic: 2-hour forecast blocks as UI overlays
         */
        const forecastContainer = document.querySelector("#heat-forecast-ribbon");
        if (forecastContainer) {
            const blocks = ["+2H", "+4H", "+6H", "+8H", "+10H"];
            forecastContainer.innerHTML = blocks.map((time, i) => {
                // Blend logic: Shifts from green to red based on Corner Brook condition
                const severity = (i === 0) ? "rgba(255, 0, 0, 0.6)" : "rgba(0, 255, 0, 0.4)";
                return `<div class="forecast-block" style="background: ${severity};">${time}</div>`;
            }).join('');
        }

        // LEAFLET HEATMAP RESTORATION
        // Using SimpleHeat logic within the Leaflet context
        const heatPoints = this.locations.map(l => [l.lat, l.lng, 0.8]);
        this.heatLayer = L.heatLayer(heatPoints, {
            radius: 35,
            blur: 15,
            gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}
        }).addTo(window.map);
    }
};

// Start logic when system is ready
window.addEventListener('load', () => {
    setTimeout(() => OptimizeEngine.init(), 100);
});
