/** [weong-route] Core Routing Engine - High-Fidelity Ribbon Build **/
/** Locked: Dec 30, 2025 Baseline - Refined Aesthetics **/

let currentRouteLayer = null;
let metricFlag = null;

/**
 * Tactical Ribbon Style: 
 * Layer 1: Sharp Outer Glow (Soft Black)
 * Layer 2: Core Asphalt (Sharp Grey)
 * Layer 3: Ultra-thin Centerline (Gold)
 */
function drawTacticalRoute(routeData) {
    if (currentRouteLayer) window.map.removeLayer(currentRouteLayer);

    currentRouteLayer = L.layerGroup().addTo(window.map);

    // 1. Outer Glow/Shoulder (Crisp 2px bleed)
    L.geoJSON(routeData.geometry, {
        style: { color: '#000000', weight: 7, opacity: 0.4, lineJoin: 'round' }
    }).addTo(currentRouteLayer);

    // 2. The Core Ribbon (Thin & Sharp)
    L.geoJSON(routeData.geometry, {
        style: { color: '#3a3a3a', weight: 4, opacity: 1, lineJoin: 'round' }
    }).addTo(currentRouteLayer);

    // 3. The Precision Centerline (Ultra-thin Gold)
    L.geoJSON(routeData.geometry, {
        style: { color: '#FFD700', weight: 1, opacity: 1, dashArray: '8, 12', lineJoin: 'round' }
    }).addTo(currentRouteLayer);

    if (!window.routeInitialized) {
        window.map.fitBounds(currentRouteLayer.getBounds(), { padding: [80, 80] });
        window.routeInitialized = true;
    }
}

/**
 * Metric Flag: Data overlay at Midpoint
 */
function updateMetricFlag(detail) {
    const { h, m, dist, speed, mid } = detail;
    if (!mid) return;

    if (metricFlag) window.map.removeLayer(metricFlag);

    const flagHtml = `
        <div style="background: rgba(10, 10, 10, 0.9); border: 1px solid #FFD700; color: #FFFFFF; padding: 8px; border-radius: 2px; font-family: 'Courier New', monospace; width: 140px; box-shadow: 0 0 10px rgba(0,0,0,0.7); pointer-events: none;">
            <div style="font-size: 8px; color: #FFD700; border-bottom: 1px solid #333; margin-bottom: 4px; letter-spacing: 1px; text-transform: uppercase;">Route Specs</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px; font-size: 11px;">
                <span style="color: #777;">DIST:</span><span>${dist}km</span>
                <span style="color: #777;">TIME:</span><span>${h}h ${m}m</span>
                <span style="color: #777;">PACE:</span><span style="color: #00FF00;">${speed}kph</span>
            </div>
        </div>
    `;

    metricFlag = L.marker([mid.lat, mid.lng], {
        icon: L.divIcon({
            html: flagHtml,
            className: 'tactical-flag',
            iconSize: [150, 60],
            iconAnchor: [75, 75]
        }),
        interactive: false
    }).addTo(window.map);
}

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
            
            window.dispatchEvent(new CustomEvent('weong:routeUpdated', { 
                detail: {
                    summary: route.summary,
                    coordinates: route.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] })),
                    totalDistance: route.distance
                } 
            }));
        }
    } catch (error) {
        console.error("System: Routing link interrupted.");
    }
}

// Global Event Listeners
window.addEventListener('weong:ready', () => calculateRoute());
window.addEventListener('weong:update', () => calculateRoute());
window.addEventListener('weong:speedCalculated', (e) => updateMetricFlag(e.detail));

export { calculateRoute };
