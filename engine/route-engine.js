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

        // Setup the OSRM Router
        this.control = L.Routing.control({
            waypoints: [],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            }),
            lineOptions: {
                styles: [{ color: '#0070bb', weight: 5, opacity: 0.7 }]
            },
            show: false, // Prevents text itinerary from cluttering UI
            addWaypoints: false,
            routeWhileDragging: false,
            fitSelectedRoutes: false // Keeps zoom steady while dragging
        }).addTo(mapInstance);

        // LEVEL 3 EXCEPTION TRIGGER: [weong-route]
        this.control.on('routingerror', function(e) {
            console.warn("[weong-route] Level 3 Exception Triggered: No Road Link Found", e.error.message);
        });
    },

    // Function to calculate route between snapped community coordinates
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

// Auto-init listener triggered by index.html
window.addEventListener('map-ready', (e) => {
    RouteEngine.init(e.detail.map);
});
