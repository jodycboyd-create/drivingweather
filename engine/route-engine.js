/**
 * ROUTE-ENGINE.JS | v.2025.12.29.11
 * Locked Core: Adding Travel Metrics without altering Anchor Point logic.
 */
const RouteEngine = {
    control: null,
    metricsFlag: null,

    calculateRoute: function(start, end) {
        if (!window.mapInstance) return;

        // Clear previous route but keep anchor markers intact
        if (this.control) {
            window.mapInstance.removeControl(this.control);
        }
        if (this.metricsFlag) {
            window.mapInstance.removeLayer(this.metricsFlag);
        }

        this.control = L.Routing.control({
            waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
            createMarker: () => null, // Maintain Build 10: No extra markers
            addWaypoints: false,
            routeWhileDragging: false,
            lineOptions: { styles: [{ color: '#0070bb', weight: 6 }] }
        }).addTo(window.mapInstance);

        // --- NEW METRIC CALCULATION ---
        this.control.on('routesfound', (e) => {
            const route = e.routes[0];
            const totalKm = route.summary.totalDistance / 1000;
            
            /**
             * WEIGHTED SPEED LOGIC
             * We estimate the distribution for Newfoundland transit:
             * 70% TCH (100km/h), 20% Branch (80km/h), 10% Local (50km/h)
             */
            const avgSpeed = (100 * 0.70) + (80 * 0.20) + (50 * 0.10); // 91 km/h weighted
            const totalHours = totalKm / avgSpeed;
            
            const hours = Math.floor(totalHours);
            const minutes = Math.round((totalHours - hours) * 60);

            this.displaySleekFlag(route.coordinates, totalKm, hours, minutes);
        });
    },

    displaySleekFlag: function(coords, dist, h, m) {
        const midPoint = coords[Math.floor(coords.length / 2)];
        const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

        const content = `
            <div style="background:#333; color:white; padding:8px; border-radius:6px; font-family:sans-serif; text-align:center; box-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                <div style="font-size:10px; text-transform:uppercase; opacity:0.8;">Est. Travel Time</div>
                <div style="font-size:18px; font-weight:bold;">${timeStr}</div>
                <div style="font-size:12px; border-top:1px solid #555; margin-top:5px; padding-top:5px;">${dist.toFixed(1)} KM</div>
            </div>
        `;

        this.metricsFlag = L.popup({
            closeButton: false,
            autoClose: false,
            className: 'sleek-metrics-popup'
        })
        .setLatLng(midPoint)
        .setContent(content)
        .addTo(window.mapInstance);
    }
};

// Handshake with index.html
window.addEventListener('map-ready', (e) => {
    window.mapInstance = e.detail.map;
});
