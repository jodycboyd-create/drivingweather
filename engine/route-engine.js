/** [weong-route] Core Routing Engine - Integrated Metrics Build **/
/** Locked: Dec 30, 2025 Baseline [cite: 2025-12-30] **/

let currentRouteLayer = null;
let metricFlag = null;

/**
 * Tactical Ribbon Style: 
 * Triple-layered for crisp definition on the NL map.
 */
function drawTacticalRoute(routeData) {
    if (currentRouteLayer) window.map.removeLayer(currentRouteLayer);

    currentRouteLayer = L.layerGroup().addTo(window.map);

    // 1. Shadow/Shoulder (Depth)
    L.geoJSON(routeData.geometry, {
        style: { color: '#000000', weight: 7, opacity: 0.3, lineJoin: 'round' }
    }).addTo(currentRouteLayer);

    // 2. Core Asphalt (Sharpness)
    L.geoJSON(routeData.geometry, {
        style: { color: '#333333', weight: 4, opacity: 1, lineJoin: 'round' }
    }).addTo(currentRouteLayer);

    // 3. Precision Centerline (Detail)
    L.geoJSON(routeData.geometry, {
        style: { color: '#FFD700', weight: 1, opacity: 1, dashArray: '8, 12', lineJoin: 'round' }
    }).addTo(currentRouteLayer);

    if (!window.routeInitialized) {
        window.map.fitBounds(currentRouteLayer.getBounds(), { padding: [80, 80] });
        window.routeInitialized = true;
    }
}

/**
 * Metric Flag: High-Contrast Data Overlay
 * Rendered at the midpoint of the calculated route.
 */
function updateMetricFlag(detail) {
    const { h, m, dist, speed, mid } = detail;
    if (!mid) return;

    if (metricFlag) window.map.removeLayer(metricFlag);

    // High-fidelity tactical UI design [cite: 2025-12-27]
    const flagHtml = `
        <div style="
            background: rgba(15, 15, 15, 0.92); 
            border: 1px solid rgba(255, 215, 0, 0.6); 
            color: #FFFFFF; 
            padding: 10px; 
            border-radius: 4px; 
            font-family: 'Courier New', monospace; 
            width: 140px; 
            box-shadow: 0 4px 20px rgba(0,0,0,0.6);
            pointer-events: none;
            backdrop-filter: blur(4px);
        ">
            <div style="font-size: 9px; color: #FFD700; border-bottom: 1px solid #333; margin-bottom: 6px; letter-spacing: 2px; text-transform: uppercase; font-weight: bold;">
                Sector Stats
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px; line-height: 1.4;">
                <span style="color: #888;">DIST:</span><span style="text-align: right;">${dist}km</span>
                <span style="color: #888;">TIME:</span><span style="text-align: right;">${h}h ${m}m</span>
                <span style="color: #888;">PACE:</span><span style="color: #00FF00; text-align: right; font-weight: bold;">${speed}kph</span>
            </div>
        </div>
    `;

    metricFlag = L.marker([mid.lat, mid.lng], {
        icon: L.divIcon({
            html: flagHtml,
            className: 'tactical-flag',
            iconSize: [150, 70],
            iconAnchor: [75, 80] // Adjusted to sit slightly above the road
        }),
        interactive: false
    }).addTo(window.map);
}

/**
 * Main OSRM Calculation
 */
async function calculateRoute() {
    if (!window.hubMarkers || window.hubMarkers.length < 2) return;

    const start = window.hubMarkers[0].getLatLng();
    const end = window.hubMarkers[1].getLatLng();
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes[0]) {
            const route = data.routes[0];
            drawTacticalRoute(route);
            
            // Handshake with Velocity Widget [cite: 2025-12-30]
            window.dispatchEvent(new CustomEvent('weong:routeUpdated', { 
                detail: {
                    summary: route.summary,
                    coordinates: route.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] })),
                    totalDistance: route.distance
                } 
            }));
        }
    } catch (error) {
        console.error("System: Nav link severed.");
    }
}

// Global Event Subscriptions
window.addEventListener('weong:ready', () => calculateRoute());
window.addEventListener('weong:update', () => calculateRoute());

// The Flag logic triggers when the Velocity Widget finishes its calculation
window.addEventListener('weong:speedCalculated', (e) => {
    updateMetricFlag(e.detail);
});

// Module Export
export { calculateRoute };
