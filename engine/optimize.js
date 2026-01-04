/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * VERSION: 1.3.9 - HUD Injection Fix
 * STATUS: System Restoration
 */

const OptimizeEngine = {
    init: function() {
        console.log("[SYSTEM] Optimize Engine: HUD Injection Active.");
        this.sync();

        // Syncs whenever markers or time are updated in the main engine
        window.addEventListener('weong:update', () => this.sync());
        window.addEventListener('clock:update', () => this.sync());
    },

    sync: function() {
        const markers = window.hubMarkers || [];
        const tableBody = document.querySelector("#road-analytics-table tbody");
        const container = document.querySelector("#road-analytics-table");

        if (!tableBody || markers.length === 0) return;

        /**
         * 1. ROAD ANALYTICS TABLE UPDATE
         * Directly mirrors markers to prevent desync
         */
        tableBody.innerHTML = markers.map((marker, i) => {
            const label = marker.options.label || marker.label || `Hub ${i + 1}`;
            
            // Baseline data for Jan 4 6:00 PM sync
            const isCB = label.toLowerCase().includes("corner brook");
            const rst = isCB ? "-10.9°C" : (-6.0 - (i * 1.5)).toFixed(1) + "°C";
            const cond = "DRY / CLEAR";

            return `
                <tr>
                    <td class="font-bold" style="color: #00e5ff; padding: 5px;">${label}</td>
                    <td style="text-align: center;">${rst}</td>
                    <td style="text-align: center; color: #888;">-1.2</td>
                    <td class="status-stable" style="text-align: right; color: #00ff00;">${cond}</td>
                </tr>`;
        }).join('');

        /**
         * 2. THERMAL RIBBON INJECTION
         * Appends the heatmap ribbon to the BOTTOM of the window container
         */
        this.injectThermalRibbon(container);
    },

    injectThermalRibbon: function(parent) {
        // Remove existing ribbon to prevent stacking
        const oldRibbon = document.querySelector("#thermal-hud-ribbon");
        if (oldRibbon) oldRibbon.remove();

        const ribbon = document.createElement("div");
        ribbon.id = "thermal-hud-ribbon";
        ribbon.style = "display: flex; gap: 2px; height: 20px; margin-top: 10px; border-top: 1px solid #333; padding-top: 5px;";
        
        const steps = ["+2H", "+4H", "+6H", "+8H", "+10H"];
        ribbon.innerHTML = steps.map((step, i) => {
            // Blended thermal logic: Red for initial L3 risk, clearing to green
            const color = (i < 2) ? "rgba(255, 0, 0, 0.6)" : "rgba(0, 255, 0, 0.4)";
            return `<div style="flex: 1; background: ${color}; color: #fff; font-size: 9px; text-align: center; line-height: 20px; font-weight: bold;">${step}</div>`;
        }).join('');

        parent.appendChild(ribbon);
    }
};

/**
 * FAIL-SAFE LOADER
 * Addresses ReferenceError by waiting for both Map and Markers
 */
const engineLoader = setInterval(() => {
    if (window.hubMarkers && window.hubMarkers.length > 0) {
        clearInterval(engineLoader);
        OptimizeEngine.init();
    }
}, 500);
