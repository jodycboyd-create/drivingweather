/**
 * route-engine.js
 * PATH: /engine/route-engine.js
 */
const RouteEngine = {
    control: null,

    init: function(mapInstance) {
        if (!mapInstance || this.control) return;

        this.control = L.Routing.control({
            waypoints: [],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                profile: 'driving'
            }),
            lineOptions: {
                styles: [{ color: '#0070bb', weight: 6, opacity: 0.85 }]
            },
            show: false,
            addWaypoints: false,
            routeWhileDragging: false, 
            fitSelectedRoutes: false
        }).addTo(mapInstance);

        // [weong-route] Monitor for road connection errors
        this.control.on('routingerror', (e) => {
            console.warn("[weong-route] Connection Failed:", e.error.message);
        });
    },

    calculateRoute: function(start, end) {
        if (!this.control) return;
        // Use snapped lat/lng to avoid "ocean drift" gray lines
        this.control.setWaypoints([
            L.latLng(start[0], start[1]),
            L.latLng(end[0], end[1])
        ]);
    }
};

window.addEventListener('map-ready', (e) => RouteEngine.init(e.detail.map));
