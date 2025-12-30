/**
 * ROUTE-ENGINE.JS | NEON OVERRIDE
 */
window.RouteEngine = {
    _control: null,
    calculate: function() {
        if (!window.map || window.hubMarkers.length < 2) return;
        if (this._control) window.map.removeControl(this._control);

        this._control = L.Routing.control({
            waypoints: window.hubMarkers.map(m => m.getLatLng()),
            createMarker: () => null,
            lineOptions: { styles: [{ color: '#00FF00', weight: 12, opacity: 1.0 }] }
        }).addTo(window.map);
    }
};

window.addEventListener('engine-fire', () => {
    setTimeout(() => window.RouteEngine.calculate(), 600);
});
