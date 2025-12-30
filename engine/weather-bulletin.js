/** * [weong-bulletin] Unified Visual Engine 
 * Status: Restored - Dec 30, 2025 [cite: 2025-12-30]
 */

(function() {
    window.weatherMarkers = L.layerGroup();
    let lastProcessed = null;

    const syncWeather = () => {
        if (!window.map) return;
        if (!window.map.hasLayer(window.weatherMarkers)) {
            window.weatherMarkers.addTo(window.map);
        }

        const route = window.currentRouteData;
        if (!route || route === lastProcessed) return;

        window.weatherMarkers.clearLayers();
        const coords = route.geometry.coordinates;

        // Force-render Red Circles along the path [cite: 2025-12-30]
        [0.2, 0.5, 0.8].forEach(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];

            L.circleMarker([lat, lng], {
                radius: 10,
                fillColor: "#ff4757",
                color: "#ffffff",
                weight: 2,
                fillOpacity: 1,
                zIndexOffset: 5000
            }).addTo(window.weatherMarkers);
        });

        lastProcessed = route;
        console.log("Bulletin: Markers Synced.");
    };

    // Watchdog and Event listener [cite: 2025-12-30]
    setInterval(syncWeather, 1000);
    window.addEventListener('weong:routeUpdated', syncWeather);

    console.log("System: /engine/weather-bulletin.js restored.");
})();
