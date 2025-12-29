/**
 * route-engine.js
 * PATH: /engine/engine/route-engine.js
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

        // [weong-route] Level 3 Exception Handler [cite: 2025-12-23]
        this.control.on('routingerror', function(e) {
            console.warn("[weong-route] Level 3 Exception: No Road Connection", e.error.message);
        });
    },

    calculateRoute: function(start, end) {
        if (!this.control) return;

        // Waypoints are set only using verified snapped coordinates [cite: 2025-12-26]
        this.control.setWaypoints([
            L.latLng(start[0], start[1]),
            L.latLng(end[0], end[1])
        ]);
    }
};

window.addEventListener('map-ready', (e) => RouteEngine.init(e.detail.map));
