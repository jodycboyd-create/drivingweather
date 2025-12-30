/** [weong-route] Core Routing Engine - Standalone Flag Build **/
/** Locked: Dec 30, 2025 Baseline **/

let currentRouteLayer = null;
let metricFlagMarker = null;
let routeTimeout = null;

/**
 * NEW: Standalone Velocity Logic
 * Calculates travel time based on NL road types.
 */
function calculateStandaloneMetrics(route) {
    const distKm = route.distance / 1000;
    const midPoint = route.geometry.coordinates[Math.floor(route.geometry.coordinates.length / 2)];
    const lat = midPoint[1];
    const lng = midPoint[0];

    // Determine Base Speed based on NL Geography/Road Class
    let avgSpeed = 80; // Default Branch Road
    if (distKm > 50) avgSpeed = 100; // TCH Logic
    if (distKm < 5) avgSpeed = 50;  // Local/Town Logic
    
    // Geographical overrides for NL Parks
    if (lat > 49.3 && lng < -57.5) avgSpeed = 80; // Gros Morne buffer
    
    const totalMinutes = (distKm / avgSpeed) * 60;
    
    return {
        h: Math.floor(totalMinutes / 60),
        m: Math.round(totalMinutes % 60),
        dist: distKm.toFixed(1),
        speed: avgSpeed,
        mid: { lat, lng }
    };
}

/**
 * Metric Flag: Renders autonomously
 */
function renderStandaloneFlag(metrics) {
    if (metricFlagMarker) window.map.removeLayer(metricFlagMarker);

    const flagHtml = `
        <div style="background: rgba(10,10,10,0.95); border: 1px solid #FFD700; color: #fff; padding: 10px; border-radius: 4px; font-family: monospace; width: 140px; box-shadow: 0 4px 15px #000; pointer-events: none; backdrop-filter: blur(4px);">
            <div style="font-size: 9px; color: #FFD700; border-bottom: 1px solid #333; margin-bottom: 6px; font-weight: bold; letter-spacing: 1px;">SECTOR DATA</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
                <span style="color: #888;">DIST:</span><span style="text-align: right;">${metrics.dist}km</span>
                <span style="color: #888;">TIME:</span><span style="text-align: right;">${metrics.h}h ${metrics.m}m</span>
                <span style="color: #888;">EST:</span><span style="color: #00FF00; text-align: right;">${metrics.speed}km/h</span>
            </div>
        </div>`;

    metricFlagMarker = L.marker([metrics.mid.lat, metrics.mid.lng], {
        icon: L.divIcon({ html: flagHtml, className: 'tactical-flag', iconSize: [150, 70], iconAnchor: [75, 80] }),
        interactive: false
    }).addTo(window.map);
}

function drawTacticalRoute(routeData) {
    if (currentRouteLayer) window.map.removeLayer(currentRouteLayer);
    currentRouteLayer = L.layerGroup().addTo(window.map);

    // Tactical Ribbon Style
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
                
                // 1. Draw Path
                drawTacticalRoute(route);
                
                // 2. Calculate & Draw Flag (No external connection needed)
                const metrics = calculateStandaloneMetrics(route);
                renderStandaloneFlag(metrics);
                
                // 3. Keep event for future velocity-widget use
                window.dispatchEvent(new CustomEvent('weong:routeUpdated', { detail: route }));
            }
        } catch (e) {
            console.warn("Route Logic: Link busy.");
        }
    }, 40);
}

window.addEventListener('weong:ready', calculateRoute);
window.addEventListener('weong:update', calculateRoute);
