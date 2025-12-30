/**
 * ROUTE-ENGINE.JS | v.2025.12.29.16
 * Ownership: Full Control of Routing and Flag Metrics
 */
window.RouteEngine = {
    _control: null,
    _flag: null,

    calculate: function() {
        const map = window.map;
        const pts = (window.hubMarkers || []).map(m => m.getLatLng());
        
        if (!map || pts.length < 2) return;

        // Cleanup previous engine artifacts
        if (this._control) map.removeControl(this._control);
        if (this._flag) map.removeLayer(this._flag);

        // CREATE ROUTE (Owned by Engine)
        this._control = L.Routing.control({
            waypoints: pts,
            createMarker: () => null,
            addWaypoints: false,
            show: false, // Hides directions panel
            lineOptions: { styles: [{ color: '#0070bb', weight: 8, opacity: 0.9 }] }
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

            // RENDER FLAG (Owned by Engine)
            this._flag = L.marker(mid, {
                icon: L.divIcon({
                    className: 'engine-flag',
                    html: `
                        <div style="background:#111; color:white; border:2px solid #0070bb; padding:10px; border-radius:4px; text-align:center; width:110px; box-shadow:0 6px 12px rgba(0,0,0,0.6); transform:translate(-50%, -130%);">
                            <div style="font-size:10px; color:#0070bb; font-weight:bold; letter-spacing:1px;">EST. DRIVE</div>
                            <div style="font-size:18px; font-weight:bold; margin:2px 0;">${h > 0 ? h+'h ' : ''}${m}m</div>
                            <div style="font-size:11px; border-top:1px solid #333; margin-top:5px; padding-top:3px;">${dist.toFixed(1)} KM</div>
                        </div>
                    `,
                    iconSize: [0, 0]
                })
            }).addTo(map);
        });
    }
};

// Start engine once shell signals readiness
window.addEventListener('engine-init', () => {
    setTimeout(() => window.RouteEngine.calculate(), 300);
});
