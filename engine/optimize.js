/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * VERSION: 1.3.0 - Predictive Forecast & Blended UI
 */

const OptimizeEngine = {
    // Forecast lead times in 2-hour blocks
    forecastBlocks: ["+2H", "+4H", "+6H", "+8H", "+10H"],
    
    // Color map for blending logic
    colorMap: {
        "DRY / CLEAR": { r: 0, g: 255, b: 0 },    // Green
        "WET / SLUSH": { r: 255, g: 255, b: 0 },  // Yellow
        "ICE / PACKED": { r: 255, g: 0, b: 0 }    // Red
    },

    init: function() {
        console.log("[OPTIMIZE] Launching Predictive Engine...");
        this.renderRoadAnalytics();
        this.renderPredictiveHeatMap();
        this.attachToPinMovement();
    },

    /**
     * Updates based on pin movement, similar to the weather table.
     * Integrated with Jan 4 4:00 PM sync.
     */
    attachToPinMovement: function() {
        // Listens for updates from weather-engine.js or data-transfer.js
        window.addEventListener('waypointUpdate', (e) => {
            console.log("[OPTIMIZE] Waypoints shifted. Recalculating forecast...");
            this.renderRoadAnalytics(e.detail.newWaypoints);
            this.renderPredictiveHeatMap(e.detail.newWaypoints);
        });
    },

    renderRoadAnalytics: function(waypointData = null) {
        const tableBody = document.querySelector("#road-analytics-table tbody");
        if (!tableBody) return;

        // Uses real-time data or falls back to Jan 4 baseline
        const data = waypointData || [
            { h: "Corner Brook", rst: -10.0, c: "ICE / PACKED" },
            { h: "Grand Falls", rst: -12.4, c: "DRY / CLEAR" },
            { h: "Gander", rst: -9.0, c: "DRY / CLEAR" },
            { h: "Clarenville", rst: -8.0, c: "DRY / CLEAR" },
            { h: "St. John's", rst: -5.3, c: "DRY / CLEAR" }
        ];

        tableBody.innerHTML = data.map(item => `
            <tr>
                <td class="font-bold">${item.h}</td>
                <td>${item.rst}°C</td>
                <td>-1.2</td>
                <td class="${item.c === 'ICE / PACKED' ? 'status-critical' : 'status-stable'}">${item.c}</td>
            </tr>`).join('');
    },

    renderPredictiveHeatMap: function(waypointData = null) {
        const container = document.querySelector("#predictive-heat-map-container");
        if (!container) return;

        let html = `<div class="heat-map-grid" style="display: flex; gap: 10px;">`;
        
        this.forecastBlocks.forEach((block, index) => {
            // Logic: Blends colors based on current condition severity across all waypoints
            const blendedStyle = this.calculateBlendedColor(waypointData, index);
            
            html += `
                <div class="forecast-box" style="
                    flex: 1; 
                    background: ${blendedStyle}; 
                    padding: 10px; 
                    text-align: center;
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 4px;">
                    <span style="font-size: 0.8rem; font-weight: bold;">${block}</span>
                </div>`;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    calculateBlendedColor: function(data, timeStep) {
        // Defaulting to "Stable" green if no data provided
        if (!data) return "rgba(0, 255, 0, 0.6)";

        let rSum = 0, gSum = 0, bSum = 0;
        
        data.forEach(point => {
            const color = this.colorMap[point.c] || this.colorMap["DRY / CLEAR"];
            rSum += color.r;
            gSum += color.g;
            bSum += color.b;
        });

        const r = Math.round(rSum / data.length);
        const g = Math.round(gSum / data.length);
        const b = Math.round(bSum / data.length);

        return `rgba(${r}, ${g}, ${b}, 0.7)`;
    }
};

// Polling for UI readiness to prevent ReferenceErrors
const optimizeLoader = setInterval(() => {
    if (document.querySelector("#road-analytics-table")) {
        clearInterval(optimizeLoader);
        OptimizeEngine.init();
    }
}, 500);
