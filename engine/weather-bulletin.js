/** * [weong-bulletin] Final Forecast Anchor 
 * Status: High-Fidelity HRDPS Data Injection
 * Locked: Dec 30, 2025 [cite: 2025-12-30]
 */

(function() {
    let weatherLayer = L.layerGroup();
    let lastCoords = null;
    const PROXY = "https://api.allorigins.win/raw?url=";
    const ECCC = "https://geo.weather.gc.ca/geomet";

    const fetchWithRetry = async (url, retries = 2) => {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(PROXY + encodeURIComponent(url));
                if (response.ok) return await response.json();
            } catch (e) {
                if (i === retries - 1) throw e;
            }
        }
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
                        <div class="weather-box" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:42px; height:42px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 10px #000; opacity:0.6;">
                            <span style="font-size:14px; line-height:1;">☁️</span>
                            <span class="temp-val" style="font-size:11px; font-weight:bold; font-family:monospace; margin-top:2px;">...</span>
                        </div>`,
                    iconSize: [42, 42]
                }),
                zIndexOffset: 10000
            }).addTo(weatherLayer);

            return { marker, lat, lng, idx };
        });

        nodes.forEach(async (node) => {
            // Using HRDPS for the comprehensive Newfoundland dataset [cite: 2025-12-26]
            const timeISO = new Date().toISOString().substring(0, 13) + ":00:00Z";
            const layers = "HRDPS.CONTINENTAL_TT,HRDPS.CONTINENTAL_SDE,HRDPS.CONTINENTAL_VIS,HRDPS.CONTINENTAL_UU";
            const query = `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=${layers}&QUERY_LAYERS=${layers}&BBOX=${node.lat-0.01},${node.lng-0.01},${node.lat+0.01},${node.lng+0.01}&INFO_FORMAT=application/json&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326&TIME=${timeISO}`;
            
            try {
                const json = await fetchWithRetry(ECCC + query);
                const p = json.contents ? JSON.parse(json.contents).features[0].properties : json.features[0].properties;
                
                const temp = p['HRDPS.CONTINENTAL_TT'] || 0;
                const el = node.marker.getElement();
                if (el) {
                    const box = el.querySelector('.weather-box');
                    const label = el.querySelector('.temp-val');
                    box.style.opacity = "1";
                    label.innerText = `${Math.round(temp)}°`;
                    if (temp <= 0) label.style.color = "#00d4ff"; 
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
                if (label) {
                    label.innerText = "OFF"; // Indicates data link severed but system active [cite: 2025-12-30]
                    label.style.color = "#ff4757";
                }
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
