/**
 * ROUTE-ENGINE.JS | v.2025.12.29.12
 * Observer Build: Handshake via DOM Layer Detection
 */
const RouteEngine = {
    _flag: null,

    sync: function() {
        const map = window.map;
        // Find the routing layer by its unique class name
        const routeLayer = document.querySelector('.main-route-line');
        if (!routeLayer || !map) return;

        // Since the user is seeing a route, the data exists in the Leaflet internal state
        map.eachLayer((layer) => {
            if (layer._routes && layer._routes[0]) {
                this.renderFlag(map, layer._routes[0]);
            }
        });
    },

    renderFlag: function(map, route) {
        if (this._flag) map.removeLayer(this._flag);

        const dist = route.summary.totalDistance / 1000;
        const coords = route.coordinates;
        const midPoint = coords[Math.floor(coords.length / 2)];

        /**
         * WEIGHTED CALCULATION
         * Avg Speed = (100 * 0.7) + (80 * 0.2) + (50 * 0.1) = 91 km/h
         */
        const hours = dist / 91;
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);

        const label = h > 0 ? `${h}h ${m}m` : `${m}m`;

        this._flag = L.marker(midPoint, {
            icon: L.divIcon({
                className: 'metrics-flag',
                html: `
                    <div style="background:#1a1a1a; color:white; border:2px solid #0070bb; padding:5px 10px; border-radius:4px; width:100px; text-align:center; box-shadow:0 4px 8px rgba(0,0,0,0.5); transform:translate(-50%, -120%);">
                        <div style="font-size:9px; color:#0070bb; font-weight:bold;">EST. TRAVEL</div>
                        <div style="font-size:16px; font-weight:bold;">${label}</div>
                        <div style="font-size:11px; border-top:1px solid #444; margin-top:3px;">${dist.toFixed(1)} KM</div>
                    </div>
                `,
                iconSize: [0, 0]
            })
        }).addTo(map);
    }
};

// Initial Sync
setTimeout(() => RouteEngine.sync(), 1000);
