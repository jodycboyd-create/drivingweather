/** [weong-route] Core Routing Engine - Flag Stability Build **/
/** Locked: Dec 30, 2025 [cite: 2025-12-30] **/

let currentRouteLayer = null;
let metricFlagMarker = null; // Changed to clear previous flags correctly
let routeTimeout = null;

/**
 * Global Flag Handler: Defined at the top for immediate availability
 */
window.updateMetricFlag = function(detail) {
    const { h, m, dist, speed, mid } = detail;
    if (!mid || !window.map) return;
    
    // Clear old flag to prevent stacking
    if (metricFlagMarker) window.map.removeLayer(metricFlagMarker);

    const flagHtml = `
        <div style="background: rgba(10,10,10,0.92); border: 1px solid #FFD700; color: #fff; padding: 10px; border-radius: 4px; font-family: 'Courier New', monospace; width: 140px; box-shadow: 0 4px 15px #000; backdrop-filter: blur(4px); pointer-events: none;">
            <div style="font-size: 9px; color: #FFD700; border-bottom: 1px solid #333; margin-bottom: 6px; font-weight: bold; letter-spacing: 1px;">SECTOR DATA</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
                <span style="color: #888;">DIST:</span><span style="text-align: right;">${dist}km</span>
                <span style="color: #888;">TIME:</span><span style="text-align: right;">${h}h ${m}m</span>
                <span style="color: #888;">PACE:</span><span style="color: #00FF00; text-align: right; font-weight: bold;">${speed}</span>
            </div>
        </div>`;

    metricFlagMarker = L.marker([mid.lat, mid.lng], {
        icon: L.divIcon({ html: flagHtml, className: 'tactical-flag', iconSize: [150, 70], iconAnchor: [75, 80] }),
        interactive: false
    }).addTo(window.map);
};

function drawTacticalRoute(routeData) {
    if (currentRouteLayer) window.map.removeLayer(currentRouteLayer);
    currentRouteLayer = L.layerGroup().addTo(window.map);

    // High-contrast tactical ribbon [cite: 2025-12-27]
    L.geoJSON(routeData.geometry, { style: { color: '#000', weight: 6, opacity: 0.3 } }).addTo(currentRouteLayer);
    L.geoJSON(routeData.geometry, { style: { color: '#2d2d2d', weight: 3, opacity: 1 } }).addTo(currentRouteLayer);
    L.geoJSON(routeData.geometry, { style: { color: '#FFD700', weight: 1, opacity: 1, dashArray: '6, 12' } }).addTo(currentRouteLayer);

    if (!window.routeInitialized) {
        window.map.fitBounds(currentRouteLayer.getBounds(), { padding: [80, 80] });
        window.routeInitialized = true;
    }
}

export async function calculateRoute() {
    if (!window.hubMarkers || window.hubMarkers.length < 2) return;

    // Debounce: Prevents the "jumping" by waiting for drag to settle [cite: 2025-12-30]
    clearTimeout(routeTimeout);
    routeTimeout = setTimeout(async () => {
        const start = window.hubMarkers[0].getLatLng();
        const end = window.hubMarkers[1].getLatLng();
        const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.routes && data.routes[0]) {
                const route = data.routes[0];
                
                const payload = {
                    totalDistance: route.distance,
                    coordinates: route.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }))
                };

                drawTacticalRoute(route);
                
                // Directly trigger velocity widget update
                if (window.syncVelocity) {
                    window.syncVelocity(payload);
                }
            }
        } catch (e) {
            console.warn("Route Logic: Link busy."); // Expected during fast dragging
        }
    }, 40);
}

window.addEventListener('weong:ready', calculateRoute);
window.addEventListener('weong:update', calculateRoute);
