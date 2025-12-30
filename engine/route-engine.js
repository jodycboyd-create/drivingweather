/**
 * ROUTE-ENGINE.JS | SILENT PERFORMANCE BUILD
 * Optimized for real-time magnetism without UI lag.
 * [cite: 2025-12-30]
 */
window.RouteEngine = {
    _control: null,

    calculate: function() {
        if (!window.map || !window.hubMarkers || window.hubMarkers.length < 2) return;
        
        const pts = window.hubMarkers.map(m => m.getLatLng());

        // 1. PERFORMANCE: If the line exists, just update its waypoints.
        // This is the fastest method and prevents the "Darn Panel" from flashing [cite: 2025-12-30].
        if (this._control) {
            this._control.setWaypoints(pts);
            return;
        }

        // 2. INITIALIZATION: Build the "Silent" Router
        this._control = L.Routing.control({
            waypoints: pts,
            router: L.Routing.osrmv1({ 
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                profile: 'driving'
            }),
            
            // KILL THE PANEL: Forces the itinerary to stay empty and hidden [cite: 2025-12-30]
            show: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: false, 
            
            // Marker bypass: Shell owns the markers, Engine stays invisible
            createMarker: function() { return null; }, 

            lineOptions: {
                styles: [{ 
                    color: '#0070bb', 
                    weight: 8, 
                    opacity: 0.7 
                }],
                addWaypoints: false
            }
        }).addTo(window.map);

        // 3. FINAL LOCK: Physically hide the container in case the library ignores 'show: false'
        const container = this._control.getContainer();
        if (container) {
            container.style.display = 'none';
            container.style.visibility = 'hidden';
            container.style.pointerEvents = 'none';
        }
    }
};

/**
 * Handshake listener: Wait for the shell to finish its first build [cite: 2025-12-30].
 */
window.addEventListener('shell-live', () => {
    console.log("Engine: Silent Handshake Confirmed.");
    setTimeout(() => window.RouteEngine.calculate(), 500);
});
