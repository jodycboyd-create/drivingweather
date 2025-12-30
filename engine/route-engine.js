/**
 * ROUTE-ENGINE.JS | HIGH-PERFORMANCE BUILD
 * Removes UI panels and optimizes "Magnetic" responsiveness.
 */
window.RouteEngine = {
    _control: null,
    _timeout: null,

    calculate: function() {
        // 1. Debounce: Wait 30ms before sending a request to avoid lag [cite: 2025-12-30]
        clearTimeout(this._timeout);
        this._timeout = setTimeout(() => {
            if (!window.map || window.hubMarkers.length < 2) return;
            
            const waypoints = window.hubMarkers.map(m => m.getLatLng());

            // 2. Clean up old routes instantly [cite: 2025-12-30]
            if (this._control) {
                window.map.removeControl(this._control);
            }

            // 3. Create the route WITHOUT the directions panel
            this._control = L.Routing.control({
                waypoints: waypoints,
                router: L.Routing.osrmv1({
                    serviceUrl: 'https://router.project-osrm.org/route/v1'
                }),
                createMarker: () => null, // Shell owns markers [cite: 2025-12-30]
                addWaypoints: false,
                draggableWaypoints: false,
                
                // HIDE DIRECTIONS PANEL
                show: false, 
                collapsible: true,
                itineraryClassName: 'hidden-itinerary', 

                lineOptions: {
                    styles: [{ color: '#0070bb', weight: 8, opacity: 0.7 }],
                    addWaypoints: false
                }
            }).addTo(window.map);
            
            console.log("Magnetic Route Updated"); 
        }, 30); 
    }
};

// Listen for the shell to finish its baseline build [cite: 2025-12-28, 2025-12-30]
window.addEventListener('shell-live', () => {
    setTimeout(() => window.RouteEngine.calculate(), 500);
});
