/**
 * ROUTE-ENGINE.JS | SILENT PERFORMANCE BUILD
 * Zero UI, Zero Lag, Real-time Magnetism.
 */
window.RouteEngine = {
    _control: null,

    calculate: function() {
        if (!window.map || window.hubMarkers.length < 2) return;
        
        const waypoints = window.hubMarkers.map(m => m.getLatLng());

        // 1. If control exists, just update waypoints instead of re-adding to map
        // This is significantly faster than removing/adding the whole control
        if (this._control) {
            this._control.setWaypoints(waypoints);
            return;
        }

        // 2. Initial Setup: Create the "Silent" Router
        this._control = L.Routing.control({
            waypoints: waypoints,
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                profile: 'driving'
            }),
            lineOptions: {
                styles: [{ color: '#0070bb', weight: 8, opacity: 0.7 }],
                addWaypoints: false
            },
            createMarker: () => null, // Shell owns markers [cite: 2025-12-30]
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: false, // Prevents camera jumps while dragging
            show: false,              // Disables the panel [cite: 2025-12-30]
            containerClassName: 'hidden' // Final fallback to hide UI
        }).addTo(window.map);
    }
};

window.addEventListener('shell-live', () => {
    setTimeout(() => window.RouteEngine.calculate(), 500);
});
