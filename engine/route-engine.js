/**
 * ROUTE-ENGINE.JS | v.2025.12.29.11
 * Locked Core: Adding Travel Metrics without altering index.html Anchor Build.
 */
const RouteEngine = {
    control: null,
    metricsFlag: null,
    map: null,

    calculateRoute: function(start, end) {
        if (!this.map) return;

        // Cleanup existing route and popup
        if (this.control) this.map.removeControl(this.control);
        if (this.metricsFlag) this.map.removeLayer(this.metricsFlag);

        this.control = L.Routing.control({
            waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
            createMarker: () => null, // Maintain Build 10: No extra markers
            addWaypoints: false,
            routeWhileDragging: false,
            lineOptions: { 
                styles: [{ color: '#0070bb', weight: 6, opacity: 0.8 }] 
            }
        }).addTo(this.map);

        this.control.on('routesfound', (e) => {
            const route = e.routes[0];
            const totalKm = route.summary.totalDistance / 1000;
            
            /**
             * WEIGHTED SPEED CALCULATION
             * Applying user-defined limits: 100km/h (TCH), 80km/h (Branch), 50km/h (Local)
             * Average weighted speed for NL transit: 91 km/h
             */
            const weightedSpeed = (100 * 0.75) + (80 * 0.15) + (50 * 0.10); 
            const totalHours = totalKm / weightedSpeed;
            
            const hours = Math.floor(totalHours);
            const minutes = Math.round((totalHours - hours) * 60);

            this.createMetricsFlag(route.coordinates, totalKm, hours, minutes);
        });
    },

    createMetricsFlag: function(coords, dist, h, m) {
        // Find the geographical midpoint of the route path
        const midIndex = Math.floor(coords.length / 2);
        const midPoint = coords[midIndex];
        const timeDisplay = h > 0 ? `${h}h ${m}m` : `${m}m`;

        const content = `
            <div style="background:rgba(40, 40, 40, 0.95); color:white; padding:10px; border-radius:8px; border:1px solid #0070bb; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; min-width:120px; box-shadow: 0 4px 15px rgba(0,0,0,0.4);">
                <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#aaa; margin-bottom:4px;">Est. Travel Time</div>
                <div style="font-size:20px; font-weight:bold; color:#fff;">${timeDisplay}</div>
                <div style="font-size:12px; margin-top:6px; padding-top:6px; border-top:1px solid #555; display:flex; justify-content:space-between;">
                    <span>DISTANCE:</span>
                    <span style="font-weight:bold; color:#0070bb;">${dist.toFixed(1)} km</span>
                </div>
            </div>
        `;

        this.metricsFlag = L.popup({
            closeButton: false,
            autoClose: false,
            closeOnClick: false,
            className: 'custom-metrics-popup',
            offset: [0, -10]
        })
        .setLatLng(midPoint)
        .setContent(content)
        .addTo(this.map);
    }
};

// Map Handshake [cite: 2025-12-27]
window.addEventListener('map-ready', (e) => {
    RouteEngine.map = e.detail.map;
});
