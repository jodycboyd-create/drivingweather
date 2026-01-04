/**
 * PROJECT: [weong-route] / [weong-bulletin]
 * FILE: optimize.js
 * VERSION: 1.0.5 - Baseline Build + Spatial HeatMap
 * STATUS: Locked - Newfoundland Deep-Dive Integration
 * * CORE LOGIC: 
 * 1. Synchronizes Route Scan segments with Road Analytics Table.
 * 2. Level 3 Exception Trigger (Severity 3) forces UI state to RED.
 * 3. Injects Spatial HeatMap data for Newfoundland Hubs.
 */

const APP_CONFIG = {
    PROJECT_ID: "WEONG-ROUTE-NL",
    EXCEPTION_LEVEL: 3,
    HEATMAP_RADIUS: 25,
    REFRESH_RATE: 300000 
};

// FULL COMPREHENSIVE NEWFOUNDLAND DATASET - LOCKED
// Includes Coordinates for Heat Map Injection
const nlRoadData = [
    {
        id: "NL-CB",
        hub: "Corner Brook",
        lat: 48.9515,
        lng: -57.9453,
        rst: -10.0,
        air: -8.8,
        condition: "ICE / PACKED",
        visibility: "1.0 km",
        severity: 3
    },
    {
        id: "NL-GF",
        hub: "Grand Falls",
        lat: 48.9287,
        lng: -55.6532,
        rst: -12.4,
        air: -11.2,
        condition: "DRY / CLEAR",
        visibility: "24.0 km",
        severity: 1
    },
    {
        id: "NL-CV",
        hub: "Clarenville",
        lat: 48.1670,
        lng: -53.9632,
        rst: -9.0,
        air: -7.8,
        condition: "WET",
        visibility: "15.0 km",
        severity: 1
    },
    {
        id: "NL-SJ",
        hub: "St. John's",
        lat: 47.5615,
        lng: -52.7126,
        rst: -3.0,
        air: -2.5,
        condition: "FOG / ZERO",
        visibility: "0.0 km",
        severity: 3
    }
];

const OptimizeEngine = {
    
    init: function() {
        console.log("[OPTIMIZE] Initializing Newfoundland Spatial Engine...");
        this.renderAnalyticsTable();
        this.syncRouteScan();
        this.injectHeatMap();
    },

    renderAnalyticsTable: function() {
        const tableBody = document.querySelector("#road-analytics-table tbody");
        if (!tableBody) return;

        tableBody.innerHTML = ""; 

        nlRoadData.forEach(item => {
            const delta = (item.rst - item.air).toFixed(1);
            let statusClass = "status-stable";
            if (item.severity === 3) statusClass = "status-critical";

            const rowHtml = `
                <tr>
                    <td class="font-bold">${item.hub}</td>
                    <td>${item.rst}°C</td>
                    <td>${delta}</td>
                    <td class="${statusClass}">${item.condition}</td>
                    <td>${item.visibility}</td>
                </tr>`;
            tableBody.insertAdjacentHTML('beforeend', rowHtml);
        });
    },

    syncRouteScan: function() {
        const routeBoxes = document.querySelectorAll(".route-box");
        nlRoadData.forEach((item, index) => {
            if (routeBoxes[index]) {
                routeBoxes[index].className = "route-box";
                if (item.severity === 3) {
                    routeBoxes[index].classList.add("bg-red");
                } else {
                    routeBoxes[index].classList.add("bg-green");
                }
            }
        });
    },

    /**
     * SPATIAL LOGIC: Restores the Heat Map layer visibility
     */
    injectHeatMap: function() {
        if (typeof google === 'undefined' || !window.map) {
            console.warn("[OPTIMIZE] Map object not found. Heat map injection deferred.");
            return;
        }

        const heatMapPoints = nlRoadData.map(item => {
            return {
                location: new google.maps.LatLng(item.lat, item.lng),
                // Weight is based on RST coldness to visualize thermal risk
                weight: Math.abs(item.rst) 
            };
        });

        if (window.thermalLayer) {
            window.thermalLayer.setMap(null);
        }

        window.thermalLayer = new google.maps.visualization.HeatmapLayer({
            data: heatMapPoints,
            map: window.map,
            radius: APP_CONFIG.HEATMAP_RADIUS,
            opacity: 0.7,
            gradient: [
                'rgba(0, 255, 255, 0)',
                'rgba(0, 255, 255, 1)',
                'rgba(0, 191, 255, 1)',
                'rgba(0, 127, 255, 1)',
                'rgba(0, 63, 255, 1)',
                'rgba(0, 0, 255, 1)'
            ]
        });

        console.log("[OPTIMIZE] Newfoundland Thermal Heat Map Layer Active.");
    }
};

document.addEventListener("DOMContentLoaded", () => {
    OptimizeEngine.init();
});

window.OptimizeEngine = OptimizeEngine;
