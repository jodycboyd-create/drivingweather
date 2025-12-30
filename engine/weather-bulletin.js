/** * [weong-bulletin] Visual Verification Build
 * Purpose: Force-render red circles to verify display logic.
 * Locked: Dec 30, 2025 [cite: 2025-12-30]
 */

(function() {
    let lastRoute = null;
    let weatherMarkers = L.layerGroup();

    // 1. FORCE ATTACH TO MAP
    const initMapCheck = setInterval(() => {
        if (window.map) {
            weatherMarkers.addTo(window.map);
            console.log("Bulletin: Map layer attached.");
            
            // Retro-check for existing route data [cite: 2025-12-30]
            if (window.currentRouteData) {
                renderRedCircles(window.currentRouteData);
            }
            clearInterval(initMapCheck);
        }
    }, 100);

    // 2. RENDER LOGIC: RED CIRCLE TEST
    function renderRedCircles(route) {
        if (!window.map || !route) return;
        weatherMarkers.clearLayers();
        
        const coords = route.geometry.coordinates;
        console.log("Bulletin: Rendering circles on " + coords.length + " coordinates.");

        // Sample 5 points along the route ribbon [cite: 2025-12-30]
        [0.1, 0.3, 0.5, 0.7, 0.9].forEach(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];

            // Force high-visibility Red Circle [cite: 2025-12-30]
            L.circleMarker([lat, lng], {
                radius: 12,
                fillColor: "#ff0000",
                color: "#ffffff",
                weight: 3,
                opacity: 1,
                fillOpacity: 0.9,
                zIndexOffset: 5000 // Highest priority [cite: 2025-12-30]
            })
            .bindPopup(`<div style="color:#000; font-weight:bold;">Visual Verification: Level 3 Anchor</div>`)
            .addTo(weatherMarkers);
        });
        
        lastRoute = route;
    }

    // 3. EVENT BINDINGS [cite: 2025-12-30]
    window.addEventListener('weong:routeUpdated', (e) => {
        console.log("Bulletin: Route update received.");
        renderRedCircles(e.detail);
    });

    // Handle speed/time updates from velocity widget [cite: 2025-12-30]
    window.addEventListener('weong:update', () => {
        if (window.currentRouteData) {
            renderRedCircles(window.currentRouteData);
        }
    });
})();
