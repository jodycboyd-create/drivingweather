/** * [weong-bulletin] Local Cache Forecast Anchor 
 * Status: Proxy-Throttling Bypass (Fixes "OFF", "...", "!!")
 * Locked: Dec 30, 2025 [cite: 2025-12-30]
 */

(function() {
    let weatherLayer = L.layerGroup();
    let lastCoords = null;
    let weatherCache = new Map(); // Local store to prevent repeated proxy calls
    
    const PROXIES = [
        "https://api.allorigins.win/raw?url=",
        "https://corsproxy.io/?",
        "https://thingproxy.freeboard.io/fetch/"
    ];
    const ECCC_BASE = "https://geo.weather.gc.ca/geomet";

    // Optimized fetcher with local memory lookup [cite: 2025-12-30]
    const getCachedForecast = async (lat, lng) => {
        const key = `${lat.toFixed(2)}:${lng.toFixed(2)}`;
        if (weatherCache.has(key)) return weatherCache.get(key);

        const timeISO = new Date().toISOString().substring(0, 13) + ":00:00Z";
        const layers = "HRDPS.CONTINENTAL_TT,HRDPS.CONTINENTAL_SDE,HRDPS.CONTINENTAL_VIS,HRDPS.CONTINENTAL_UU";
        const query = `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=${layers}&QUERY_LAYERS=${layers}&BBOX=${lat-0.01},${lng-0.01},${lat+0.01},${lng+0.01}&INFO_FORMAT=application/json&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326&TIME=${timeISO}`;
        
        // Race proxies only if not in cache [cite: 2025-12-30]
        const data = await Promise.any(PROXIES.map(p => 
            fetch(p + encodeURIComponent(ECCC_BASE + query)).then(r => r.json())
        )).catch(() => null);

        if (data) {
            const p = data.contents ? JSON.parse(data.contents).features[0].properties : data.features[0].properties;
            weatherCache.set(key, p);
            return p;
        }
        return null;
    };

    const renderWeatherNodes = async (coords) => {
        if (JSON.stringify(coords) === lastCoords) return;
        lastCoords = JSON.stringify(coords);
        
        weatherLayer.clearLayers();
        const pcts = [0.15, 0.45, 0.75, 0.95];

        pcts.forEach(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            
            // Create the icon immediately with the cached value if available [cite: 2025-12-30]
            const cached = weatherCache.get(`${lat.toFixed(2)}:${lng.toFixed(2)}`);
            const tempDisplay = cached ? `${Math.round(cached['HRDPS.CONTINENTAL_TT'])}°` : "...";

            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'w-icon',
                    html: `
                        <div class="weather-box" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:48px; height:48px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px rgba(0,0,0,0.9);">
                            <span style="font-size:16px; line-height:1;">☁️</span>
                            <span class="temp-val" style="font-size:14px; font-weight:bold; font-family:monospace; margin-top:2px;">${tempDisplay}</span>
                        </div>`,
                    iconSize: [48, 48]
                }),
                zIndexOffset: 10000
            }).addTo(weatherLayer);

            // Fetch/Update in background [cite: 2025-12-30]
            const p = await getCachedForecast(lat, lat);
            if (p && !cached) {
                const el = marker.getElement();
                if (el) el.querySelector('.temp-val').innerText = `${Math.round(p['HRDPS.CONTINENTAL_TT'])}°`;
            }

            if (p) {
                marker.bindPopup(`
                    <div style="font-family:'Courier New',monospace; font-size:12px; background:#0a0a0a; color:#fff; padding:12px; border-left:4px solid #FFD700; min-width:190px;">
                        <div style="color:#FFD700; font-weight:bold; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:4px; letter-spacing:1px;">WEONG FORECAST</div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                            <span style="color:#888;">TEMP</span><span style="text-align:right;">${p['HRDPS.CONTINENTAL_TT'].toFixed(1)}°C</span>
                            <span style="color:#888;">WIND</span><span style="text-align:right;">${(p['HRDPS.CONTINENTAL_UU'] || 0).toFixed(0)}km/h</span>
                            <span style="color:#888;">VIS</span><span style="text-align:right;">${(p['HRDPS.CONTINENTAL_VIS'] || 10).toFixed(1)}km</span>
                            <span style="color:#888;">SNOW</span><span style="text-align:right;">${(p['HRDPS.CONTINENTAL_SDE'] || 0).toFixed(1)}cm</span>
                        </div>
                    </div>`);
            }
        });
    };

    // Fast-scan for route updates [cite: 2025-12-30]
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
