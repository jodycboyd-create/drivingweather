/** [weong-route] Core Routing Engine - Triple-Layer Tactical Build **/
/** Locked: Dec 30, 2025 Baseline [cite: 2025-12-30] **/

let currentRouteLayer = null;
let metricFlag = null;

/**
 * Tactical Road Style: 
 * Layer 1: Thick Black Border (Shoulders)
 * Layer 2: Inner Grey Roadway
 * Layer 3: Dashed Yellow Centerline
 */
function drawTacticalRoute(routeData) {
    if (currentRouteLayer) window.map.removeLayer(currentRouteLayer);

    currentRouteLayer = L.layerGroup().addTo(window.map);

    // 1. The Black Border (The "Shoulders")
    L.geoJSON(routeData.geometry, {
        style: { color: '#000000', weight: 14, opacity: 0.8, lineJoin: 'round' }
    }).addTo(currentRouteLayer);

    // 2. The Inner Grey Roadway
    L.geoJSON(routeData.geometry, {
        style: { color: '#4d4d4d', weight: 8, opacity: 1, lineJoin: 'round' }
    }).addTo(currentRouteLayer);

    // 3. The Yellow Centerline Dashes
    L.geoJSON(routeData.geometry, {
        style: { color: '#FFD700', weight: 1.5, opacity: 1, dashArray: '10, 20', lineJoin: 'round' }
    }).addTo(currentRouteLayer);

    // Auto-fit bounds on initial session [cite: 2025-12-26]
    if (!window.routeInitialized) {
        window.map.fitBounds(currentRouteLayer.getBounds(), { padding: [50, 50] });
        window.routeInitialized = true;
    }
}

/**
 * Metric Flag: Tactical UI at Route Midpoint
 */
function updateMetricFlag(detail) {
    const { h, m, dist, speed, mid } = detail;
    if (!mid) return;

    if (metricFlag) window.map.removeLayer(metricFlag);

    const flagHtml = `
        <div style="background: rgba(10, 10, 10, 0.95); border: 1px solid #FFD700; color: #FFFFFF; padding: 10px; border-radius: 4px; font-family: 'Courier New', monospace; width: 150px; box-shadow: 0 0 15px rgba(0,0,0,0.8); pointer-events: none;">
            <div style="font-size: 9px; color: #FFD700; border-bottom: 1px solid #333; margin-bottom: 6px; letter-spacing: 1px;">NAV DATA</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
                <span style="color: #666;">RANGE:</span><span>${dist}km</span>
                <span style="color: #666;">TIME:</span><span>${h}h ${m}m</span>
                <span style="color: #666;">PACE:</span><span style="color: #00FF00;">${speed}kph</span>
            </div>
        </div>
    `;

    metricFlag = L.marker([mid.lat, mid.lng], {
        icon: L.divIcon({
            html: flagHtml,
            className: 'tactical-flag',
            iconSize: [160, 70],
            iconAnchor: [80, 85]
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
            
            // Dispatch details for the Velocity Widget [cite: 2025-12-30]
            window.dispatchEvent(new CustomEvent('weong:routeUpdated', { 
                detail: {
                    summary: route.summary,
                    coordinates: route.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] })),
                    totalDistance: route.distance
                } 
            }));
        }
    } catch (error) {
        console.error("Route Engine: Link Failure", error);
    }
}

// Global System Event Listeners
window.addEventListener('weong:ready', () => calculateRoute());
window.addEventListener('weong:update', () => calculateRoute());
window.addEventListener('weong:speedCalculated', (e) => updateMetricFlag(e.detail));

// Export for manifest module compatibility
export { calculateRoute };
