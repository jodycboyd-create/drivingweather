/**
 * ROUTE-ENGINE.JS | BUILD 1735525234
 * Location: /engine/
 */
window.RouteEngine = {
    _control: null,
    calculate: function() {
        const map = window.map;
        const pts = window.hubMarkers.map(m => m.getLatLng());

        if (this._control) map.removeControl(this._control);

        this._control = L.Routing.control({
            waypoints: pts,
            createMarker: () => null,
            addWaypoints: false,
            show: false,
            lineOptions: { 
                styles: [{ color: '#ff4500', weight: 10, opacity: 0.9 }] 
            }
        }).addTo(map);
    }
};

window.addEventListener('anchor-live', () => {
    setTimeout(() => window.RouteEngine.calculate(), 500);
});
