/**
 * ROUTE-ENGINE.JS | v.2025.12.29.16
 * Restoration Build: Static Metric Flag Injection
 * Preserves Locked index.html Anchor [cite: 2025-12-30]
 */
const RouteEngine = {
    currentControl: null,
    currentFlag: null,

    calculateRoute: function(start, end) {
        // Access map directly via global scope established in index.html [cite: 2025-12-27]
        const map = window.map; 
        if (!map) return;

        // 1. Precise Cleanup
        if (this.currentControl) map.removeControl(this.currentControl);
        if (this.currentFlag) map.removeLayer(this.currentFlag);

        // 2. Initialize Routing with Locked Constraints
        this.currentControl = L.Routing.control({
            waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
            createMarker: () => null, // No extra markers
            addWaypoints: false,
            routeWhileDragging: false,
            show: false, // Keep sidebar hidden
            lineOptions: { styles: [{ color: '#0070bb', weight: 6 }] }
        }).addTo(map);

        // 3. Metrics Listener
        this.currentControl.on('routesfound', (e) => {
            const route = e.routes[0];
            const distKm = route.summary.totalDistance / 1000;
            
            /**
             * WEIGHTED SPEED LOGIC
             * TCH (100) @ 75% | Branch (80) @ 15% | Local (50) @ 10%
             * Weighted average for NL terrain = 92 km/h.
             */
            const avgV = (100 * 0.75) + (80 * 0.15) + (50 * 0.10); 
            const totalHours = distKm / avgV;
            const h = Math.floor(totalHours);
            const m = Math.round((totalHours - h) * 60);

            this.dropFlag(map, route.coordinates, distKm, h, m);
        });
    },

    dropFlag: function(map, coords, d, h, m) {
        const midPoint = coords[Math.floor(coords.length / 2)];
        const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

        // The "Sleek Flag" Restoration
        const flagHtml = `
            <div style="
                background: rgba(26, 26, 26, 0.95); color: white; border: 2px solid #0070bb;
                padding: 10px 14px; border-radius: 6px; font-family: 'Segoe UI', Arial, sans-serif;
                text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                transform: translate(-50%, -120%); pointer-events: none;
            ">
                <div style="font-size: 10px; color: #0070bb; font-weight: bold; text-transform: uppercase;">Est. Travel</div>
                <div style="font-size: 20px; font-weight: bold;">${timeStr}</div>
                <div style="font-size: 12px; margin-top: 5px; border-top: 1px solid #444; padding-top: 5px; color: #aaa;">
                    ${d.toFixed(1)} KM
                </div>
            </div>
        `;

        this.currentFlag = L.marker(midPoint, {
            icon: L.divIcon({
                className: 'metrics-flag-restored',
                html: flagHtml,
                iconSize: [0, 0]
            }),
            zIndexOffset: 1500 // Forces it above route lines and town labels
        }).addTo(map);
    }
};
