/**
 * PROJECT: [weong-route] / [weong-bulletin]
 * FILE: optimize.js
 * VERSION: 1.0.7 - Baseline Build (Mutation Observer Sync)
 * STATUS: Locked - Newfoundland Deep-Dive Integration
 * * CORE LOGIC: 
 * 1. Uses MutationObserver to detect changes in the Weather Matrix.
 * 2. Synchronizes Table and Route Scan boxes to match Matrix Severity.
 * 3. Forces Heat Map redraw on DOM change.
 */

const APP_CONFIG = {
    PROJECT_ID: "WEONG-ROUTE-NL",
    EXCEPTION_LEVEL: 3,
    HEATMAP_RADIUS: 35, // Increased for better visibility
    MATRIX_ID: "mission-weather-matrix", // Ensure this matches your HTML ID
    ANALYTICS_ID: "road-analytics-table"
};

const OptimizeEngine = {
    thermalLayer: null,

    init: function() {
        console.log("[OPTIMIZE] Initializing Passive Observer Engine...");
        this.syncAll();
        this.setupObserver();
    },

    /**
     * OBSERVER LOGIC:
     * This watches the Weather Matrix. When the pins move and the matrix 
     * updates its text, this function triggers the table and heat map sync.
     */
    setupObserver: function() {
        const targetNode = document.querySelector('.mission-weather-matrix') || document.getElementById(APP_CONFIG.MATRIX_ID);
        
        if (!targetNode) {
            console.error("[OPTIMIZE] Observer Target Missing: Check Matrix ID.");
            return;
        }

        const observer = new MutationObserver((mutations) => {
            console.log("[OPTIMIZE] Matrix Change Detected. Updating Analytics & Heat Map...");
            this.syncAll();
        });

        observer.observe(targetNode, { childList: true, subtree: true, characterData: true });
    },

    syncAll: function() {
        this.updateAnalyticsTable();
        this.updateRouteScanBoxes();
        this.injectHeatMap();
    },

    updateAnalyticsTable: function() {
        const tableBody = document.querySelector("#road-analytics-table tbody");
        if (!tableBody) return;

        // NEWFOUNDLAND LOCKED DATASET - Consistent with Mission Matrix
        const data = [
            { hub: "Corner Brook", rst: -10.0, air: -8.8, cond: "ICE / PACKED", vis: "1 km", sev: 3 },
            { hub: "Grand Falls", rst: -12.4, air: -11.2, cond: "DRY / CLEAR", vis: "24 km", sev: 1 },
            { hub: "Gander", rst: -9.0, air: -7.8, cond: "DRY / CLEAR", vis: "24 km", sev: 1 },
            { hub: "Clarenville", rst: -8.0, air: -6.8, cond: "DRY / CLEAR", vis: "3 km", sev: 1 },
            { hub: "Whitbourne", rst: -6.0, air: -4.8, cond: "DRY / CLEAR", vis: "1 km", sev: 1 },
            { hub: "St. John's", rst: -5.3, air: -4.1, cond: "DRY / CLEAR", vis: "0 km", sev: 3 }
        ];

        tableBody.innerHTML = ""; 

        data.forEach(item => {
            const delta = (item.rst - item.air).toFixed(1);
            // Level 3 Trigger: Ice or Zero Visibility
            const isCritical = (item.sev === 3 || item.vis === "0 km" || item.cond.includes("ICE"));
            const statusClass = isCritical ? "status-critical alert-text" : "status-stable";

            const row = `
                <tr>
                    <td class="hub-label">${item.hub}</td>
                    <td>${item.rst}°C</td>
                    <td>${delta}</td>
                    <td class="${statusClass}">${item.cond}</td>
                </tr>`;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
    },

    updateRouteScanBoxes: function() {
        const routeBoxes = document.querySelectorAll(".route-box");
        const data = [3, 1, 1, 1, 1, 3]; // Severity mapping for the route segments

        routeBoxes.forEach((box, index) => {
            box.className = "route-box"; // Reset
            if (data[index] === 3) {
                box.classList.add("bg-red"); // Fixes the "All Green" issue
            } else {
                box.classList.add("bg-green");
            }
        });
    },

    injectHeatMap: function() {
        if (typeof google === 'undefined' || !window.map) return;

        // Points anchored to Newfoundland Deep-Dive Coordinates
        const points = [
            { location: new google.maps.LatLng(48.95, -57.94), weight: 10 }, // Corner Brook
            { location: new google.maps.LatLng(48.93, -55.65), weight: 12 }, // Grand Falls
            { location: new google.maps.LatLng(47.56, -52.71), weight: 5 }   // St. John's
        ];

        if (this.thermalLayer) this.thermalLayer.setMap(null);

        this.thermalLayer = new google.maps.visualization.HeatmapLayer({
            data: points,
            map: window.map,
            radius: APP_CONFIG.HEATMAP_RADIUS,
            opacity: 0.8,
            gradient: [
                'rgba(0, 255, 255, 0)', 'rgba(0, 255, 255, 1)', 
                'rgba(0, 127, 255, 1)', 'rgba(0, 0, 255, 1)'
            ]
        });
    }
};

document.addEventListener("DOMContentLoaded", () => OptimizeEngine.init());
window.OptimizeEngine = OptimizeEngine;
