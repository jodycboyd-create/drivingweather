/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * VERSION: 1.3.7 - HUD Anchor Build
 */

const OptimizeEngine = {
    init: function() {
        console.log("[OPTIMIZE] HUD Anchor Active.");
        this.fullSync();

        // Listen for the global update event
        window.addEventListener('weong:update', () => {
            console.log("[OPTIMIZE] Syncing Road Data...");
            this.fullSync();
        });
    },

    fullSync: function() {
        const markers = window.hubMarkers || [];
        const tableBody = document.querySelector("#road-analytics-table tbody");
        const heatmapContainer = document.querySelector("#predictive-heat-map-container");

        if (!tableBody || markers.length === 0) return;

        // 1. Update Road Analytics Table
        tableBody.innerHTML = markers.map((marker, i) => {
            const pos = marker.getLatLng();
            const label = marker.options.label || marker.label || `Hub ${i + 1}`;
            
            // Sync Logic: Corner Brook (Marker 0) is Level 3 ICE
            const isIce = (i === 0 || label.toLowerCase().includes("corner brook"));
            const rst = isIce ? -10.2 : (-4.5 - (i * 1.2)).toFixed(1);
            const condition = isIce ? "ICE / PACKED" : "DRY / CLEAR";

            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td class="font-bold" style="color: #00e5ff; padding: 8px;">${label}</td>
                    <td style="text-align: center;">${rst}°C</td>
                    <td style="text-align: center; color: #aaa;">-1.2</td>
                    <td class="${isIce ? 'status-critical alert-pulse' : 'status-stable'}" style="text-align: right; padding-right: 8px;">
                        ${condition}
                    </td>
                </tr>`;
        }).join('');

        // 2. Generate Predictve Heat Map (The "HUD Ribbon")
        if (heatmapContainer) {
            const timeSteps = ["+2H", "+4H", "+6H", "+8H", "+10H"];
            const iceActive = markers.some((_, i) => i === 0);

            heatmapContainer.innerHTML = `
                <div class="heat-ribbon-wrapper" style="margin-top: 15px; padding: 5px; background: #111; border-radius: 4px; border: 1px solid #333;">
                    <div style="font-size: 9px; color: #888; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 1px;">Route Thermal Forecast</div>
                    <div style="display: flex; gap: 3px; height: 24px;">
                        ${timeSteps.map((time, i) => {
                            // Blended logic: Red/Yellow/Green based on Corner Brook status
                            let color = "#2ecc71"; // Clear
                            if (iceActive && i < 2) color = "#e74c3c"; // Critical
                            else if (iceActive && i < 4) color = "#f1c40f"; // Warning

                            return `
                                <div style="flex: 1; background: ${color}; opacity: 0.8; color: #000; 
                                     text-align: center; font-size: 10px; font-weight: 800; line-height: 24px; border-radius: 2px;">
                                    ${time}
                                </div>`;
                        }).join('')}
                    </div>
                </div>`;
        }
    }
};

// Ensure this loads after the core map is initialized
window.addEventListener('load', () => {
    let checkCount = 0;
    const boot = setInterval(() => {
        checkCount++;
        if (window.hubMarkers && window.hubMarkers.length > 0) {
            clearInterval(boot);
            OptimizeEngine.init();
        } else if (checkCount > 20) {
            clearInterval(boot); // Stop after 10s to prevent infinite loop
        }
    }, 500);
});
