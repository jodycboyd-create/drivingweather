/** [weong-route] Core Routing Engine - Stability Locked Build **/
/** Fixes: Route Jumping & Missing Metric Flag **/

let currentRouteLayer = null;
let metricFlag = null;
let routeTimeout = null; // For debouncing jumps

function drawTacticalRoute(routeData) {
    if (currentRouteLayer) window.map.removeLayer(currentRouteLayer);
    currentRouteLayer = L.layerGroup().addTo(window.map);

    // Layer 1: Shoulder
    L.geoJSON(routeData.geometry, {
        style: { color: '#000', weight: 6, opacity: 0.3 }
    }).addTo(currentRouteLayer);

    // Layer 2: Core Ribbon
    L.geoJSON(routeData.geometry, {
        style: { color: '#2d2d2d', weight: 3, opacity: 1 }
    }).addTo(currentRouteLayer);

    // Layer 3: Dashed Center
    L.geoJSON(routeData.geometry, {
        style: { color: '#FFD700', weight: 1, opacity: 1, dashArray: '6, 12' }
    }).addTo(currentRouteLayer);

    if (!window.routeInitialized) {
        window.map.fitBounds(currentRouteLayer.getBounds(), { padding: [80, 80] });
        window.routeInitialized = true;
    }
}

function updateMetricFlag(detail) {
    const { h, m, dist, speed, mid } = detail;
    if (!mid) return;
    if (metricFlag) window.map.removeLayer(metricFlag);

    const flagHtml = `
        <div style="background: rgba(10,10,10,0.9); border: 1px solid #FFD700; color: #fff; padding: 8px; border-radius: 2px; font-family: monospace; width: 130px; box-shadow: 0 0 15px #000; backdrop-filter: blur(3px);">
            <div style="font-size: 9px; color: #FFD700; border-bottom: 1px solid #444; margin-bottom: 5px; font-weight: bold;">SECTOR DATA</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; font-size: 12px;">
                <span style="color: #888;">DIST:</span><span style="text-align: right;">${dist}km</span>
                <span style="color: #888;">TIME:</span><span style="text-align: right;">${h}h ${m}m</span>
                <span style="color: #888;">PACE:</span><span style="color: #00FF00; text-align: right;">${speed}</span>
            </div>
        </div>`;

    metricFlag = L.marker([mid.lat, mid.lng], {
        icon: L.divIcon({ html: flagHtml, className: 'tactical-flag', iconSize: [140, 65], iconAnchor: [70, 75] }),
        interactive: false
    }).addTo(window.map);
}

async function calculateRoute() {
    if (!window.hubMarkers || window.hubMarkers.length < 2) return;

    // DEBOUNCE: Clear previous pending request to stop the "jumping"
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
                
                // Signal Velocity Widget to calculate stats
                window.dispatchEvent(new CustomEvent('weong:routeUpdated', { 
                    detail: {
                        summary: route.summary,
                        coordinates: route.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] })),
                        totalDistance: route.distance
                    } 
                }));
            }
        } catch (e) { console.warn("Route Logic: Link busy."); }
    }, 50); // 50ms buffer prevents the flickering/jumping
}

// HANDSHAKES
window.addEventListener('weong:ready', calculateRoute);
window.addEventListener('weong:update', calculateRoute);
window.addEventListener('weong:speedCalculated', (e) => updateMetricFlag(e.detail));

export { calculateRoute };
