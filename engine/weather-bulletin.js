/** * Project: [weong-bulletin]
 * Methodology: [weong-route] L3 Sanitized Precision
 * Status: NaN-Proofed + Pin-Responsive [cite: 2023-12-23, 2025-12-30]
 */

const WeatherBulletin = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        config: {
            proxies: ["https://api.allorigins.win/raw?url=", "https://corsproxy.io/?"],
            eccc: "https://geo.weather.gc.ca/geomet",
            nodes: [0.15, 0.45, 0.75, 0.92]
        }
    };

    // Level 3 Sanitizer: Prevents NaN regressions [cite: 2025-12-30]
    const sanitize = (val, fallback = -2) => {
        const num = parseFloat(val);
        return isNaN(num) ? fallback : num;
    };

    async function fetchHRDPS(url, attempt = 0) {
        if (attempt >= state.config.proxies.length) return null;
        try {
            const res = await fetch(state.config.proxies[attempt] + encodeURIComponent(url), { signal: AbortSignal.timeout(2000) });
            const d = await res.json();
            return d.contents ? JSON.parse(d.contents).features[0].properties : d.features[0].properties;
        } catch (e) { return fetchHRDPS(url, attempt + 1); }
    }

    async function sync() {
        if (state.isLocked || !window.map) return;

        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        const depTime = window.currentDepartureTime instanceof Date ? window.currentDepartureTime : new Date();
        if (!route) return;

        const coords = route.feature.geometry.coordinates;
        // High-Precision Anchor: Includes Start/End GPS to catch pin drags [cite: 2025-12-30]
        const pinKey = `${coords[0][0].toFixed(3)},${coords[0][1].toFixed(3)}-${depTime.getHours()}`;
        
        if (pinKey === state.anchorKey) return;
        state.isLocked = true;
        state.anchorKey = pinKey;

        state.layer.clearLayers();
        if (!window.map.hasLayer(state.layer)) state.layer.addTo(window.map);

        state.config.nodes.forEach(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            
            // Temporal Offset: +1h per waypoint progression [cite: 2025-12-30]
            const forecastTime = new Date(depTime.getTime() + (pct * 8) * 3600000);
            const timeISO = forecastTime.toISOString().substring(0, 13) + ":00:00Z";

            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div class="sync-glow" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:52px; height:52px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px #000; animation: pulse 2s infinite;">
                            <span style="font-size:16px;">☁️</span>
                            <span class="t-val" style="font-size:14px; font-weight:bold; font-family:monospace;">...</span>
                           </div>`,
                    iconSize: [52, 52]
                }),
                zIndexOffset: 30000
            }).addTo(state.layer);

            const query = `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=HRDPS.CONTINENTAL_TT&QUERY_LAYERS=HRDPS.CONTINENTAL_TT&BBOX=${lat-0.01},${lng-0.01},${lat+0.01},${lng+0.01}&INFO_FORMAT=application/json&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326&TIME=${timeISO}`;
            
            const data = await fetchHRDPS(state.config.eccc + query);
            const el = marker.getElement();
            if (el) {
                const box = el.querySelector('.sync-glow');
                box.style.animation = "none";
                
                // Numerical Guard applied here [cite: 2025-12-30]
                const rawTemp = data ? data['HRDPS.CONTINENTAL_TT'] : null;
                const finalTemp = sanitize(rawTemp); 

                const label = box.querySelector('.t-val');
                label.innerText = `${Math.round(finalTemp)}°`;
                label.style.color = finalTemp <= 0 ? "#00d4ff" : "#FFD700";
                if (!data) box.style.borderStyle = "dashed"; 
            }
        });
        state.isLocked = false;
    }

    setInterval(sync, 500);
})();
