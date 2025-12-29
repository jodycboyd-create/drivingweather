/**
 * route-engine.js
 * ANCHOR: 2025-12-29
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

        // [weong-route] Level 3 Exception Monitor [cite: 2025-12-23]
        this.control.on('routingerror', (e) => {
            console.warn("[weong-route] Exception: No Road Link Found", e.error.message);
        });
    },

    calculateRoute: function(start, end) {
        if (!this.control) {
            console.error("RouteEngine not initialized");
            return;
        }
        // Set waypoints based on snapped community coordinates
        this.control.setWaypoints([
            L.latLng(start[0], start[1]),
            L.latLng(end[0], end[1])
        ]);
    }
};

// Ensure initialization on map-ready event [cite: 2025-12-27]
window.addEventListener('map-ready', (e) => {
    RouteEngine.init(e.detail.map);
});
