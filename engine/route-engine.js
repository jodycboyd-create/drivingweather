/**
 * ROUTE-ENGINE.JS | v.2025.12.29.17
 * This file is the SOLE owner of the routing line and the metric flag.
 */
window.RouteEngine = {
    _control: null,
    _flag: null,

    calculate: function() {
        const map = window.map;
        const waypoints = window.hubMarkers.map(m => m.getLatLng());

        if (this._control) map.removeControl(this._control);
        if (this._flag) map.removeLayer(this._flag);

        // CREATE THE LINE (Engine Only)
        this._control = L.Routing.control({
            waypoints: waypoints,
            createMarker: () => null,
            addWaypoints: false,
            show: false,
            lineOptions: { styles: [{ color: '#0070bb', weight: 8 }] }
        }).addTo(map);

        this._control.on('routesfound', (e) => {
            const route = e.routes[0];
            const dist = route.summary.totalDistance / 1000;
            const mid = route.coordinates[Math.floor(route.coordinates.length / 2)];

            // NL Tiered Speeds (Avg 91km/h)
            const hours = dist / 91;
            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);

            // CREATE THE FLAG (Engine Only)
            this._flag = L.marker(mid, {
                icon: L.divIcon({
                    className: 'engine-flag',
                    html: `<div style="background:#111; color:white; border:2px solid #0070bb; padding:8px; border-radius:4px; text-align:center; min-width:100px; transform:translate(-50%, -120%);">
                        <div style="font-size:16px; font-weight:bold;">${h > 0 ? h+'h ' : ''}${m}m</div>
                        <div style="font-size:10px; border-top:1px solid #444;">${dist.toFixed(1)} KM</div>
                    </div>`,
                    iconSize: [0, 0]
                })
            }).addTo(map);
        });
    }
};

// INITIAL HANDSHAKE
window.addEventListener('shell-ready', () => {
    setTimeout(() => window.RouteEngine.calculate(), 500);
});
