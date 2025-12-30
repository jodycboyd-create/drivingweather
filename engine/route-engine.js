/**
 * ROUTE-ENGINE.JS | v.2025.12.29.13
 * Primary Route Controller & Metric Injector
 */
window.RouteEngine = {
    _control: null,
    _flag: null,

    calculate: function() {
        const map = window.map;
        const waypoints = window.hubMarkers.map(m => m.getLatLng());
        
        if (!map || waypoints.length < 2) return;

        // Cleanup
        if (this._control) map.removeControl(this._control);
        if (this._flag) map.removeLayer(this._flag);

        this._control = L.Routing.control({
            waypoints: waypoints,
            createMarker: () => null,
            addWaypoints: false,
            show: false,
            lineOptions: { styles: [{ color: '#0070bb', weight: 6 }] }
        }).addTo(map);

        this._control.on('routesfound', (e) => {
            const route = e.routes[0];
            const dist = route.summary.totalDistance / 1000;
            const mid = route.coordinates[Math.floor(route.coordinates.length / 2)];

            /** * WEIGHTED SPEED LOGIC
             * TCH @ 100 (70%) | Connector @ 80 (20%) | Local @ 50 (10%)
             * Weighted Avg = 91 km/h
             */
            const hours = dist / 91;
            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);

            this._flag = L.marker(mid, {
                icon: L.divIcon({
                    className: 'engine-metric-flag',
                    html: `
                        <div style="background:#1a1a1a; color:white; border:2px solid #0070bb; padding:8px; border-radius:4px; text-align:center; min-width:90px; transform:translate(-50%, -120%);">
                            <div style="font-size:9px; color:#0070bb; font-weight:bold;">EST. TRAVEL</div>
                            <div style="font-size:16px; font-weight:bold;">${h > 0 ? h+'h ' : ''}${m}m</div>
                            <div style="font-size:10px; border-top:1px solid #444; margin-top:4px;">${dist.toFixed(1)} KM</div>
                        </div>
                    `,
                    iconSize: [0, 0]
                })
            }).addTo(map);
        });
    }
};
