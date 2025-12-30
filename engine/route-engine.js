/** * [weong-route] Tactical Route Engine 
 * Status: Anchored - Dec 30, 2025 [cite: 2025-12-30]
 */

let routeTimeout;
function calculateRoute() {
    if (window.hubMarkers.length < 2) return;

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

                // THE GLOBAL ANCHOR [cite: 2025-12-30]
                // This allows weather-bulletin.js to "see" the coordinates.
                window.currentRouteData = route; 

                drawTacticalRoute(route);
                renderStandaloneFlag(route);

                // Broadcast update for immediate listeners [cite: 2025-12-30]
                window.dispatchEvent(new CustomEvent('weong:routeUpdated', { detail: route }));
            }
        } catch (e) {
            console.warn("System: Nav link severed.");
        }
    }, 40);
}

function drawTacticalRoute(route) {
    if (window.activeRoute) window.map.removeLayer(window.activeRoute);
    window.activeRoute = L.geoJSON(route.geometry, {
        style: { color: '#000', weight: 8, opacity: 0.9 }
    }).addTo(window.map);
    
    // Add the high-contrast yellow dashed line
    L.geoJSON(route.geometry, {
        style: { color: '#FFD700', weight: 3, dashArray: '10, 10', opacity: 1 }
    }).addTo(window.map);
}

function renderStandaloneFlag(route) {
    const dist = (route.distance / 1000).toFixed(1);
    const duration = Math.round(route.duration / 60);
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    
    const midIdx = Math.floor(route.geometry.coordinates.length / 2);
    const midPoint = route.geometry.coordinates[midIdx];

    if (window.routeFlag) window.map.removeLayer(window.routeFlag);
    window.routeFlag = L.marker([midPoint[1], midPoint[0]], {
        icon: L.divIcon({
            className: 'route-flag',
            html: `<div style="background:rgba(0,0,0,0.85); color:#fff; padding:5px 10px; border:2px solid #FFD700; border-radius:15px; font-family:monospace; font-weight:bold; white-space:nowrap;">
                   ${dist}km | <span style="color:#00FF00;">${hours}h ${mins}m</span></div>`,
            iconSize: [120, 30]
        })
    }).addTo(window.map);
}

console.log("System: /engine/route-engine.js initialized.");
