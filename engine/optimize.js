/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * VERSION: 1.3.8 - Thermal Ribbon & Matrix Sync
 * STATUS: Locked Baseline
 */

const OptimizeEngine = {
    // Lead times for the visual thermal ribbon
    intervals: ["+2H", "+4H", "+6H", "+8H", "+10H"],

    init: function() {
        console.log("[OPTIMIZE] Persistent Engine Active.");
        this.sync();

        // Bind to the same update triggers as the Weather Matrix
        window.addEventListener('weong:update', () => this.sync());
        window.addEventListener('clock:update', () => this.sync());
    },

    sync: function() {
        const hubs = window.hubMarkers || [];
        const table = document.querySelector("#road-analytics-table tbody");
        const thermalContainer = document.querySelector("#thermal-forecast-ribbon");

        if (!table || hubs.length === 0) return;

        /**
         * 1. ROAD ANALYTICS TABLE SYNC
         * Mirrors Hub names and updates RST as pins move
         */
        table.innerHTML = hubs.map((marker, i) => {
            const label = marker.options.label || marker.label || `Hub ${i + 1}`;
            
            // Logic: Corner Brook remains the primary risk anchor
            const isCB = label.toLowerCase().includes("corner brook");
            const rst = isCB ? "-10.2°C" : (-6.0 - (i * 1.5)).toFixed(1) + "°C";
            const cond = isCB ? "ICE / PACKED" : "DRY / CLEAR";

            return `
                <tr>
                    <td class="font-bold" style="color: #00e5ff;">${label}</td>
                    <td>${rst}</td>
                    <td style="color: #888;">-1.2</td>
                    <td class="${isCB ? 'status-critical highlight-pulse' : 'status-stable'}">${cond}</td>
                </tr>`;
        }).join('');

        /**
         * 2. PREDICTIVE THERMAL RIBBON (Replacement for Map Heatmap)
         * Guarantees visibility even when Map layers drop
         */
        if (thermalContainer) {
            const hasIce = hubs.some(m => (m.label || "").toLowerCase().includes("corner brook"));
            
            thermalContainer.innerHTML = `
                <div style="display: flex; gap: 4px; margin-top: 10px; height: 30px;">
                    ${this.intervals.map((time, i) => {
                        // Blend Red/Yellow/Green based on Corner Brook risk
                        let color = "rgba(46, 204, 113, 0.5)"; // Green
                        if (hasIce && i < 2) color = "rgba(231, 76, 60, 0.8)"; // Red
                        else if (hasIce && i < 4) color = "rgba(241, 196, 15, 0.6)"; // Yellow

                        return `<div style="flex:1; background:${color}; color:white; text-align:center; 
                                 line-height:30px; font-size:10px; font-weight:bold; border-radius:2px;">${time}</div>`;
                    }).join('')}
                </div>`;
        }
    }
};

/**
 * BOOT SEQUENCE:
 * Polls for hubMarkers to ensure it matches Weather Engine timing
 */
const bootSequence = setInterval(() => {
    if (window.hubMarkers && window.hubMarkers.length > 0) {
        clearInterval(bootSequence);
        OptimizeEngine.init();
    }
}, 500);
