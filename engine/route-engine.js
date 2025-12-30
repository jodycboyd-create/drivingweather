/**
 * ROUTE-ENGINE.JS | v.2025.12.29.15
 * Folder: /engine/
 * Logic: Owns all routing and metric display
 */
window.RouteEngine = {
    _control: null,
    _metricBox: null,

    sync: function() {
        const map = window.map;
        if (!map || !window.hubMarkers || window.hubMarkers.length < 2) return;

        // Cleanup
        if (this._control) map.removeControl(this._control);
        if (this._metricBox) map.removeLayer(this._metricBox);

        const pts = window.hubMarkers.map(m => m.getLatLng());

        this._control = L.Routing.control({
            waypoints: pts,
            createMarker: () => null,
            addWaypoints: false,
            lineOptions: { styles: [{ color: '#0070bb', weight: 7, opacity: 0.8 }] }
        }).addTo(map);

        this._control.on('routesfound', (e) => {
            const r = e.routes[0];
            const dist = r.summary.totalDistance / 1000;
            const mid = r.coordinates[Math.floor(r.coordinates.length / 2)];

            // NL Weighted Speeds
            const avgSpeed = 91; 
            const totalHours = dist / avgSpeed;
            const h = Math.floor(totalHours);
            const m = Math.round((totalHours - h) * 60);

            const displayTime = h > 0 ? `${h}h ${m}m` : `${m}m`;

            this._metricBox = L.marker(mid, {
                icon: L.divIcon({
                    className: 'route-metric',
                    html: `
                        <div style="background:#111; color:white; border:2px solid #0070bb; padding:10px; border-radius:4px; text-align:center; width:110px; box-shadow:0 6px 12px rgba(0,0,0,0.6); transform:translate(-50%, -130%);">
                            <div style="font-size:10px; color:#0070bb; font-weight:bold;">EST. DRIVE</div>
                            <div style="font-size:18px; font-weight:bold; margin:2px 0;">${displayTime}</div>
                            <div style="font-size:11px; border-top:1px solid #333; margin-top:5px; padding-top:3px;">${dist.toFixed(1)} KM</div>
                        </div>
                    `,
                    iconSize: [0, 0]
                })
            }).addTo(map);
        });
    }
};

// Listen for the app to be ready before firing the first route
window.addEventListener('app-ready', () => {
    setTimeout(() => window.RouteEngine.sync(), 300);
});
