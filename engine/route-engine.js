/** [weong-route] Core Routing Engine - High-Fidelity Integrated Build **/
/** Locked: Dec 30, 2025 Baseline [cite: 2025-12-30] **/

let currentRouteLayer = null;
let metricFlag = null;

/**
 * Tactical Ribbon Style: 
 * Triple-layered for maximum crispness and map definition.
 */
function drawTacticalRoute(routeData) {
    if (currentRouteLayer) window.map.removeLayer(currentRouteLayer);

    currentRouteLayer = L.layerGroup().addTo(window.map);

    // 1. Shadow/Shoulder: Gives the ribbon depth without a heavy border
    L.geoJSON(routeData.geometry, {
        style: { color: '#000000', weight: 6, opacity: 0.3, lineJoin: 'round' }
    }).addTo(currentRouteLayer);

    // 2. Core Asphalt: The crisp, thin road ribbon
    L.geoJSON(routeData.geometry, {
        style: { color: '#2d2d2d', weight: 3, opacity: 1, lineJoin: 'round' }
    }).addTo(currentRouteLayer);

    // 3. Precision Centerline: Ultra-thin tactical markings
    L.geoJSON(routeData.geometry, {
        style: { color: '#FFD700', weight: 1, opacity: 1, dashArray: '6, 10', lineJoin: 'round' }
    }).addTo(currentRouteLayer);

    // Adjust view on initial load [cite: 2025-12-26]
    if (!window.routeInitialized) {
        window.map.fitBounds(currentRouteLayer.getBounds(), { padding: [80, 80] });
        window.routeInitialized = true;
    }
}

/**
 * Metric Flag: High-contrast data overlay at Route Midpoint
 * This renders the "Target Box" containing Dist, Time, and Pace.
 */
function updateMetricFlag(detail) {
    const { h, m, dist, speed, mid } = detail;
    if (!mid) return;

    if (metricFlag) window.map.removeLayer(metricFlag);

    const flagHtml = `
        <div style="
            background: rgba(10, 10, 10, 0.9); 
            border: 1px solid #FFD700; 
            color: #FFFFFF; 
            padding: 8px 12px; 
            border-radius: 2px; 
            font-family: 'Courier New', monospace; 
            min-width: 130px; 
            box-shadow: 0 0 15px rgba(0,0,0,0.8);
            pointer-events: none;
            backdrop-filter: blur(3px);
        ">
            <div style="font-size: 9px; color: #FFD700; border-bottom: 1px solid #444; margin-bottom: 6px; letter-spacing: 1px; font-weight: bold;">NAV SPECS</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
                <span style="color: #888;">DIST:</span><span style="text-align: right;">${dist}km</span>
                <span style="color: #888;">TIME:</span><span style="text-align: right;">${h}h ${m}m</span>
                <span style="color: #888;">PACE:</span><span style="color: #00FF00; text-align: right; font-weight: bold;">${speed}</span>
            </div>
        </div>
    `;

    metricFlag = L.marker([mid.lat, mid.lng], {
        icon: L.divIcon({
            html: flagHtml,
            className: 'tactical-flag',
            iconSize: [140, 65],
            iconAnchor: [70, 75]
        }),
        interactive: false
    }).addTo(window.map);
}

/**
 * Core Routing Logic
 */
async function calculateRoute() {
    // Only proceed if markers are present
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
            
            // Send route data to the Velocity Widget for metric calculation
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

// Event Listeners for System Lifecycle
window.addEventListener('weong:ready', () => calculateRoute());
window.addEventListener('weong:update', () => calculateRoute());

// This listener catches the result from velocity-widget.js to draw the flag
window.addEventListener('weong:speedCalculated', (e) => {
    updateMetricFlag(e.detail);
});

// Export for manifest.js (type="module") compatibility
export { calculateRoute };
