/** * [weong-bulletin] High-Speed HUD Engine 
 * Status: Non-Blocking Parallel Sync 
 * Locked: Dec 30, 2025 [cite: 2025-12-30]
 */

(function() {
    let weatherLayer = L.layerGroup();
    let lastCoords = null;
    const PROXY = "https://api.allorigins.win/raw?url=";
    const ECCC = "https://geo.weather.gc.ca/geomet";

    const drawWeatherNodes = async (coords) => {
        if (JSON.stringify(coords) === lastCoords) return;
        lastCoords = JSON.stringify(coords);
        
        weatherLayer.clearLayers();
        const pcts = [0.15, 0.45, 0.75, 0.95];

        // 1. INSTANT UI PLACEMENT [cite: 2025-12-30]
        const nodes = pcts.map(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            
            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'w-icon',
                    html: `<div style="background:#000; border:2px solid #FFD700; border-radius:4px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 10px #000; opacity:0.7;">☁️</div>`,
                    iconSize: [28, 28]
                }),
                zIndexOffset: 10000
            }).addTo(weatherLayer);

            return { marker, lat, lng, idx };
        });

        // 2. PARALLEL DATA FETCHING [cite: 2025-12-30]
        nodes.forEach(async (node) => {
            const timeISO = new Date().toISOString().substring(0, 13) + ":00:00Z";
            const layers = "HRDPS.CONTINENTAL_TT,HRDPS.CONTINENTAL_SDE,HRDPS.CONTINENTAL_VIS,HRDPS.CONTINENTAL_UU";
            const query = `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=${layers}&QUERY_LAYERS=${layers}&BBOX=${node.lat-0.01},${node.lng-0.01},${node.lat+0.01},${node.lng+0.01}&INFO_FORMAT=application/json&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326&TIME=${timeISO}`;
            
            try {
                const response = await fetch(PROXY + encodeURIComponent(ECCC + query));
                const json = await response.json();
                const p = json.contents ? JSON.parse(json.contents).features[0].properties : json.features[0].properties;
                
                // Update marker on success [cite: 2025-12-30]
                node.marker.getElement().firstChild.style.opacity = "1";
                node.marker.bindPopup(`
                    <div style="font-family:'Courier New',monospace; font-size:11px; background:rgba(10,10,10,0.95); color:#fff; padding:10px; border-left:4px solid #FFD700; min-width:160px;">
                        <div style="color:#FFD700; font-weight:bold; margin-bottom:5px;">HRDPS DIAGNOSTIC</div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                            <span>TEMP:</span><span style="text-align:right;">${(p['HRDPS.CONTINENTAL_TT'] || 0).toFixed(1)}°C</span>
                            <span>WIND:</span><span style="text-align:right;">${(p['HRDPS.CONTINENTAL_UU'] || 0).toFixed(0)}km/h</span>
                            <span>VIS:</span><span style="text-align:right;">${(p['HRDPS.CONTINENTAL_VIS'] || 10).toFixed(1)}km</span>
                            <span>SNOW:</span><span style="text-align:right;">${(p['HRDPS.CONTINENTAL_SDE'] || 0).toFixed(1)}cm</span>
                        </div>
                    </div>`);
            } catch (e) {
                node.marker.bindPopup(`<div style="color:#ff4757; font-family:monospace;">DATA LINK OFFLINE</div>`);
            }
        });
    };

    // 3. PASSIVE SCANNER [cite: 2025-12-30]
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
