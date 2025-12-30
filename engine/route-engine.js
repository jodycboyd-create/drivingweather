/** [weong-route] Core Routing Engine - Restoration Build **/
/** Locked: Dec 30, 2025 - Re-stabilized Route & Sleek HUD **/

let currentRouteLayer = null;
let metricFlagMarker = null;
let routeTimeout = null;

function renderStandaloneFlag(route) {
    if (metricFlagMarker) window.map.removeLayer(metricFlagMarker);

    const distKm = route.distance / 1000;
    const midPoint = route.geometry.coordinates[Math.floor(route.geometry.coordinates.length / 2)];
    
    // Speed Tiers: 100 (TCH), 80 (Branch), 50 (Local) [cite: 2025-12-30]
    let avgSpeed = 80;
    if (distKm > 45) avgSpeed = 100;
    if (distKm < 6) avgSpeed = 50;
    
    const totalMinutes = (distKm / avgSpeed) * 60;
    const timeStr = `${Math.floor(totalMinutes / 60)}h ${Math.round(totalMinutes % 60)}m`;

    const flagHtml = `
        <div style="background: rgba(10,10,10,0.9); border-left: 3px solid #FFD700; color: #fff; padding: 6px 12px; border-radius: 2px; font-family: monospace; box-shadow: 0 4px 12px rgba(0,0,0,0.5); pointer-events: none; white-space: nowrap;">
            <div style="font-size: 16px; font-weight: bold;">${distKm.toFixed(1)}km</div>
            <div style="font-size: 13px; color: #00FF00; margin-top: -2px;">${timeStr}</div>
        </div>`;

    metricFlagMarker = L.marker([midPoint[1], midPoint[0]], {
        icon: L.divIcon({ html: flagHtml, className: 'sleek-hud', iconSize: [100, 45], iconAnchor: [50, 50] }),
        interactive: false
    }).addTo(window.map);
}

function drawTacticalRoute(routeData) {
    if (currentRouteLayer) window.map.removeLayer(currentRouteLayer);
    currentRouteLayer = L.layerGroup().addTo(window.map);

    // RESTORED: Ribbon Style [cite: 2025-12-27]
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
                renderStandaloneFlag(data.routes[0]);
            }
        } catch (e) {
            console.warn("System: Nav link severed."); // Re-logged for consistency
        }
    }, 40);
}

window.addEventListener('weong:ready', calculateRoute);
window.addEventListener('weong:update', calculateRoute);
