/**
 * ROUTE-ENGINE.JS | v.2025.12.30.01
 * Responsible for the "Magnetism" and the Route Line.
 */
window.RouteEngine = {
    _control: null,

    calculate: function() {
        console.log("Engine: Calculating Route..."); // PROOF OF LIFE
        
        if (!window.map || window.hubMarkers.length < 2) return;
        const pts = window.hubMarkers.map(m => m.getLatLng());

        // Clear the old line before drawing the new one
        if (this._control) {
            window.map.removeControl(this._control);
        }

        // DRAW THE MAGNETIZED ROUTE
        this._control = L.Routing.control({
            waypoints: pts,
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            }),
            createMarker: () => null, // Shell owns markers, Engine stays "dumb"
            addWaypoints: false,
            draggableWaypoints: false,
            show: false,
            lineOptions: {
                styles: [{ color: '#0070bb', weight: 8, opacity: 0.8 }]
            }
        }).addTo(window.map);
    }
};

// Listen for the shell to finish loading
window.addEventListener('shell-live', () => {
    console.log("Engine: Handshake Received.");
    setTimeout(() => window.RouteEngine.calculate(), 800);
});
