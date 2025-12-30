/**
 * ROUTE-ENGINE.JS | v.2025.12.30.FINAL
 * High-performance silent routing for Newfoundland.
 */
window.RouteEngine = {
    _control: null,

    calculate: function() {
        if (!window.map || !window.hubMarkers || window.hubMarkers.length < 2) return;
        
        const pts = window.hubMarkers.map(m => m.getLatLng());

        // 1. PERFORMANCE: If the line exists, just slide it. 
        // This is 10x faster than recreating the whole object.
        if (this._control) {
            this._control.setWaypoints(pts);
            return;
        }

        // 2. INITIALIZATION: Build the silent engine (fires once)
        this._control = L.Routing.control({
            waypoints: pts,
            router: L.Routing.osrmv1({ 
                serviceUrl: 'https://router.project-osrm.org/route/v1' 
            }),
            lineOptions: {
                styles: [{ color: '#0070bb', weight: 8, opacity: 0.7 }]
            },
            show: false,              // Kills the text panel
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: false, // Stops camera jumping while dragging
            createMarker: () => null  // Shell owns the markers
        }).addTo(window.map);

        // 3. NUCLEAR UI BLOCK: Physically hide the panel container
        const container = this._control.getContainer();
        if (container) {
            container.style.display = 'none';
        }
    }
};

window.addEventListener('shell-live', () => {
    console.log("Engine: Handshake Received.");
    setTimeout(() => window.RouteEngine.calculate(), 500);
});
