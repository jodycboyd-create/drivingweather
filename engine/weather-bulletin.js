/** * [weong-bulletin] Multi-Path Forecast Anchor 
 * Status: Parallel Proxy Racing (Eliminates "OFF" / "...")
 * Locked: Dec 30, 2025 [cite: 2025-12-30]
 */

(function() {
    let weatherLayer = L.layerGroup();
    let lastCoords = null;
    const ECCC_BASE = "https://geo.weather.gc.ca/geomet";
    
    // Triple-redundant pathing for Newfoundland data [cite: 2025-12-30]
    const PATHS = [
        url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        url => `https://thingproxy.freeboard.io/fetch/${url}`
    ];

    const raceForecast = async (url) => {
        // Fire all paths simultaneously; first one to succeed wins [cite: 2025-12-30]
        return Promise.any(PATHS.map(path => 
            fetch(path(url)).then(res => {
                if (!res.ok) throw new Error();
                return res.json();
            })
        ));
    };

    const drawWeatherNodes = async (coords) => {
        if (JSON.stringify(coords) === lastCoords) return;
        lastCoords = JSON.stringify(coords);
        
        weatherLayer.clearLayers();
        const pcts = [0.15, 0.45, 0.75, 0.95];

        const nodes = pcts.map(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            
            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'w-icon',
                    html: `
                        <div class="weather-box" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:46px; height:46px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px rgba(0,0,0,0.8);">
                            <span style="font-size:16px; line-height:1;">☁️</span>
                            <span class="temp-val" style="font-size:13px; font-weight:bold; font-family:monospace; margin-top:2px;">...</span>
                        </div>`,
                    iconSize: [46, 46]
                }),
                zIndexOffset: 10000
            }).addTo(weatherLayer);

            return { marker, lat, lng, idx };
        });

        nodes.forEach(async (node) => {
            const timeISO = new Date().toISOString().substring(0, 13) + ":00:00Z";
            const layers = "HRDPS.CONTINENTAL_TT,HRDPS.CONTINENTAL_SDE,HRDPS.CONTINENTAL_VIS,HRDPS.CONTINENTAL_UU";
            const query = `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=${layers}&QUERY_LAYERS=${layers}&BBOX=${node.lat-0.01},${node.lng-0.01},${node.lat+0.01},${node.lng+0.01}&INFO_FORMAT=application/json&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326&TIME=${timeISO}`;
            
            try {
                const json = await raceForecast(ECCC_BASE + query);
                const p = json.contents ? JSON.parse(json.contents).features[0].properties : json.features[0].properties;
                
                const temp = p['HRDPS.CONTINENTAL_TT'] || 0;
                const el = node.marker.getElement();
                if (el) {
                    const label = el.querySelector('.temp-val');
                    label.innerText = `${Math.round(temp)}°`;
                    if (temp <= 0) label.style.color = "#00d4ff"; // Freezing blue [cite: 2025-12-30]
                }

                node.marker.bindPopup(`
                    <div style="font-family:'Courier New',monospace; font-size:11px; background:rgba(10,10,10,0.98); color:#fff; padding:12px; border-left:4px solid #FFD700; min-width:180px;">
                        <div style="color:#FFD700; font-weight:bold; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:4px; letter-spacing:1px;">WEONG FORECAST</div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                            <span style="color:#888;">TEMPERATURE</span><span style="text-align:right;">${temp.toFixed(1)}°C</span>
                            <span style="color:#888;">WIND VEL</span><span style="text-align:right;">${(p['HRDPS.CONTINENTAL_UU'] || 0).toFixed(0)}km/h</span>
                            <span style="color:#888;">VISIBILITY</span><span style="text-align:right;">${(p['HRDPS.CONTINENTAL_VIS'] || 10).toFixed(1)}km</span>
                            <span style="color:#888;">SNOW ACCUM</span><span style="text-align:right;">${(p['HRDPS.CONTINENTAL_SDE'] || 0).toFixed(1)}cm</span>
                        </div>
                    </div>`);
            } catch (e) {
                const label = node.marker.getElement()?.querySelector('.temp-val');
                if (label) label.innerText = "!!"; // Fatal link error [cite: 2025-12-30]
            }
        });
    };

    setInterval(() => {
        if (!window.map) return;
        if (!window.map.hasLayer(weatherLayer)) weatherLayer.addTo(window.map);
        window.map.eachLayer(layer => {
            if (layer.feature && layer.feature.geometry && layer.feature.geometry.type === "LineString") {
                drawWeatherNodes(layer.feature.geometry.coordinates);
            }
        });
    }, 500);
})();
