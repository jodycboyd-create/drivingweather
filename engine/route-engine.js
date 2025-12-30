/**
 * ROUTE-ENGINE.JS | v.2025.12.30.FINAL
 * Purpose: High-speed "Magnetic" routing without UI interference.
 * [cite: 2025-12-30]
 */
window.RouteEngine = {
    _control: null,

    /**
     * Calculates or updates the route between markers.
     * Optimized to prevent the "Darn Panel" from appearing.
     */
    calculate: function() {
        if (!window.map || !window.hubMarkers || window.hubMarkers.length < 2) return;
        
        const pts = window.hubMarkers.map(m => m.getLatLng());

        // 1. FAST UPDATE: If the line already exists, just update its points.
        // This prevents the lag caused by destroying/creating objects [cite: 2025-12-30].
        if (this._control) {
            this._control.setWaypoints(pts);
            return;
        }

        // 2. INITIALIZATION: Build the "Silent" Routing Engine
        this._control = L.Routing.control({
            waypoints: pts,
            router: L.Routing.osrmv1({ 
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                profile: 'driving'
            }),
            
            // KILL THE UI: These settings prevent the text panel from rendering [cite: 2025-12-30]
            show: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: false, // Prevents camera jumps while dragging [cite: 2025-12-30]
            
            // Re-routing markers: set to null so the engine doesn't fight the Shell markers
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

        // 3. FINAL LOCK: Ensure the container is physically hidden in the DOM [cite: 2025-12-30]
        const container = this._control.getContainer();
        if (container) {
            container.style.display = 'none';
            container.style.visibility = 'hidden';
            container.classList.add('hidden-panel');
        }
    }
};

/**
 * Wait for the index.html shell to signal it is live before firing the first route.
 * [cite: 2025-12-30]
 */
window.addEventListener('shell-live', () => {
    console.log("Engine: Handshake Received. Initializing Silent Route...");
    // Slight delay to ensure map tiles are ready
    setTimeout(() => window.RouteEngine.calculate(), 500);
});
