/**
 * ROUTE-ENGINE.JS | v.2025.12.29.11
 * Functionality Check: Red Block + Travel Metrics
 */
(function() {
    window.map.on('route-updated', function(e) {
        const control = e.control;
        
        control.on('routesfound', function(r) {
            const route = r.routes[0];
            const dist = route.summary.totalDistance / 1000;
            const mid = route.coordinates[Math.floor(route.coordinates.length / 2)];

            // Weighted speed: 70% TCH, 20% Branch, 10% Local
            const v = (100 * 0.7) + (80 * 0.2) + (50 * 0.1); 
            const time = dist / v;
            const h = Math.floor(time);
            const m = Math.round((time - h) * 60);

            // RENDER RED BLOCK (Functionality Check)
            if (window.metricsBlock) window.map.removeLayer(window.metricsBlock);
            
            const flagHtml = `
                <div style="background:#1a1a1a; color:white; border:2px solid red; padding:8px; border-radius:4px; font-family:monospace;">
                    <b style="color:red">DRIVE TIME</b><br>
                    <span style="font-size:16px;">${h}h ${m}m</span><br>
                    <small>${dist.toFixed(1)} KM</small>
                </div>
            `;

            window.metricsBlock = L.marker(mid, {
                icon: L.divIcon({
                    className: 'fn-check',
                    html: flagHtml,
                    iconSize: [120, 60],
                    iconAnchor: [60, 30]
                })
            }).addTo(window.map);
        });
    });
})();
