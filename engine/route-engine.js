/** [weong-route] Core Routing Engine - Tactical Build **/
/** Locked: Dec 30, 2025 Baseline **/

let currentRouteLayer = null;
let metricFlag = null;

/**
 * Tactical Route Style: Grey base with dashed yellow centerline
 * [cite: 2025-12-27]
 */
function drawTacticalRoute(routeData) {
    if (currentRouteLayer) window.map.removeLayer(currentRouteLayer);

    // Create a Layer Group to stack the asphalt and the dashes
    currentRouteLayer = L.layerGroup().addTo(window.map);

    // 1. The Asphalt Base
    L.geoJSON(routeData.geometry, {
        style: {
            color: '#333333',
            weight: 10,
            opacity: 0.9,
            lineJoin: 'round'
        }
    }).addTo(currentRouteLayer);

    // 2. The Yellow Centerline Dashes
    L.geoJSON(routeData.geometry, {
        style: {
            color: '#FFD700',
            weight: 2,
            opacity: 1,
            dashArray: '12, 18',
            lineJoin: 'round'
        }
    }).addTo(currentRouteLayer);

    // Zoom to fit if this is the initial boot
    if (!window.routeInitialized) {
        window.map.fitBounds(currentRouteLayer.getBounds(), { padding: [50, 50] });
        window.routeInitialized = true;
    }
}

/**
 * Metric Flag: High-contrast data overlay at midpoint
 * [cite: 2025-12-27, 2025-12-30]
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

/**
 * Core Logic Fetcher
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
            
            // Dispatch to Velocity Widget
            window.dispatchEvent(new CustomEvent('weong:routeUpdated', { 
                detail: {
                    summary: route.summary,
                    coordinates: route.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] })),
                    totalDistance: route.distance
                } 
            }));
        }
    } catch (error) {
        console.error("Route Engine: Calculation Error", error);
    }
}

/**
 * Global Handshakes
 *
 */
window.addEventListener('weong:ready', () => {
    console.log("System: Route Engine tactical handshake confirmed.");
    calculateRoute();
});

window.addEventListener('weong:update', () => calculateRoute());

// Listen for the velocity widget's calculation to draw the flag
window.addEventListener('weong:speedCalculated', (e) => {
    updateMetricFlag(e.detail);
});

// Explicit Export for manifest.js (type="module") compatibility
//
export { calculateRoute };
