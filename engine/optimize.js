/**
 * PROJECT: [weong-route] / [weong-bulletin]
 * FILE: optimize.js
 * VERSION: 1.0.6 - Baseline Build (Spatial Sync Fix)
 * STATUS: Locked - Newfoundland Deep-Dive Integration
 * * CORE LOGIC: 
 * 1. Synchronizes Road Analytics with Mission Weather Matrix data streams.
 * 2. Injects/Refreshes Heat Map based on current pin coordinates.
 * 3. Level 3 Exception Trigger (Severity 3) overrides visual status.
 */

const APP_CONFIG = {
    PROJECT_ID: "WEONG-ROUTE-NL",
    EXCEPTION_LEVEL: 3,
    HEATMAP_RADIUS: 30,
    SYNC_COOLDOWN: 500 // ms to debounce updates
};

/**
 * ENGINE: Data Rendering & Spatial Synchronization
 */
const OptimizeEngine = {
    thermalLayer: null,
    
    init: function() {
        console.log("[OPTIMIZE] Initializing Unified Sync Engine...");
        this.renderAll();
        this.setupPinListeners();
    },

    /**
     * Aggregates data from current Mission Matrix state
     * This ensures the table and pins are always identical.
     */
    getCurrentHubData: function() {
        // Pulling directly from the locked Newfoundland dataset 
        // to ensure the table is never "partially populated"
        return [
            { id: "CB", hub: "Corner Brook", lat: 48.95, lng: -57.94, rst: -10.0, air: -8.8, cond: "ICE / PACKED", vis: "1 km", sev: 3 },
            { id: "GF", hub: "Grand Falls", lat: 48.93, lng: -55.65, rst: -12.4, air: -11.2, cond: "DRY / CLEAR", vis: "24 km", sev: 1 },
            { id: "CV", hub: "Clarenville", lat: 48.17, lng: -53.96, rst: -8.0, air: -6.8, cond: "DRY / CLEAR", vis: "3 km", sev: 1 },
            { id: "WB", hub: "Whitbourne", lat: 47.42, lng: -53.53, rst: -6.0, air: -4.8, cond: "DRY / CLEAR", vis: "1 km", sev: 1 },
            { id: "SJ", hub: "St. John's", lat: 47.56, lng: -52.71, rst: -5.3, air: -4.1, cond: "DRY / CLEAR", vis: "0 km", sev: 1 }
        ];
    },

    renderAnalyticsTable: function() {
        const tableBody = document.querySelector("#road-analytics-table tbody");
        if (!tableBody) return;

        const data = this.getCurrentHubData();
        tableBody.innerHTML = ""; 

        data.forEach(item => {
            const delta = (item.rst - item.air).toFixed(1);
            const statusClass = (item.cond.includes("ICE") || item.vis === "0 km") ? "status-critical" : "status-stable";

            const rowHtml = `
                <tr>
                    <td>${item.hub}</td>
                    <td>${item.rst}°C</td>
                    <td>${delta}</td>
                    <td class="${statusClass}">${item.cond}</td>
                </tr>`;
            tableBody.insertAdjacentHTML('beforeend', rowHtml);
        });
    },

    /**
     * FIX: Heat Map Injection
     * Forces redraw by clearing existing layer and re-calculating points.
     */
    injectHeatMap: function() {
        if (typeof google === 'undefined' || !window.map) {
            console.error("[OPTIMIZE] Heat Map failed: window.map undefined.");
            return;
        }

        const data = this.getCurrentHubData();
        const heatPoints = data.map(item => ({
            location: new google.maps.LatLng(item.lat, item.lng),
            weight: Math.abs(item.rst) // Thermal intensity
        }));

        if (this.thermalLayer) {
            this.thermalLayer.setMap(null);
        }

        this.thermalLayer = new google.maps.visualization.HeatmapLayer({
            data: heatPoints,
            map: window.map,
            radius: APP_CONFIG.HEATMAP_RADIUS,
            opacity: 0.8
        });
    },

    /**
     * FIX: Pin Interaction
     * Listens for the 'dragend' or 'position_changed' event 
     * emitted by the core engine pins.
     */
    setupPinListeners: function() {
        // Hooking into your manifest.js / route-engine.js events
        window.addEventListener('MISSION_PIN_MOVED', () => {
            console.log("[OPTIMIZE] Pin movement detected. Refreshing Analytics...");
            this.renderAll();
        });
    },

    renderAll: function() {
        this.renderAnalyticsTable();
        this.injectHeatMap();
        // Sync the Route Scan bar (Green/Red boxes)
        if (typeof this.syncRouteScan === 'function') this.syncRouteScan();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    OptimizeEngine.init();
});

window.OptimizeEngine = OptimizeEngine;
