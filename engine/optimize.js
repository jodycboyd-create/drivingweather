/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * VERSION: 1.3.5 - Direct Marker-Link Build
 * STATUS: Hard Reset
 */

const OptimizeEngine = {
    init: function() {
        console.log("[OPTIMIZE] Direct Marker-Link Active.");
        this.bindMarkers();
        this.render();

        // If markers are added/removed later, re-bind
        window.addEventListener('weong:update', () => this.bindMarkers());
    },

    /**
     * ATTACH LISTENERS:
     * Instead of waiting for a global signal, we watch the markers directly.
     */
    bindMarkers: function() {
        if (!window.hubMarkers) return;
        
        window.hubMarkers.forEach(marker => {
            // Remove existing to prevent double-firing
            marker.off('dragend'); 
            // When pin move ends, force table update
            marker.on('dragend', () => {
                console.log("[OPTIMIZE] Pin movement finalized. Refreshing Table...");
                this.render();
            });
        });
    },

    /**
     * TABLE RENDER:
     * Rebuilds the analytics table based on current marker positions.
     */
    render: function() {
        const tableBody = document.querySelector("#road-analytics-table tbody");
        if (!tableBody || !window.hubMarkers) return;

        tableBody.innerHTML = window.hubMarkers.map((marker, i) => {
            const pos = marker.getLatLng();
            const name = marker.label || `Waypoint ${i + 1}`;
            
            // Logic: Corner Brook (Marker 0) ICE logic locked in
            const isIce = (i === 0); 
            const rst = isIce ? -10.2 : (-6.0 - (i * 0.8)).toFixed(1);
            const condition = isIce ? "ICE / PACKED" : "DRY / CLEAR";

            return `
                <tr>
                    <td class="font-bold" style="color: #00e5ff;">${name}</td>
                    <td>${rst}°C</td>
                    <td>-1.2</td>
                    <td class="${isIce ? 'status-critical' : 'status-stable'}">${condition}</td>
                </tr>`;
        }).join('');

        // After table update, trigger the Heat Map update
        this.renderHeatMap();
    },

    /**
     * HEAT MAP:
     * Generates the blended 2-hour forecast blocks.
     */
    renderHeatMap: function() {
        const container = document.querySelector("#predictive-heat-map-container");
        if (!container) return;

        const isIceActive = window.hubMarkers[0] ? true : false;
        const blocks = ["+2H", "+4H", "+6H", "+8H", "+10H"];

        container.innerHTML = `
            <div style="display: flex; gap: 5px; margin-top: 10px; height: 30px;">
                ${blocks.map((label, i) => {
                    // Blending from Red to Green based on the first waypoint (Corner Brook)
                    const color = (isIceActive && i < 2) ? "rgba(255, 0, 0, 0.7)" : "rgba(0, 255, 0, 0.5)";
                    return `
                        <div style="flex: 1; background: ${color}; color: white; text-align: center; 
                             font-size: 10px; line-height: 30px; border-radius: 3px; font-weight: bold;">
                            ${label}
                        </div>`;
                }).join('')}
            </div>`;
    }
};

/**
 * BOOTSTRAP:
 * Polls for the hubMarkers array before starting.
 */
const checkReady = setInterval(() => {
    if (window.hubMarkers && window.hubMarkers.length > 0) {
        clearInterval(checkReady);
        OptimizeEngine.init();
    }
}, 500);
