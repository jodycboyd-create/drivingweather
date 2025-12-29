/**
 * route-engine.js
 * COMPATIBILITY: Leaflet 1.9.4 + Leaflet Routing Machine
 * ANCHOR: 2025-12-27
 */

const RouteEngine = {
    control: null,

    // Initialize the routing engine using Leaflet Routing Machine
    init: function(mapInstance) {
        if (!mapInstance) {
            console.error("[route-engine] No Leaflet map instance found.");
            return;
        }

        console.log("[route-engine] Initializing Leaflet Routing Engine...");

        // Ensure we are using the Leaflet global 'L'
        this.control = L.Routing.control({
            waypoints: [],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            }),
            lineOptions: {
                styles: [{ color: '#0070bb', weight: 5, opacity: 0.7 }]
            },
            show: false, // Prevents the text itinerary from breaking the sidebar layout
            addWaypoints: false,
            routeWhileDragging: false,
            fitSelectedRoutes: true
        }).addTo(mapInstance);

        // LEVEL 3 EXCEPTION TRIGGER: [weong-route]
        this.control.on('routingerror', function(e) {
            console.warn("[weong-route] Level 3 Exception Triggered:", e.error.message);
        });
    },

    // Function to calculate route between two points
    calculateRoute: function(startCoords, endCoords) {
        if (!this.control) return;

        this.control.setWaypoints([
            L.latLng(startCoords[0], startCoords[1]),
            L.latLng(endCoords[0], endCoords[1])
        ]);
    },

    clear: function() {
        if (this.control) {
            this.control.setWaypoints([]);
        }
    }
};

// Auto-init listener
window.addEventListener('map-ready', (e) => {
    RouteEngine.init(e.detail.map);
});
