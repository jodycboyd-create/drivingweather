/**
 * ROUTE-ENGINE.JS | v.2025.12.30.FIX
 * Purpose: Robust handshake and high-speed silent routing.
 * [cite: 2025-12-30]
 */
window.RouteEngine = {
    _control: null,

    calculate: function() {
        // 1. Validate environment and marker data [cite: 2025-12-30]
        if (!window.map || !window.hubMarkers || window.hubMarkers.length < 2) return;
        
        // Ensure we are passing valid Leaflet LatLng objects
        const pts = window.hubMarkers.map(m => m.getLatLng());

        // 2. PERFORMANCE: Update existing control if it exists [cite: 2025-12-30]
        if (this._control) {
            try {
                this._control.setWaypoints(pts);
                return;
            } catch (e) {
                console.warn("Update failed, re-initializing engine...");
            }
        }

        // 3. INITIALIZATION: Build the "Silent" Engine [cite: 2025-12-30]
        this._control = L.Routing.control({
            waypoints: pts,
            router: L.Routing.osrmv1({ 
                serviceUrl: 'https://router.project-osrm.org/route/v1' 
            }),
            lineOptions: {
                styles: [{ color: '#0070bb', weight: 8, opacity: 0.7 }],
                addWaypoints: false
            },
            createMarker: () => null, 
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: false,
            show: false // Internal flag to hide the panel [cite: 2025-12-30]
        }).addTo(window.map);

        // 4. NUCLEAR PANEL KILLER: Force removal from the DOM [cite: 2025-12-30]
        const container = this._control.getContainer();
        if (container) {
            container.style.display = 'none';
            container.style.visibility = 'hidden';
            container.innerHTML = ''; // Empty it so it takes no space or CPU
        }
    }
};

// ROBUST HANDSHAKE: Listen for shell signal or window load [cite: 2025-12-30]
window.addEventListener('shell-live', () => {
    console.log("Engine: Shell Signal Received.");
    setTimeout(() => window.RouteEngine.calculate(), 250); // Increased buffer for stability
});

// Fallback: If shell-live was missed, try once more when everything is loaded
window.addEventListener('load', () => {
    if (!window.RouteEngine._control) {
        setTimeout(() => window.RouteEngine.calculate(), 1000);
    }
});
