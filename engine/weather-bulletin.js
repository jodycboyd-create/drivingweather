/** * [weong-bulletin] Visual Verification Engine
 * Status: Watchdog Active - Dec 30, 2025 [cite: 2025-12-30]
 */

(function() {
    // Persistent Layer Group for all weather nodes
    window.weatherMarkers = L.layerGroup();
    let lastProcessedRoute = null;

    const runBulletinDiagnostics = () => {
        // 1. Ensure the layer is on the map instance
        if (window.map && !window.map.hasLayer(window.weatherMarkers)) {
            window.weatherMarkers.addTo(window.map);
            console.log("Bulletin: Layer attached to map.");
        }

        // 2. Check for the Global Anchor provided by route-engine [cite: 2025-12-30]
        const route = window.currentRouteData;
        if (!route || route === lastProcessedRoute) return;

        console.log("Bulletin: Global Anchor detected. Rendering nodes...");
        window.weatherMarkers.clearLayers();
        
        const coords = route.geometry.coordinates;
        // Sample 5 high-visibility Red Circles along the Newfoundland path [cite: 2025-12-30]
        [0.2, 0.4, 0.6, 0.8, 0.95].forEach(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];

            L.circleMarker([lat, lng], {
                radius: 12,
                fillColor: "#ff4757", // Red
                color: "#ffffff",     // White Border
                weight: 3,
                fillOpacity: 1,
                pane: 'markerPane',   // Ensure it stays above the route line
                zIndexOffset: 10000
            }).addTo(window.weatherMarkers);
        });

        lastProcessedRoute = route;
        console.log("Bulletin: Red Circles Rendered.");
    };

    // Continuous Watchdog: Checks for route updates every second [cite: 2025-12-30]
    setInterval(runBulletinDiagnostics, 1000);

    // Event-based trigger for snappier UI response [cite: 2025-12-30]
    window.addEventListener('weong:routeUpdated', (e) => {
        window.currentRouteData = e.detail;
        runBulletinDiagnostics();
    });

    console.log("System: /engine/weather-bulletin.js initialized.");
})();
