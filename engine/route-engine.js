/**
 * ROUTE-ENGINE.JS | v.2025.12.29.14
 * The "Never-Miss" Bridge: Resolving execution order and metric display.
 */
const RouteEngine = {
    _map: null,
    _routingControl: null,
    _metricFlag: null,

    // NEW: Robust bridging that checks for existing maps immediately
    init: function() {
        if (window.map) { // Direct check for the anchor map
            this._map = window.map;
            console.log("RouteEngine: Found Map Anchor.");
        }
        
        window.addEventListener('map-ready', (e) => {
            this._map = e.detail.map;
            console.log("RouteEngine: Bridge via Event.");
        });
    },

    calculateRoute: function(start, end) {
        if (!this._map) return;

        if (this._routingControl) this._map.removeControl(this._routingControl);
        if (this._metricFlag) this._metricFlag.remove();

        this._routingControl = L.Routing.control({
            waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
            createMarker: () => null, 
            addWaypoints: false,
            routeWhileDragging: false,
            show: false, // UI remains sleek
            lineOptions: { styles: [{ color: '#0070bb', weight: 6 }] }
        }).addTo(this._map);

        this._routingControl.on('routesfound', (e) => {
            const route = e.routes[0];
            const distKm = route.summary.totalDistance / 1000;
            
            // Speed Tiers: 100 TCH / 80 Connector / 50 Local
            const avgV = (100 * 0.75) + (80 * 0.15) + (50 * 0.10); 
            const totalH = distKm / avgV;
            const h = Math.floor(totalH);
            const m = Math.round((totalH - h) * 60);

            this.drawMetricsFlag(route.coordinates, distKm, h, m);
        });
    },

    drawMetricsFlag: function(coords, d, h, m) {
        // Create a custom Leaflet DivIcon for the flag
        const midPoint = coords[Math.floor(coords.length / 2)];
        const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

        const flagHtml = `
            <div style="background:#1a1a1a; color:white; border:2px solid #0070bb; padding:8px 12px; border-radius:4px; font-family:monospace; min-width:110px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); transform:translate(-50%, -120%);">
                <div style="font-size:10px; color:#0070bb; font-weight:bold;">EST. TIME</div>
                <div style="font-size:18px; margin:2px 0;">${timeStr}</div>
                <div style="font-size:11px; border-top:1px solid #444; padding-top:4px;">${d.toFixed(1)} KM</div>
            </div>
        `;

        this._metricFlag = L.marker(midPoint, {
            icon: L.divIcon({
                className: 'custom-metrics-container',
                html: flagHtml,
                iconSize: [0, 0]
            }),
            interactive: false
        }).addTo(this._map);
    }
};

// Auto-run the bridge check
RouteEngine.init();
