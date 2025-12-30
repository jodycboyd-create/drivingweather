/**
 * ROUTE-ENGINE.JS | v.2025.12.29.15
 * Forced Metric Flag Injection - Layer Priority Fix
 */
const RouteEngine = {
    _map: null,
    _routingControl: null,
    _flagLayer: null,

    calculateRoute: function(start, end) {
        // Find the map if we haven't already [cite: 2025-12-27]
        if (!this._map) {
            this._map = window.map || null; 
        }
        if (!this._map) return;

        // Cleanup
        if (this._routingControl) this._map.removeControl(this._routingControl);
        if (this._flagLayer) this._map.removeLayer(this._flagLayer);

        // Routing Logic
        this._routingControl = L.Routing.control({
            waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
            createMarker: () => null, 
            addWaypoints: false,
            routeWhileDragging: false,
            show: false,
            lineOptions: { styles: [{ color: '#0070bb', weight: 6 }] }
        }).addTo(this._map);

        this._routingControl.on('routesfound', (e) => {
            const route = e.routes[0];
            const dist = route.summary.totalDistance / 1000;
            
            /**
             * WEIGHTED SPEED LIMITS
             * TCH (100km/h), Connector (80km/h), Local (50km/h)
             * Weighted average for NL terrain = 91 km/h.
             */
            const v = (100 * 0.70) + (80 * 0.20) + (50 * 0.10);
            const time = dist / v;
            const h = Math.floor(time);
            const m = Math.round((time - h) * 60);

            this.injectMetricFlag(route.coordinates, dist, h, m);
        });
    },

    injectMetricFlag: function(coords, d, h, m) {
        const midIdx = Math.floor(coords.length / 2);
        const pos = coords[midIdx];
        const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

        // Create the sleek metric flag
        const iconHtml = `
            <div style="
                background: #1a1a1a; color: white; border: 2px solid #0070bb;
                padding: 6px 12px; border-radius: 4px; font-family: 'Courier New', monospace;
                min-width: 100px; box-shadow: 0 4px 12px rgba(0,0,0,0.6);
                transform: translate(-50%, -140%); pointer-events: none;
            ">
                <div style="font-size: 9px; color: #0070bb; font-weight: bold; letter-spacing: 1px;">TIME</div>
                <div style="font-size: 18px; font-weight: bold;">${timeStr}</div>
                <div style="font-size: 11px; border-top: 1px solid #333; margin-top: 4px; padding-top: 4px; color: #ccc;">
                    ${d.toFixed(1)} KM
                </div>
            </div>
        `;

        this._flagLayer = L.marker(pos, {
            icon: L.divIcon({
                className: 'metric-flag-wrapper',
                html: iconHtml,
                iconSize: [0, 0]
            }),
            zIndexOffset: 1000 // Ensure it sits above the road line
        }).addTo(this._map);
    }
};

// Auto-bridge on script load
if (window.map) RouteEngine._map = window.map;
window.addEventListener('map-ready', (e) => { RouteEngine._map = e.detail.map; });
