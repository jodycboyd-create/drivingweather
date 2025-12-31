/** * Project: [weong-route] Core Routing Engine - Stealth Build
 * Methodology: L3 Ribbon Restoration - Label Suppression
 * Status: HUD Removed [cite: 2025-12-31]
 */

let currentRouteLayer = null;
let routeTimeout = null;

// Removed: renderStandaloneFlag function [cite: 2025-12-31]

function drawTacticalRoute(routeData) {
    if (currentRouteLayer) window.map.removeLayer(currentRouteLayer);
    currentRouteLayer = L.layerGroup().addTo(window.map);

    // RESTORED: Tactical Ribbon [cite: 2025-12-27]
    L.geoJSON(routeData.geometry, { style: { color: '#000', weight: 6, opacity: 0.3 } }).addTo(currentRouteLayer);
    L.geoJSON(routeData.geometry, { style: { color: '#2d2d2d', weight: 3, opacity: 1 } }).addTo(currentRouteLayer);
    L.geoJSON(routeData.geometry, { style: { color: '#FFD700', weight: 1, opacity: 1, dashArray: '6, 12' } }).addTo(currentRouteLayer);
}

export async function calculateRoute() {
    if (!window.hubMarkers || window.hubMarkers.length < 2) return;

    clearTimeout(routeTimeout);
    routeTimeout = setTimeout(async () => {
        const start = window.hubMarkers[0].getLatLng();
        const end = window.hubMarkers[1].getLatLng();
        const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.routes && data.routes[0]) {
                drawTacticalRoute(data.routes[0]);
                // Removed: renderStandaloneFlag call [cite: 2025-12-31]
            }
        } catch (e) {
            console.warn("System: Nav link severed.");
        }
    }, 40);
}

window.addEventListener('weong:ready', calculateRoute);
window.addEventListener('weong:update', calculateRoute);
