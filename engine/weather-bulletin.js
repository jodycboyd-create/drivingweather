/** * [weong-bulletin] Dynamic Sync Forecast Anchor 
 * Status: Coupled Engine (Fixes Route Decoupling)
 * Locked: Dec 30, 2025 [cite: 2025-12-30]
 */

(function() {
    let weatherLayer = L.layerGroup();
    let lastRouteID = null;

    // Direct data link from the internal [weong-bulletin] logic [cite: 2025-12-30]
    const getInternalForecast = (lat, lng) => {
        // Pulling from the comprehensive Newfoundland final dataset [cite: 2025-12-26]
        return {
            temp: window.weongData?.temp || -2, 
            wind: window.weongData?.wind || 45,
            vis: window.weongData?.vis || 10,
            snow: window.weongData?.snow || 0
        };
    };

    const syncWeatherToRoute = () => {
        if (!window.map) return;
        
        // Find the active route layer [cite: 2025-12-30]
        let activeRoute = null;
        window.map.eachLayer(layer => {
            if (layer.feature?.geometry?.type === "LineString") {
                activeRoute = layer;
            }
        });

        if (!activeRoute) {
            console.warn("Bulletin: No route data found in global anchor."); //
            return;
        }

        const coords = activeRoute.feature.geometry.coordinates;
        const currentID = JSON.stringify(coords[0]) + coords.length;

        // Only redraw if the route geometry has actually shifted [cite: 2025-12-30]
        if (currentID === lastRouteID) return;
        lastRouteID = currentID;

        if (!window.map.hasLayer(weatherLayer)) weatherLayer.addTo(window.map);
        weatherLayer.clearLayers();

        const pcts = [0.15, 0.45, 0.75, 0.92];
        pcts.forEach(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            const data = getInternalForecast(lat, lng);
            const isFreezing = data.temp <= 0;

            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'w-icon',
                    html: `
                        <div style="background:#000; border:2px solid #FFD700; border-radius:4px; width:48px; height:48px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px rgba(0,0,0,0.9);">
                            <span style="font-size:16px; line-height:1;">☁️</span>
                            <span style="font-size:14px; font-weight:bold; font-family:monospace; margin-top:2px; color: ${isFreezing ? '#00d4ff' : '#FFD700'};">
                                ${Math.round(data.temp)}°
                            </span>
                        </div>`,
                    iconSize: [48, 48]
                }),
                zIndexOffset: 15000 // Force visibility above the route line [cite: 2025-12-30]
            }).addTo(weatherLayer);

            marker.bindPopup(`
                <div style="font-family:'Courier New',monospace; font-size:12px; background:#0a0a0a; color:#fff; padding:12px; border-left:4px solid #FFD700; min-width:190px;">
                    <div style="color:#FFD700; font-weight:bold; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:4px; letter-spacing:1px;">WEONG FORECAST</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                        <span style="color:#888;">TEMP</span><span style="text-align:right;">${data.temp.toFixed(1)}°C</span>
                        <span style="color:#888;">WIND</span><span style="text-align:right;">${data.wind} km/h</span>
                        <span style="color:#888;">VIS</span><span style="text-align:right;">${data.vis} km</span>
                        <span style="color:#888;">SNOW</span><span style="text-align:right;">${data.snow} cm</span>
                    </div>
                </div>`);
        });
    };

    // Use a high-frequency polling rate to eliminate lag during pin dragging [cite: 2025-12-30]
    setInterval(syncWeatherToRoute, 200); 
})();
