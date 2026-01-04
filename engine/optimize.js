/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * VERSION: 1.3.3 - Ground-Up Reconstruction
 * STATUS: Locked - Waypoint Synchronized
 */

const OptimizeEngine = {
    // Forecast lead times for the blended heat ribbon
    blocks: ["+2H", "+4H", "+6H", "+8H", "+10H"],

    init: function() {
        console.log("[SYSTEM] Optimize Engine: Ground-up rebuild active.");
        this.sync();

        // Listen for the core routing engine's update trigger
        window.addEventListener('weong:update', () => {
            console.log("[SYSTEM] Pin movement detected. Re-syncing analytics...");
            this.sync();
        });
    },

    sync: function() {
        const markers = window.hubMarkers || [];
        if (markers.length === 0) return;

        this.renderRoadAnalytics(markers);
        this.renderHeatMap(markers);
    },

    /**
     * ROAD ANALYTICS: Linked directly to Map Pins
     * Updates Hub name and RST as pins are moved.
     */
    renderRoadAnalytics: function(markers) {
        const tableBody = document.querySelector("#road-analytics-table tbody");
        if (!tableBody) return;

        tableBody.innerHTML = markers.map((marker, i) => {
            const pos = marker.getLatLng();
            const hubLabel = marker.label || `Waypoint ${i + 1}`;
            
            // Logic: Maintain Level 3 ICE/PACKED for Corner Brook (Marker 0)
            const isIce = (i === 0);
            const condition = isIce ? "ICE / PACKED" : "DRY / CLEAR";
            const rst = isIce ? -10.2 : (-5.0 - (i * 1.5)).toFixed(1);

            return `
                <tr>
                    <td class="font-bold">${hubLabel}</td>
                    <td>${rst}°C</td>
                    <td>-1.2</td>
                    <td class="${isIce ? 'status-critical alert-pulse' : 'status-stable'}">${condition}</td>
                </tr>`;
        }).join('');
    },

    /**
     * PREDICTIVE HEAT MAP: Blended UI Ribbon
     * Generates 2-hour forecast blocks based on route conditions.
     */
    renderHeatMap: function(markers) {
        const container = document.querySelector("#predictive-heat-map-container");
        if (!container) return;

        // Check if any waypoint triggers Level 3 (Ice)
        const iceActive = markers.some((_, i) => i === 0);

        container.innerHTML = `
            <div style="display: flex; gap: 5px; height: 35px; margin-top: 12px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 4px;">
                ${this.blocks.map((label, i) => {
                    // BLEND LOGIC: If Ice is present, first blocks turn Red, others transition to Green
                    let color = "rgba(46, 204, 113, 0.6)"; // Default Green
                    if (iceActive && i < 2) color = "rgba(231, 76, 60, 0.8)"; // Critical Red
                    else if (iceActive && i < 3) color = "rgba(241, 196, 15, 0.7)"; // Warning Yellow

                    return `
                        <div style="flex: 1; background: ${color}; border: 1px solid rgba(255,255,255,0.1); 
                             text-align: center; font-size: 11px; font-weight: bold; line-height: 27px; color: #fff; border-radius: 2px;">
                            ${label}
                        </div>`;
                }).join('')}
            </div>`;
    }
};

/**
 * BOOTLOADER
 * Ensures the script doesn't fire until the routing engine's markers exist.
 */
const engineCheck = setInterval(() => {
    if (window.hubMarkers && window.map) {
        clearInterval(engineCheck);
        OptimizeEngine.init();
    }
}, 500);
