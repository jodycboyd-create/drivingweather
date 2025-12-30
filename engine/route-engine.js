/** [weong-route] Core Routing Engine - Integrated Direct Link **/
/** Locked: Dec 30, 2025 Baseline [cite: 2025-12-30] **/

let currentRouteLayer = null;
let metricFlag = null;
let routeTimeout = null;

function drawTacticalRoute(routeData) {
    if (currentRouteLayer) window.map.removeLayer(currentRouteLayer);
    currentRouteLayer = L.layerGroup().addTo(window.map);

    // Layered Ribbon Style [cite: 2025-12-27]
    L.geoJSON(routeData.geometry, { style: { color: '#000', weight: 6, opacity: 0.3 } }).addTo(currentRouteLayer);
    L.geoJSON(routeData.geometry, { style: { color: '#2d2d2d', weight: 3, opacity: 1 } }).addTo(currentRouteLayer);
    L.geoJSON(routeData.geometry, { style: { color: '#FFD700', weight: 1, opacity: 1, dashArray: '6, 12' } }).addTo(currentRouteLayer);

    if (!window.routeInitialized) {
        window.map.fitBounds(currentRouteLayer.getBounds(), { padding: [80, 80] });
        window.routeInitialized = true;
    }
}

/**
 * Metric Flag: Renders the data box at the route midpoint.
 * Attached to window so the Velocity Widget can call it directly.
 */
window.updateMetricFlag = function(detail) {
    const { h, m, dist, speed, mid } = detail;
    if (!mid) return;
    if (metricFlag) window.map.removeLayer(metricFlag);

    const flagHtml = `
        <div style="background: rgba(10,10,10,0.92); border: 1px solid #FFD700; color: #fff; padding: 10px; border-radius: 4px; font-family: 'Courier New', monospace; width: 140px; box-shadow: 0 4px 15px #000; backdrop-filter: blur(4px);">
            <div style="font-size: 9px; color: #FFD700; border-bottom: 1px solid #333; margin-bottom: 6px; letter-spacing: 1px; font-weight: bold;">SECTOR DATA</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
                <span style="color: #888;">DIST:</span><span style="text-align: right;">${dist}km</span>
                <span style="color: #888;">TIME:</span><span style="text-align: right;">${h}h ${m}m</span>
                <span style="color: #888;">PACE:</span><span style="color: #00FF00; text-align: right; font-weight: bold;">${speed}</span>
            </div>
        </div>`;

    metricFlag = L.marker([mid.lat, mid.lng], {
        icon: L.divIcon({ html: flagHtml, className: 'tactical-flag', iconSize: [150, 70], iconAnchor: [75, 80] }),
        interactive: false
    }).addTo(window.map);
};

export async function calculateRoute() {
    if (!window.hubMarkers || window.hubMarkers.length < 2) return;

    // Debounce to prevent "jumping" [cite: 2025-12-30]
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
                
                // Construct payload for velocity widget
                const payload = {
                    totalDistance: route.distance,
                    coordinates: route.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }))
                };

                drawTacticalRoute(route);
                
                // DIRECT LINK: Push data to widget [cite: 2025-12-30]
                if (window.syncVelocity) {
                    window.syncVelocity(payload);
                }
            }
        } catch (e) {
            console.warn("Route Logic: Link busy.");
        }
    }, 40);
}

// System Handshakes
window.addEventListener('weong:ready', calculateRoute);
window.addEventListener('weong:update', calculateRoute);
