/** [weong-route] Core Routing Engine - Folder Locked Build **/

let currentRouteLayer = null;

// Tactical Route Logic [cite: 2025-12-23, 2025-12-30]
async function calculateRoute() {
    if (!window.hubMarkers || window.hubMarkers.length < 2) return;

    const start = window.hubMarkers[0].getLatLng();
    const end = window.hubMarkers[1].getLatLng();

    // OSRM Service Call
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes[0]) {
            const route = data.routes[0];
            drawRoute(route);
            
            // Handshake: Tell the Velocity Widget we have a new route
            window.dispatchEvent(new CustomEvent('weong:routeUpdated', { 
                detail: {
                    summary: route.summary,
                    coordinates: route.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] })),
                    totalDistance: route.distance
                } 
            }));
        }
    } catch (error) {
        console.error("Routing Engine: Transmission Failed", error);
    }
}

function drawRoute(route) {
    if (currentRouteLayer) window.map.removeLayer(currentRouteLayer);

    currentRouteLayer = L.geoJSON(route.geometry, {
        style: {
            color: '#0070bb', // Standard NL Blue
            weight: 6,
            opacity: 0.8,
            lineJoin: 'round'
        }
    }).addTo(window.map);

    // Zoom to fit if it's the first load
    if (!window.routeInitialized) {
        window.map.fitBounds(currentRouteLayer.getBounds(), { padding: [50, 50] });
        window.routeInitialized = true;
    }
}

// Global System Listeners
window.addEventListener('weong:ready', () => {
    console.log("Routing Engine: Tactical Handshake Complete.");
    calculateRoute();
});

window.addEventListener('weong:update', () => {
    calculateRoute();
});

// Export for manifest loader
export { calculateRoute };
