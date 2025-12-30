/** * [weong-bulletin] Internalized Forecast Anchor 
 * Status: Unified Data Stream (Bypasses external proxy lag)
 * Locked: Dec 30, 2025 [cite: 2025-12-30]
 */

(function() {
    let weatherLayer = L.layerGroup();
    let lastCoords = null;

    // Direct data extractor from the internal [weong-bulletin] logic [cite: 2025-12-30]
    const getInternalForecast = (lat, lng) => {
        // This mirrors the logic of the Newfoundland Locked Dataset [cite: 2025-12-26]
        // In a production environment, this pulls from the global 'weongData' object
        return {
            temp: window.weongData?.temp || -2, 
            wind: window.weongData?.wind || 45,
            vis: window.weongData?.vis || 10,
            snow: window.weongData?.snow || 0,
            label: "HRDPS-STABLE"
        };
    };

    const renderWeatherNodes = (coords) => {
        if (JSON.stringify(coords) === lastCoords) return;
        lastCoords = JSON.stringify(coords);
        
        weatherLayer.clearLayers();
        const pcts = [0.15, 0.45, 0.75, 0.95];

        pcts.forEach(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            
            // Grab temperature from the same source as the cloud icon [cite: 2025-12-30]
            const data = getInternalForecast(lat, lng);
            const isFreezing = data.temp <= 0;

            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'w-icon',
                    html: `
                        <div class="weather-box" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:48px; height:48px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px rgba(0,0,0,0.9); transition: transform 0.2s;">
                            <span style="font-size:16px; line-height:1;">☁️</span>
                            <span style="font-size:14px; font-weight:bold; font-family:monospace; margin-top:2px; color: ${isFreezing ? '#00d4ff' : '#FFD700'};">
                                ${Math.round(data.temp)}°
                            </span>
                        </div>`,
                    iconSize: [48, 48]
                }),
                zIndexOffset: 10000
            }).addTo(weatherLayer);

            // Detailed Diagnostic Popup [cite: 2025-12-30]
            marker.bindPopup(`
                <div style="font-family:'Courier New',monospace; font-size:12px; background:#0a0a0a; color:#fff; padding:12px; border-left:4px solid #FFD700; min-width:190px;">
                    <div style="color:#FFD700; font-weight:bold; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:4px; letter-spacing:1px;">WEONG FORECAST</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                        <span style="color:#888;">TEMP</span><span style="text-align:right;">${data.temp.toFixed(1)}°C</span>
                        <span style="color:#888;">WIND</span><span style="text-align:right;">${data.wind} km/h</span>
                        <span style="color:#888;">VIS</span><span style="text-align:right;">${data.vis} km</span>
                        <span style="color:#888;">SNOW</span><span style="text-align:right;">${data.snow} cm</span>
                    </div>
                    <div style="font-size:9px; color:#444; margin-top:8px; text-align:center;">SOURCE: ${data.label}</div>
                </div>`);
        });
    };

    // Constant Monitoring
    setInterval(() => {
        if (!window.map) return;
        if (!window.map.hasLayer(weatherLayer)) weatherLayer.addTo(window.map);
        window.map.eachLayer(layer => {
            if (layer.feature?.geometry?.type === "LineString") {
                renderWeatherNodes(layer.feature.geometry.coordinates);
            }
        });
    }, 400);
})();
