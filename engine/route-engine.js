/** [weong-route] Core Routing Engine - Flag Force Build **/
/** Locked: Dec 30, 2025 Baseline [cite: 2025-12-30] **/

let currentRouteLayer = null;
let metricFlag = null;
let routeTimeout = null;

/**
 * Tactical Ribbon: Thin, crisp, and high-contrast
 */
function drawTacticalRoute(routeData) {
    if (currentRouteLayer) window.map.removeLayer(currentRouteLayer);
    currentRouteLayer = L.layerGroup().addTo(window.map);

    L.geoJSON(routeData.geometry, { style: { color: '#000', weight: 6, opacity: 0.3 } }).addTo(currentRouteLayer);
    L.geoJSON(routeData.geometry, { style: { color: '#2d2d2d', weight: 3, opacity: 1 } }).addTo(currentRouteLayer);
    L.geoJSON(routeData.geometry, { style: { color: '#FFD700', weight: 1, opacity: 1, dashArray: '6, 12' } }).addTo(currentRouteLayer);

    if (!window.routeInitialized) {
        window.map.fitBounds(currentRouteLayer.getBounds(), { padding: [80, 80] });
        window.routeInitialized = true;
    }
}

/**
 * Metric Flag: Forced Render Logic
 * This function is now exported so the Velocity Widget can call it directly.
 */
function updateMetricFlag(detail) {
    const { h, m, dist, speed, mid } = detail;
    if (!mid) return;

    if (metricFlag) window.map.removeLayer(metricFlag);

    const flagHtml = `
        <div style="background: rgba(10,10,10,0.92); border: 1px solid #FFD700; color: #fff; padding: 10px; border-radius: 4px; font-family: 'Courier New', monospace; width: 140px; box-shadow: 0 4px 15px rgba(0,0,0,0.7); backdrop-filter: blur(4px);">
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
}

async function calculateRoute() {
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
                const route = data.routes[0];
                drawTacticalRoute(route);
                
                // Fire event for the Velocity Widget
                window.dispatchEvent(new CustomEvent('weong:routeUpdated', { 
                    detail: {
                        summary: route.summary,
                        coordinates: route.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] })),
                        totalDistance: route.distance
                    } 
                }));
            }
        } catch (e) { 
            console.warn("Route Logic: Link busy."); 
        }
    }, 40); 
}

// Global System Listeners
window.addEventListener('weong:ready', calculateRoute);
window.addEventListener('weong:update', calculateRoute);

// Listen for the calculations to come back from the widget
window.addEventListener('weong:speedCalculated', (e) => {
    updateMetricFlag(e.detail);
});

// Force-bind to the window object so other engine files can see it
window.updateMetricFlag = updateMetricFlag;

export { calculateRoute, updateMetricFlag };
