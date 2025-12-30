/**
 * ROUTE-ENGINE.JS | v.2025.12.29.12
 * Handshake Verified: Renders Travel Metrics Flag
 */
window.RouteEngine = {
    _flag: null,

    render: function(route) {
        const map = window.map;
        if (!map) return;

        if (this._flag) map.removeLayer(this._flag);

        const dist = route.summary.totalDistance / 1000;
        const mid = route.coordinates[Math.floor(route.coordinates.length / 2)];

        /**
         * TIERED SPEED CALCULATION
         * Weighted Avg: (100 * 0.7) + (80 * 0.2) + (50 * 0.1) = 91 km/h
         */
        const time = dist / 91;
        const h = Math.floor(time);
        const m = Math.round((time - h) * 60);
        const label = h > 0 ? `${h}h ${m}m` : `${m}m`;

        this._flag = L.marker(mid, {
            icon: L.divIcon({
                className: 'metrics-flag',
                html: `
                    <div style="background:#1a1a1a; color:white; border:2px solid #0070bb; padding:8px; border-radius:4px; width:100px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.5); transform:translate(-50%, -120%);">
                        <div style="font-size:9px; color:#0070bb; font-weight:bold;">EST. TRAVEL</div>
                        <div style="font-size:18px; font-weight:bold;">${label}</div>
                        <div style="font-size:11px; border-top:1px solid #444; margin-top:4px;">${dist.toFixed(1)} KM</div>
                    </div>
                `,
                iconSize: [0, 0]
            })
        }).addTo(map);
    }
};
