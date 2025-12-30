window.RouteEngine = {
    _control: null,

    calculate: function() {
        // Safety check to prevent errors if markers aren't ready
        if (!window.map || !window.hubMarkers || window.hubMarkers.length < 2) return;
        
        const pts = window.hubMarkers.map(m => m.getLatLng());

        // 1. If line exists, update it (Fastest)
        if (this._control) {
            this._control.setWaypoints(pts);
            return;
        }

        // 2. Initial Creation (Silent Build)
        this._control = L.Routing.control({
            waypoints: pts,
            router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
            lineOptions: { styles: [{ color: '#0070bb', weight: 8, opacity: 0.7 }] },
            createMarker: () => null,
            addWaypoints: false,
            draggableWaypoints: false,
            show: false,
            fitSelectedRoutes: false
        }).addTo(window.map);
    }
};

// RELIABLE HANDSHAKE
window.addEventListener('shell-live', () => {
    console.log("Engine: Handshake Received.");
    // Small delay to ensure the map is fully rendered
    setTimeout(() => window.RouteEngine.calculate(), 100);
});
