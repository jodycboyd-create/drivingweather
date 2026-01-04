/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * VERSION: 1.3.2 - Waypoint Intercept Build
 * LOGIC: Directly linked to window.hubMarkers and weong:update
 */

const OptimizeEngine = {
    heatLayer: null,
    
    // Locked Baseline Data for Jan 4 5:00 PM
    baselineRST: -10.2, 

    init: function() {
        console.log("[OPTIMIZE] Intercepting Hub Markers..."); 
        this.refresh();

        // Listen for the same update trigger as the routing engine
        window.addEventListener('weong:update', () => {
            console.log("[OPTIMIZE] Waypoint shift detected. Syncing Analytics...");
            this.refresh();
        });
    },

    refresh: function() {
        // Core Fix: Get data directly from the same source as the map pins
        const waypoints = window.hubMarkers || [];
        this.updateRoadAnalytics(waypoints);
        this.drawPredictiveHeatmap(waypoints);
    },

    /**
     * Updates the table based on the actual markers on the map.
     * Links RST and Conditions to pin position.
     */
    updateRoadAnalytics: function(markers) {
        const tableBody = document.querySelector("#road-analytics-table tbody");
        if (!tableBody) return;

        // Map the current map markers to the table rows
        tableBody.innerHTML = markers.map((marker, i) => {
            const pos = marker.getLatLng();
            const hubName = marker.label || `Waypoint ${i + 1}`;
            
            // Logic: Corner Brook (Marker 0) remains ICE/PACKED L3
            const condition = (i === 0) ? "ICE / PACKED" : "DRY / CLEAR";
            const statusClass = (i === 0) ? "status-critical highlight-pulse" : "status-stable";
            
            // Simulated RST shift based on latitude (colder north)
            const dynamicRST = (this.baselineRST + (pos.lat - 48.95)).toFixed(1);

            return `
                <tr>
                    <td class="font-bold">${hubName}</td>
                    <td>${dynamicRST}°C</td>
                    <td>-1.2</td>
                    <td class="${statusClass}">${condition}</td>
                </tr>`;
        }).join('');
    },

    /**
     * Predictive Heat Map (2-Hour Blended Blocks)
     * Renders below the table to avoid Map Overlay conflicts.
     */
    drawPredictiveHeatmap: function(markers) {
        const forecastContainer = document.querySelector("#predictive-heat-map-container");
        if (!forecastContainer) return;

        const timeBlocks = ["+2H", "+4H", "+6H", "+8H", "+10H"];
        
        // Logic: Blends the condition of all active waypoints into a route risk color
        const hasIce = markers.some((_, i) => i === 0); // Is Corner Brook (L3) active?
        
        forecastContainer.innerHTML = `
            <div style="display: flex; gap: 4px; height: 30px; margin-top: 10px;">
                ${timeBlocks.map((block, i) => {
                    // +2H block is Red if any marker is L3 (Ice); others fade to Green/Yellow
                    const r = hasIce && i < 2 ? 220 : 45;
                    const g = hasIce && i < 2 ? 50 : 180;
                    return `
                        <div style="flex: 1; background: rgb(${r}, ${g}, 45); opacity: 0.8; 
                             border-radius: 2px; text-align: center; font-size: 10px; line-height: 30px; color: white;">
                            ${block}
                        </div>`;
                }).join('')}
            </div>`;
    }
};

// Loader ensuring Leaflet and Map are fully ready
const loader = setInterval(() => {
    if (window.map && window.hubMarkers) {
        clearInterval(loader);
        OptimizeEngine.init();
    }
}, 500);
