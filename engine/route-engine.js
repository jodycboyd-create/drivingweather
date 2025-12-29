/**
 * route-engine.js
 * PATH: /engine/engine/route-engine.js
 * STATUS: Locked [cite: 2025-12-23]
 */
const RouteEngine = {
    control: null,

    init: function(mapInstance) {
        if (!mapInstance) return;

        this.control = L.Routing.control({
            waypoints: [],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                timeout: 10000 // Extended timeout for NL rural pathing
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

    calculateRoute: function(start, end) {
        if (!this.control) return;
        
        // Ensure coordinates are valid numbers to prevent "Connection Failed"
        const w1 = L.latLng(start[0], start[1]);
        const w2 = L.latLng(end[0], end[1]);

        this.control.setWaypoints([w1, w2]);
    }
};

window.addEventListener('map-ready', (e) => RouteEngine.init(e.detail.map));
