/** [weong-route] Core Routing Engine - Capsule HUD Build **/
/** Locked: Dec 30, 2025 - Restored Ribbon & Minimalist Capsule **/

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

    // Capsule Style: Single line, uniform font, tactical separator [cite: 2025-12-30]
    const flagHtml = `
        <div style="background: rgba(10,10,10,0.95); border: 1px solid rgba(255, 215, 0, 0.4); color: #fff; padding: 4px 14px; border-radius: 20px; font-family: 'Courier New', monospace; box-shadow: 0 4px 15px rgba(0,0,0,0.6); pointer-events: none; white-space: nowrap; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 14px; font-weight: bold; letter-spacing: 0.5px;">${distKm.toFixed(1)}km</span>
            <span style="color: #FFD700; font-weight: bold; opacity: 0.8;">|</span>
            <span style="font-size: 14px; font-weight: bold; color: #00FF00; letter-spacing: 0.5px;">${timeStr}</span>
        </div>`;

    metricFlagMarker = L.marker([midPoint[1], midPoint[0]], {
        icon: L.divIcon({ 
            html: flagHtml, 
            className: 'capsule-hud', 
            iconSize: [160, 30], 
            iconAnchor: [80, 15] 
        }),
        interactive: false
    }).addTo(window.map);
}

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
                renderStandaloneFlag(data.routes[0]);
            }
        } catch (e) {
            console.warn("System: Nav link severed.");
        }
    }, 40);
}

window.addEventListener('weong:ready', calculateRoute);
window.addEventListener('weong:update', calculateRoute);
