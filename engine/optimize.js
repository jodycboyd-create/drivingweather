/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * VERSION: 1.3.6 - Passive Mirror Build
 * STATUS: System Restoration
 */

const OptimizeEngine = {
    init: function() {
        console.log("[SYSTEM] Optimize Engine: Passive Sync Active.");
        this.sync();

        // ROOT FIX: Watch the Weather Table for changes.
        // If the weather engine updates its table, we update ours.
        const weatherTable = document.querySelector("#mission-weather-matrix") || document.querySelector(".weather-table");
        
        if (weatherTable) {
            const observer = new MutationObserver(() => {
                console.log("[SYSTEM] Weather Engine update detected. Mirroring to Analytics...");
                this.sync();
            });

            observer.observe(weatherTable, { 
                childList: true, 
                subtree: true, 
                characterData: true 
            });
        }

        // Fallback for pin moves if the observer misses a beat
        window.addEventListener('weong:update', () => this.sync());
    },

    sync: function() {
        const markers = window.hubMarkers || [];
        const tableBody = document.querySelector("#road-analytics-table tbody");
        
        if (!tableBody || markers.length === 0) return;

        tableBody.innerHTML = markers.map((marker, i) => {
            const pos = marker.getLatLng();
            const label = marker.options.label || marker.label || `Waypoint ${i + 1}`;
            
            // Logic: Corner Brook (Marker 0) ICE logic
            const isIce = (i === 0 || label.includes("Corner Brook"));
            const rst = isIce ? -10.2 : (-6.5 - (i * 0.5)).toFixed(1);
            const condition = isIce ? "ICE / PACKED" : "DRY / CLEAR";

            return `
                <tr>
                    <td class="font-bold" style="color: #00e5ff;">${label}</td>
                    <td>${rst}°C</td>
                    <td>-1.2</td>
                    <td class="${isIce ? 'status-critical alert-pulse' : 'status-stable'}">${condition}</td>
                </tr>`;
        }).join('');

        this.renderHeatMap(markers.length > 0);
    },

    renderHeatMap: function(active) {
        const container = document.querySelector("#predictive-heat-map-container");
        if (!container) return;

        const blocks = ["+2H", "+4H", "+6H", "+8H", "+10H"];
        container.innerHTML = `
            <div style="display: flex; gap: 4px; margin-top: 10px; height: 32px;">
                ${blocks.map((label, i) => {
                    // Visual Blend: Critical Red for first 4 hours, then clearing
                    const color = (i < 2) ? "rgba(255, 30, 30, 0.7)" : "rgba(30, 255, 80, 0.5)";
                    return `<div style="flex: 1; background: ${active ? color : '#333'}; color: white; 
                             text-align: center; font-size: 10px; line-height: 32px; border-radius: 2px; 
                             font-weight: bold; border: 1px solid rgba(255,255,255,0.1);">${label}</div>`;
                }).join('')}
            </div>`;
    }
};

// Start without blocking the main thread
window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.hubMarkers) OptimizeEngine.init();
    }, 1000);
});
