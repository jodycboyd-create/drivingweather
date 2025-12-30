/**
 * ROUTE-ENGINE.JS | MAGNETIC UPDATE
 */
window.RouteEngine = {
    _control: null,
    _throttleTimeout: null,

    calculate: function() {
        // Throttle the calculation to 30ms to keep it smooth but responsive
        clearTimeout(this._throttleTimeout);
        this._throttleTimeout = setTimeout(() => {
            if (!window.map || window.hubMarkers.length < 2) return;
            
            const pts = window.hubMarkers.map(m => m.getLatLng());

            if (this._control) window.map.removeControl(this._control);

            this._control = L.Routing.control({
                waypoints: pts,
                router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
                createMarker: () => null,
                addWaypoints: false,
                draggableWaypoints: false,
                show: false,
                lineOptions: { 
                    styles: [{ color: '#0070bb', weight: 8, opacity: 0.7 }],
                    extendToWaypoints: true,
                    missingRouteTolerance: 0
                }
            }).addTo(window.map);
        }, 30); 
    }
};

window.addEventListener('shell-live', () => {
    setTimeout(() => window.RouteEngine.calculate(), 500);
});
