/** [weong-route] Core Routing Engine - Sleek HUD Build **/
/** Locked: Dec 30, 2025 Baseline [cite: 2025-12-30] **/

let currentRouteLayer = null;
let metricFlagMarker = null;
let routeTimeout = null;

/**
 * Tactical Speed Logic: NL Tiered System [cite: 2025-12-30]
 */
function calculateStandaloneMetrics(route) {
    const distKm = route.distance / 1000;
    const midPoint = route.geometry.coordinates[Math.floor(route.geometry.coordinates.length / 2)];
    const lat = midPoint[1];
    const lng = midPoint[0];

    let avgSpeed = 80; 
    const isMainCorridor = (lat > 47.0 && lat < 49.5) && (lng > -59.5 && lng < -52.5);
    
    if (distKm > 45 && isMainCorridor) avgSpeed = 100; // TCH [cite: 2025-12-30]
    if (distKm < 6) avgSpeed = 50; // Local [cite: 2025-12-30]
    
    const totalMinutes = (distKm / avgSpeed) * 60;
    
    return {
        timeStr: `${Math.floor(totalMinutes / 60)}h ${Math.round(totalMinutes % 60)}m`,
        distStr: `${distKm.toFixed(1)}km`,
        mid: { lat, lng }
    };
}

/**
 * Sleek HUD Flag: No labels, minimal footprint [cite: 2025-12-30]
 */
function renderStandaloneFlag(metrics) {
    if (metricFlagMarker) window.map.removeLayer(metricFlagMarker);

    const flagHtml = `
        <div style="background: rgba(10,10,10,0.9); border-left: 3px solid #FFD700; color: #fff; padding: 6px 12px; border-radius: 2px; font-family: 'Courier New', monospace; box-shadow: 0 4px 12px rgba(0,0,0,0.5); pointer-events: none; white-space: nowrap;">
            <div style="font-size: 16px; font-weight: bold; letter-spacing: -0.5px;">${metrics.distStr}</div>
            <div style="font-size: 13px; color: #00FF00; margin-top: -2px;">${metrics.timeStr}</div>
        </div>`;

    metricFlagMarker = L.marker([metrics.mid.lat, metrics.mid.lng], {
        icon: L.divIcon({ 
            html: flagHtml, 
            className: 'sleek-hud', 
            iconSize: [100, 45], 
            iconAnchor: [50, 50] 
        }),
        interactive: false
    }).addTo(window.map);
}

function drawTacticalRoute(routeData) {
    if (currentRouteLayer) window.map.removeLayer(currentRouteLayer);
    currentRouteLayer = L.layerGroup().addTo(window.map);

    L.geoJSON(routeData.geometry, { style: { color: '#000', weight: 6, opacity: 0.3 } }).addTo(currentRouteLayer);
    L.geoJSON(routeData.geometry, { style: { color: '#2d2d2d', weight: 3, opacity: 1 } }).addTo(currentRouteLayer);
    L.geoJSON(routeData.geometry, { 
        style: { color: '#FFD700', weight: 1, opacity: 1, dashArray: '6, 12' } 
    }).addTo(currentRouteLayer);
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
                drawTacticalRoute(route);
                
                const metrics = calculateStandaloneMetrics(route);
                renderStandaloneFlag(metrics);
                
                window.dispatchEvent(new CustomEvent('weong:routeUpdated', { 
                    detail: {
                        totalDistance: route.distance,
                        coordinates: route.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }))
                    } 
                }));
            }
        } catch (e) {
            console.warn("Route Logic: Link busy."); [cite: 2025-12-30]
        }
    }, 40);
}

window.addEventListener('weong:ready', calculateRoute);
window.addEventListener('weong:update', calculateRoute);
