/** * [weong-bulletin] Hardware-Level Force Build
 * Purpose: Absolute rendering of Red Circles regardless of event timing.
 * Locked: Dec 30, 2025 [cite: 2025-12-30]
 */

(function() {
    window.weatherMarkers = L.layerGroup();
    let lastRenderedRoute = null;

    // 1. IMMEDIATE ATTACHMENT
    function ensureLayerOnMap() {
        if (window.map && !window.map.hasLayer(window.weatherMarkers)) {
            window.weatherMarkers.addTo(window.map);
            console.log("Bulletin: Layer forced onto map instance.");
        }
    }

    // 2. THE RED CIRCLE ENGINE
    window.renderWeatherNodes = function(routeData) {
        const route = routeData || window.currentRouteData;
        if (!route || !route.geometry) {
            console.warn("Bulletin: No route data found in global anchor.");
            return;
        }

        ensureLayerOnMap();
        window.weatherMarkers.clearLayers();
        
        const coords = route.geometry.coordinates;
        // Sampling 6 high-contrast nodes across the island [cite: 2025-12-30]
        [0.1, 0.25, 0.45, 0.65, 0.85, 0.98].forEach(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];

            // Using L.circle for absolute coordinate persistence
            L.circle([lat, lng], {
                radius: 2500, // 2.5km radius for visibility at island-scale
                color: '#ff0000',
                fillColor: '#ff0000',
                fillOpacity: 0.8,
                weight: 5,
                pane: 'markerPane' // Force into the top-most Leaflet pane
            })
            .bindPopup(`<b>TEST NODE</b><br>LAT: ${lat.toFixed(3)}<br>LNG: ${lng.toFixed(3)}`)
            .addTo(window.weatherMarkers);
        });

        console.log("Bulletin: 6 Red Circles rendered to map.");
        lastRenderedRoute = route;
    };

    // 3. PERSISTENT WATCHER [cite: 2025-12-30]
    // If the route engine updates window.currentRouteData, this will catch it.
    setInterval(() => {
        if (window.currentRouteData && window.currentRouteData !== lastRenderedRoute) {
            window.renderWeatherNodes(window.currentRouteData);
        }
    }, 1000);

    // 4. EVENT OVERRIDE
    window.addEventListener('weong:routeUpdated', (e) => {
        window.renderWeatherNodes(e.detail);
    });

    console.log("Bulletin: Force-Render Engine active.");
})();
