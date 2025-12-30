/**
 * ROUTE-ENGINE.JS | SILENT PERFORMANCE BUILD
 * Purpose: High-speed road-snapping without UI interference.
 * [cite: 2025-12-30]
 */
window.RouteEngine = {
    _control: null,

    /**
     * Updates or initializes the routing line based on global markers.
     */
    calculate: function() {
        // 1. Safety check to prevent errors if markers aren't ready [cite: 2025-12-30]
        if (!window.map || !window.hubMarkers || window.hubMarkers.length < 2) return;
        
        const pts = window.hubMarkers.map(m => m.getLatLng());

        // 2. PERFORMANCE: If line exists, update waypoints rather than re-creating.
        // This is the key to removing the lag and ensuring "Magnetic" updates [cite: 2025-12-30].
        if (this._control) {
            this._control.setWaypoints(pts);
            return;
        }

        // 3. INITIALIZATION: Build the "Silent" Routing Engine (Fires once)
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
            
            // Marker bypass: Shell owns the markers, Engine stays invisible [cite: 2025-12-30]
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

        // 4. FINAL LOCK: Physically hide the container if it appears in the DOM [cite: 2025-12-30]
        const container = this._control.getContainer();
        if (container) {
            container.style.display = 'none';
            container.style.visibility = 'hidden';
            container.classList.add('hidden-panel');
        }
    }
};

/**
 * RELIABLE HANDSHAKE: Listen for the 'shell-live' event from index.html [cite: 2025-12-30].
 */
window.addEventListener('shell-live', () => {
    console.log("Engine: Handshake Received. Initializing Silent Route...");
    // 100ms delay ensures the map is fully rendered before the first line draw [cite: 2025-12-30]
    setTimeout(() => window.RouteEngine.calculate(), 100);
});
