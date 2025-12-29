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
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                profile: 'driving'
            }),
            lineOptions: {
                styles: [{ color: '#0070bb', weight: 6, opacity: 0.8 }]
            },
            show: false,
            addWaypoints: false,
            routeWhileDragging: false,
            fitSelectedRoutes: false 
        }).addTo(mapInstance);

        this.control.on('routingerror', function(e) {
            console.warn("[weong-route] Level 3 Exception Triggered:", e.error.message);
        });
    },

    calculateRoute: function(start, end) {
        if (!this.control) return;
        this.control.setWaypoints([
            L.latLng(start[0], start[1]),
            L.latLng(end[0], end[1])
        ]);
    }
};

window.addEventListener('map-ready', (e) => RouteEngine.init(e.detail.map));
