/**
 * route-engine.js
 * STATUS: Locked Architecture [cite: 2025-12-23]
 */
const RouteEngine = {
    control: null,

    init: function(mapInstance) {
        if (!mapInstance) return;

        this.control = L.Routing.control({
            waypoints: [],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            }),
            lineOptions: {
                styles: [{ color: '#0070bb', weight: 6, opacity: 0.85 }]
            },
            show: false,
            addWaypoints: false,
            routeWhileDragging: false, 
            fitSelectedRoutes: false
        }).addTo(mapInstance);

        // [weong-route] Exception Handler [cite: 2025-12-23]
        this.control.on('routingerror', function(e) {
            console.warn("[weong-route] Level 3 Exception: Route Calculation Failure", e.error.message);
        });
    },

    calculateRoute: function(startCoords, endCoords) {
        if (!this.control) return;

        this.control.setWaypoints([
            L.latLng(startCoords[0], startCoords[1]),
            L.latLng(endCoords[0], endCoords[1])
        ]);
    }
};

window.addEventListener('map-ready', (e) => {
    RouteEngine.init(e.detail.map);
});
