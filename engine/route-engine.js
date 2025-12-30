/** * [weong-route] Tactical Route Engine 
 * Restore Point: Dec 30, 2025 - Stable Routing Build [cite: 2025-12-30]
 */

(function() {
    let routeTimeout;

    window.calculateRoute = async function() {
        if (!window.hubMarkers || window.hubMarkers.length < 2) return;

        const start = window.hubMarkers[0].getLatLng();
        const end = window.hubMarkers[1].getLatLng();
        const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.routes && data.routes[0]) {
                const route = data.routes[0];
                
                // CRITICAL ANCHOR: This fixes the "No route data" error in weather [cite: 2025-12-30]
                window.currentRouteData = route; 

                drawTacticalRoute(route);
                renderStandaloneFlag(route);

                // Notify other modules [cite: 2025-12-30]
                window.dispatchEvent(new CustomEvent('weong:routeUpdated', { detail: route }));
            }
        } catch (e) {
            console.warn("System: Nav link severed.");
        }
    };

    function drawTacticalRoute(route) {
        if (window.activeRoute) window.map.removeLayer(window.activeRoute);
        if (window.activeRouteCasing) window.map.removeLayer(window.activeRouteCasing);

        // Black Casing
        window.activeRouteCasing = L.geoJSON(route.geometry, {
            style: { color: '#000', weight: 9, opacity: 0.9 }
        }).addTo(window.map);

        // Yellow Tactical Line
        window.activeRoute = L.geoJSON(route.geometry, {
            style: { color: '#FFD700', weight: 3, dashArray: '10, 10', opacity: 1 }
        }).addTo(window.map);
    }

    function renderStandaloneFlag(route) {
        const dist = (route.distance / 1000).toFixed(1);
        const duration = Math.round(route.duration / 60);
        const hours = Math.floor(duration / 60);
        const mins = duration % 60;
        
        const coords = route.geometry.coordinates;
        const midPoint = coords[Math.floor(coords.length / 2)];

        if (window.routeFlag) window.map.removeLayer(window.routeFlag);
        window.routeFlag = L.marker([midPoint[1], midPoint[0]], {
            icon: L.divIcon({
                className: 'route-flag',
                html: `<div style="background:rgba(0,0,0,0.9); color:#fff; padding:5px 10px; border:2px solid #FFD700; border-radius:12px; font-family:monospace; font-weight:bold; white-space:nowrap; font-size:12px;">
                       ${dist}km | <span style="color:#00FF00;">${hours}h ${mins}m</span></div>`,
                iconSize: [110, 25]
            })
        }).addTo(window.map);
    }

    console.log("System: /engine/route-engine.js restored.");
})();
