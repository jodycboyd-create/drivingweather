window.RouteEngine = {
    _control: null,

    calculate: function() {
        if (!window.map || window.hubMarkers.length < 2) return;
        const pts = window.hubMarkers.map(m => m.getLatLng());

        // PERFORMANCE: If the line exists, just move it. Do not recreate it.
        if (this._control) {
            this._control.setWaypoints(pts);
            return;
        }

        // INITIALIZE SILENTLY
        this._control = L.Routing.control({
            waypoints: pts,
            router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
            lineOptions: { styles: [{ color: '#0070bb', weight: 8, opacity: 0.7 }] },
            createMarker: () => null,
            addWaypoints: false,
            draggableWaypoints: false,
            show: false, // Kill the panel via JS
            fitSelectedRoutes: false
        }).addTo(window.map);
    }
};

window.addEventListener('shell-live', () => {
    setTimeout(() => window.RouteEngine.calculate(), 500);
});
