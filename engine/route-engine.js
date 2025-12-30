/**
 * ROUTE-ENGINE.JS | v.2025.12.29.12
 * Final Logic Lock: Metrics Flag Injection
 */
const RouteEngine = {
    _map: null,
    _control: null,
    _popup: null,

    calculateRoute: function(start, end) {
        if (!this._map) {
            console.error("[RouteEngine] Map not bridged.");
            return;
        }

        // 1. Cleanup old instances
        if (this._control) { this._map.removeControl(this._control); }
        if (this._popup) { this._map.removeLayer(this._popup); }

        // 2. Initialize Routing Control
        this._control = L.Routing.control({
            waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
            createMarker: () => null, // Build 10 Lock: No engine markers
            addWaypoints: false,
            routeWhileDragging: false,
            show: false, // Keep directions panel hidden
            lineOptions: { styles: [{ color: '#0070bb', weight: 6 }] }
        }).addTo(this._map);

        // 3. Listen for result and inject Metric Flag
        this._control.on('routesfound', (e) => {
            const route = e.routes[0];
            const distKm = route.summary.totalDistance / 1000;
            
            /**
             * TIERED SPEED CALCULATION
             * 100km/h (TCH), 80km/h (Connector), 50km/h (Local)
             * We use a weighted average (approx 92km/h) for the transit time.
             */
            const weightSpeed = (100 * 0.8) + (80 * 0.15) + (50 * 0.05); 
            const totalHours = distKm / weightSpeed;
            const h = Math.floor(totalHours);
            const m = Math.round((totalHours - h) * 60);

            this.injectFlag(route.coordinates, distKm, h, m);
        });
    },

    injectFlag: function(coords, dist, h, m) {
        const midPoint = coords[Math.floor(coords.length * 0.45)]; // Slightly offset for visibility
        const timeText = h > 0 ? `${h}h ${m}m` : `${m}m`;

        const html = `
            <div style="background:#1a1a1a; color:#fff; border:2px solid #0070bb; padding:8px 12px; border-radius:4px; font-family:monospace; min-width:100px;">
                <b style="color:#0070bb; font-size:14px;">DRIVE TIME</b><br>
                <span style="font-size:18px;">${timeText}</span><br>
                <small style="opacity:0.7;">DIST: ${dist.toFixed(1)} KM</small>
            </div>
        `;

        this._popup = L.popup({
            closeButton: false,
            autoClose: false,
            className: 'metrics-flag-popup',
            offset: [0, -15]
        })
        .setLatLng(midPoint)
        .setContent(html)
        .addTo(this._map);
    }
};

// Map Bridging
window.addEventListener('map-ready', (e) => {
    RouteEngine._map = e.detail.map;
    console.log("[RouteEngine] Bridge Established.");
});
