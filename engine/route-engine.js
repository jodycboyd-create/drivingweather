/**
 * ROUTE-ENGINE.JS | FINAL SILENT BUILD
 * Purpose: Instant road-snapping without the directions panel.
 */
window.RouteEngine = {
    _control: null,

    calculate: function() {
        // Ensure markers exist before attempting math
        if (!window.map || !window.hubMarkers || window.hubMarkers.length < 2) {
            console.log("Engine: Waiting for markers...");
            return;
        }
        
        const pts = window.hubMarkers.map(m => m.getLatLng());

        // PERFORMANCE: Update existing line instead of rebuilding [cite: 2025-12-30]
        if (this._control) {
            this._control.setWaypoints(pts);
            return;
        }

        // INITIALIZE SILENT ROUTER
        this._control = L.Routing.control({
            waypoints: pts,
            router: L.Routing.osrmv1({ 
                serviceUrl: 'https://router.project-osrm.org/route/v1' 
            }),
            lineOptions: {
                styles: [{ color: '#0070bb', weight: 8, opacity: 0.7 }]
            },
            show: false,              // Kills the text panel [cite: 2025-12-30]
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: false,
            createMarker: () => null  // Uses Shell markers only
        }).addTo(window.map);

        // UI KILL-SWITCH: Physically remove the panel container if it appears
        const container = this._control.getContainer();
        if (container) {
            container.style.display = 'none';
        }
    }
};

// HANDSHAKE: Listen for the 'shell-live' event from index.html [cite: 2025-12-30]
window.addEventListener('shell-live', () => {
    console.log("Engine: Handshake Confirmed.");
    setTimeout(() => window.RouteEngine.calculate(), 500);
});
