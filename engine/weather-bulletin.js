/** * [weong-bulletin] Passive Watcher Build
 * Logic: Observes the map for existing route layers and attaches weather nodes.
 * Locked: Dec 30, 2025 - No modifications to other files allowed. [cite: 2025-12-30]
 */

(function() {
    let weatherLayer = L.layerGroup();
    let lastCoords = null;

    const findAndSyncWeather = () => {
        if (!window.map) return;
        if (!window.map.hasLayer(weatherLayer)) weatherLayer.addTo(window.map);

        // 1. DIVING INTO THE MAP TO FIND YOUR ROUTE [cite: 2025-12-30]
        // Instead of a global variable, we scan the map for the Tactical Ribbon coordinates.
        let routeCoords = null;
        window.map.eachLayer(layer => {
            if (layer.feature && layer.feature.geometry && layer.feature.geometry.type === "LineString") {
                routeCoords = layer.feature.geometry.coordinates;
            }
        });

        // 2. ONLY RENDER IF THE ROUTE HAS CHANGED [cite: 2025-12-30]
        if (!routeCoords || JSON.stringify(routeCoords) === lastCoords) return;
        lastCoords = JSON.stringify(routeCoords);
        weatherLayer.clearLayers();

        // 3. DRAW RED CIRCLES ON THE DETECTED PATH [cite: 2025-12-30]
        [0.2, 0.5, 0.8].forEach(pct => {
            const idx = Math.floor((routeCoords.length - 1) * pct);
            const [lng, lat] = routeCoords[idx];

            L.circleMarker([lat, lng], {
                radius: 10,
                fillColor: "#ff4757", // High-Vis Red
                color: "#ffffff",
                weight: 2,
                fillOpacity: 1,
                pane: 'markerPane',   // Force above ribbon [cite: 2025-12-30]
                zIndexOffset: 9999
            }).bindPopup(`<div style="font-family:monospace;"><b>WEATHER NODE</b><br>LAT: ${lat.toFixed(3)}</div>`)
              .addTo(weatherLayer);
        });

        console.log("Bulletin: Passive Sync Complete.");
    };

    // 4. PASSIVE TRIGGERS [cite: 2025-12-30]
    // Runs when the map moves or when your existing events fire.
    setInterval(findAndSyncWeather, 1000); 
    window.addEventListener('weong:update', findAndSyncWeather);
    window.map?.on('moveend', findAndSyncWeather);

    console.log("System: /engine/weather-bulletin.js (Passive) initialized.");
})();
