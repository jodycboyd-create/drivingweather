/**
 * PROJECT: [weong-route] / [weong-bulletin]
 * FILE: optimize.js
 * VERSION: 1.0.4 - Baseline Build (Full Production)
 * STATUS: Locked - Newfoundland Deep-Dive Integration
 * * CORE LOGIC: 
 * 1. Synchronizes Route Scan segments with Road Analytics Table.
 * 2. Level 3 Exception Trigger (Severity 3) forces UI state to RED.
 * 3. Enforces full population of Newfoundland Island dataset.
 */

const APP_CONFIG = {
    PROJECT_ID: "WEONG-ROUTE-NL",
    EXCEPTION_LEVEL: 3,
    REFRESH_RATE: 300000 // 5 minutes
};

// FULL COMPREHENSIVE NEWFOUNDLAND DATASET - LOCKED
// This is the permanent database for all island hubs.
const nlRoadData = [
    {
        id: "NL-CB",
        hub: "Corner Brook",
        rst: -4.2,
        air: -6.5,
        condition: "ICE / PACKED",
        visibility: "1.0 km",
        wind: "45 km/h",
        severity: 3,
        trend: "deteriorating"
    },
    {
        id: "NL-DL",
        hub: "Deer Lake",
        rst: -2.1,
        air: -5.0,
        condition: "SNOW / SLUSH",
        visibility: "3.5 km",
        wind: "30 km/h",
        severity: 2,
        trend: "stable"
    },
    {
        id: "NL-GA",
        hub: "Gander",
        rst: 1.4,
        air: -2.1,
        condition: "DRY",
        visibility: "10.0 km",
        wind: "15 km/h",
        severity: 1,
        trend: "stable"
    },
    {
        id: "NL-CV",
        hub: "Clarenville",
        rst: 0.8,
        air: -1.2,
        condition: "WET",
        visibility: "8.0 km",
        wind: "20 km/h",
        severity: 1,
        trend: "improving"
    },
    {
        id: "NL-SJ",
        hub: "St. John's",
        rst: 2.5,
        air: 1.0,
        condition: "FOG / ZERO",
        visibility: "0.0 km",
        wind: "10 km/h",
        severity: 3,
        trend: "deteriorating"
    }
];

/**
 * ENGINE: Data Rendering & Synchronization
 * Updates both the Visual Route Bar and the Analytics Table
 */
const OptimizeEngine = {
    
    init: function() {
        console.log("Initializing WEONG-ROUTE Optimization Engine...");
        this.renderAnalyticsTable();
        this.syncRouteScan();
        this.bindEvents();
    },

    renderAnalyticsTable: function() {
        const tableBody = document.querySelector("#road-analytics-table tbody");
        if (!tableBody) return;

        tableBody.innerHTML = ""; // Prevent partial population

        nlRoadData.forEach(item => {
            const delta = (item.rst - item.air).toFixed(1);
            const severityClass = this.getSeverityClass(item.severity);
            
            const rowHtml = `
                <tr data-hub-id="${item.id}">
                    <td class="font-bold">${item.hub}</td>
                    <td>${item.rst}°C</td>
                    <td>${delta}°C</td>
                    <td class="status-cell ${severityClass}">${item.condition}</td>
                    <td>${item.visibility}</td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', rowHtml);
        });
    },

    syncRouteScan: function() {
        const routeBoxes = document.querySelectorAll(".route-box");
        
        nlRoadData.forEach((item, index) => {
            if (routeBoxes[index]) {
                // Clear previous state
                routeBoxes[index].className = "route-box";
                
                // Primary logic: severity mapping
                if (item.severity === 3) {
                    routeBoxes[index].classList.add("bg-red");
                } else if (item.severity === 2) {
                    routeBoxes[index].classList.add("bg-yellow");
                } else {
                    routeBoxes[index].classList.add("bg-green");
                }
                
                // Tooltip population for deep-dive
                routeBoxes[index].title = `${item.hub}: ${item.condition}`;
            }
        });
    },

    getSeverityClass: function(level) {
        switch(level) {
            case 3: return "status-critical alert-pulse";
            case 2: return "status-warning";
            case 1: return "status-stable";
            default: return "status-unknown";
        }
    },

    bindEvents: function() {
        // Reserved for future interactive expansion or manual refreshes
        console.log("Events bound to baseline build.");
    }
};

// Lock the initialization to the DOM Load
document.addEventListener("DOMContentLoaded", () => {
    OptimizeEngine.init();
});

// Expose to global scope for anchor point reference
window.OptimizeEngine = OptimizeEngine;
