/**
 * ROUTE-ENGINE.JS | TIMESTAMP: 1735520820
 * SOLE OWNER of Routing and Metrics.
 */
window.RouteEngine = {
    _control: null,
    _flag: null,

    calculate: function() {
        if (!window.map || !window.hubMarkers) return;
        const pts = window.hubMarkers.map(m => m.getLatLng());

        if (this._control) window.map.removeControl(this._control);
        if (this._flag) window.map.removeLayer(this._flag);

        this._control = L.Routing.control({
            waypoints: pts,
            createMarker: () => null,
            addWaypoints: false,
            show: false,
            lineOptions: { styles: [{ color: '#0070bb', weight: 8, opacity: 0.8 }] }
        }).addTo(window.map);

        this._control.on('routesfound', (e) => {
            const r = e.routes[0];
            const dist = r.summary.totalDistance / 1000;
            const mid = r.coordinates[Math.floor(r.coordinates.length / 2)];

            // NL Weighted Speed Logic
            const avgSpeed = 91; 
            const hours = dist / avgSpeed;
            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);

            this._flag = L.marker(mid, {
                icon: L.divIcon({
                    className: 'engine-flag',
                    html: `<div style="background:#111; color:white; border:2px solid #0070bb; padding:8px; border-radius:4px; text-align:center; min-width:100px; transform:translate(-50%, -120%); box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                        <div style="font-size:16px; font-weight:bold;">${h > 0 ? h+'h ' : ''}${m}m</div>
                        <div style="font-size:10px; border-top:1px solid #444; margin-top:4px;">${dist.toFixed(1)} KM</div>
                    </div>`,
                    iconSize: [0, 0]
                })
            }).addTo(window.map);
        });
    }
};

window.addEventListener('shell-ready', () => {
    setTimeout(() => window.RouteEngine.calculate(), 500);
});
