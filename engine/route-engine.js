/**
 * ROUTE-ENGINE.JS | v.2025.12.29.13
 * Locked Core: Travel Metrics Flag (Direct Injection)
 */
const RouteEngine = {
    _map: null,
    _routingControl: null,
    _metricElement: null,

    calculateRoute: function(start, end) {
        if (!this._map) return;

        // Cleanup previous route and flag
        if (this._routingControl) { this._map.removeControl(this._routingControl); }
        if (this._metricElement) { this._metricElement.remove(); }

        this._routingControl = L.Routing.control({
            waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
            createMarker: () => null, // Lock 10: No extra pins
            addWaypoints: false,
            routeWhileDragging: false,
            show: false, // Hide default directions panel
            lineOptions: { styles: [{ color: '#0070bb', weight: 6 }] }
        }).addTo(this._map);

        this._routingControl.on('routesfound', (e) => {
            const route = e.routes[0];
            const dist = route.summary.totalDistance / 1000;
            
            /**
             * WEIGHTED SPEED CALCULATION
             * TCH (100) @ 70% | Connector (80) @ 20% | Local (50) @ 10%
             * Result: 91 km/h weighted average drive time.
             */
            const avgSpeed = (100 * 0.7) + (80 * 0.2) + (50 * 0.1);
            const totalHours = dist / avgSpeed;
            const h = Math.floor(totalHours);
            const m = Math.round((totalHours - h) * 60);

            this.showSleekFlag(route.coordinates, dist, h, m);
        });
    },

    showSleekFlag: function(coords, dist, h, m) {
        // Create the physical flag element
        this._metricElement = document.createElement('div');
        this._metricElement.style.cssText = `
            position: absolute; z-index: 2000; background: #1a1a1a; color: white;
            padding: 10px 15px; border-radius: 6px; border: 2px solid #0070bb;
            font-family: Arial, sans-serif; text-align: center; pointer-events: none;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5); transform: translate(-50%, -100%);
        `;

        const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
        this._metricElement.innerHTML = `
            <div style="font-size: 10px; color: #aaa; text-transform: uppercase;">Est. Travel</div>
            <div style="font-size: 20px; font-weight: bold;">${timeStr}</div>
            <div style="font-size: 12px; margin-top: 4px; color: #0070bb; border-top: 1px solid #444; padding-top: 4px;">${dist.toFixed(1)} KM</div>
        `;

        document.getElementById('map').appendChild(this._metricElement);

        // Map-to-Screen update loop to keep flag on the route line
        const updatePos = () => {
            if (!this._metricElement) return;
            const midCoord = coords[Math.floor(coords.length / 2)];
            const pos = this._map.latLngToContainerPoint(midCoord);
            this._metricElement.style.left = pos.x + "px";
            this._metricElement.style.top = (pos.y - 20) + "px";
        };

        this._map.on('move zoom', updatePos);
        updatePos();
    }
};

// Establish bridge to index.html [cite: 2025-12-27]
window.addEventListener('map-ready', (e) => {
    RouteEngine._map = e.detail.map;
});
