/** [weong-route] Core Routing Engine - Speed Tier Build **/
/** Locked: Dec 30, 2025 Baseline [cite: 2025-12-30] **/

let currentRouteLayer = null;
let metricFlagMarker = null;
let routeTimeout = null;

/**
 * Tactical Speed Logic: NL Tiered System
 * Rules: TCH (100), Branch (80), Local (50) [cite: 2025-12-30]
 */
function calculateStandaloneMetrics(route) {
    const distKm = route.distance / 1000;
    const midPoint = route.geometry.coordinates[Math.floor(route.geometry.coordinates.length / 2)];
    const lat = midPoint[1];
    const lng = midPoint[0];

    // Determine Base Speed Tier
    let avgSpeed = 80; // Default: Branch Roads (Irish Loop, Bonavista, etc.)
    
    // TCH Tier: High distance + main corridor lat/lng range
    const isMainCorridor = (lat > 47.0 && lat < 49.5) && (lng > -59.5 && lng < -52.5);
    if (distKm > 45 && isMainCorridor) {
        avgSpeed = 100; // TCH Logic
    }
    
    // Local Tier: Short hops within municipalities
    if (distKm < 6) {
        avgSpeed = 50; // Local/Town Logic
    }
    
    const totalMinutes = (distKm / avgSpeed) * 60;
    
    return {
        h: Math.floor(totalMinutes / 60),
        m: Math.round(totalMinutes % 60),
        dist: distKm.toFixed(1),
        speed: avgSpeed,
        mid: { lat, lng }
    };
}

function renderStandaloneFlag(metrics) {
    if (metricFlagMarker) window.map.removeLayer(metricFlagMarker);

    const flagHtml = `
        <div style="background: rgba(10,10,10,0.95); border: 1px solid #FFD700; color: #fff; padding: 10px; border-radius: 4px; font-family: monospace; width: 150px; box-shadow: 0 6px 20px #000; pointer-events: none; border-left: 4px solid #FFD700;">
            <div style="font-size: 9px; color: #FFD700; border-bottom: 1px solid #333; margin-bottom: 6px; font-weight: bold; letter-spacing: 1px;">SECTOR DATA</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
                <span style="color: #888;">DIST:</span><span style="text-align: right; color: #fff;">${metrics.dist}km</span>
                <span style="color: #888;">EST.TIME:</span><span style="text-align: right; color: #fff;">${metrics.h}h ${metrics.m}m</span>
                <span style="color: #888;">TIER:</span><span style="color: #00FF00; text-align: right; font-weight: bold;">${metrics.speed} km/h</span>
            </div>
        </div>`;

    metricFlagMarker = L.marker([metrics.mid.lat, metrics.mid.lng], {
        icon: L.divIcon({ 
            html: flagHtml, 
            className: 'tactical-flag', 
            iconSize: [160, 75], 
            iconAnchor: [80, 85] 
        }),
        interactive: false
    }).addTo(window.map);
}

function drawTacticalRoute(routeData) {
    if (currentRouteLayer) window.map.removeLayer(currentRouteLayer);
    currentRouteLayer = L.layerGroup().addTo(window.map);

    // Locked Ribbon Design [cite: 2025-12-27]
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
                
                // Keep system event alive
                window.dispatchEvent(new CustomEvent('weong:routeUpdated', { 
                    detail: {
                        totalDistance: route.distance,
                        coordinates: route.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }))
                    } 
                }));
            }
        } catch (e) {
            console.warn("Route Logic: Link busy.");
        }
    }, 40);
}

window.addEventListener('weong:ready', calculateRoute);
window.addEventListener('weong:update', calculateRoute);
