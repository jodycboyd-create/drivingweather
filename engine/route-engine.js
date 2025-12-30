/**
 * ROUTE-ENGINE.JS | v.2025.12.29.17
 * CORE FUNCTIONALITY CHECK: RED SQUARE INJECTION
 */
const RouteEngine = {
    _control: null,
    _testBlock: null,

    calculateRoute: function(start, end) {
        // Direct global access to the map defined in your locked index.html [cite: 2025-12-27]
        const map = window.map; 
        if (!map) return;

        // Cleanup
        if (this._control) map.removeControl(this._control);
        if (this._testBlock) map.removeLayer(this._testBlock);

        this._control = L.Routing.control({
            waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
            createMarker: () => null,
            addWaypoints: false,
            show: false,
            lineOptions: { styles: [{ color: '#0070bb', weight: 6 }] }
        }).addTo(map);

        this._control.on('routesfound', (e) => {
            const route = e.routes[0];
            const mid = route.coordinates[Math.floor(route.coordinates.length / 2)];

            // Create a simple 500m x 500m red square block to confirm functionality
            const bounds = [
                [mid.lat - 0.005, mid.lng - 0.005], 
                [mid.lat + 0.005, mid.lng + 0.005]
            ];

            this._testBlock = L.rectangle(bounds, {
                color: "#ff0000", 
                weight: 1, 
                fillOpacity: 1,
                zIndexOffset: 2000 
            }).addTo(map);

            console.log("Functionality confirmed: Red block injected at", mid);
        });
    }
};
