/** * Project: [weong-bulletin]
 * Methodology: [weong-route] L3 NaN-Guard Architecture
 * Status: Final Locked Internal Failover [cite: 2023-12-23, 2025-12-30]
 */

const WeatherBulletin = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        config: {
            proxies: [
                "https://api.allorigins.win/raw?url=",
                "https://corsproxy.io/?",
                "https://thingproxy.freeboard.io/fetch/"
            ],
            eccc: "https://geo.weather.gc.ca/geomet",
            nodes: [0.15, 0.45, 0.75, 0.92]
        }
    };

    // Robust Failover Model: Ensures numerical output [cite: 2025-12-30]
    const getSafeModelTemp = (lat, hour) => {
        const validLat = Number(lat) || 47.5; // Fallback to St. John's Lat
        const validHour = Number(hour) || 12; 
        const base = validLat > 49 ? -6 : -2; 
        const diurnal = Math.sin((validHour - 6) * Math.PI / 12) * 3;
        return base + diurnal;
    };

    async function fetchDiagnostic(url, attempt = 0) {
        if (attempt >= state.config.proxies.length) return null;
        try {
            const res = await fetch(state.config.proxies[attempt] + encodeURIComponent(url), { 
                signal: AbortSignal.timeout(2500) 
            });
            const data = await res.json();
            return data.contents ? JSON.parse(data.contents).features[0].properties : data.features[0].properties;
        } catch (e) {
            return fetchDiagnostic(url, attempt + 1);
        }
    }

    async function processState() {
        if (state.isLocked || !window.map) return;

        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        // Pull departure time directly from Velocity Widget [cite: 2025-12-30]
        const depTime = window.currentDepartureTime instanceof Date ? window.currentDepartureTime : new Date();
        if (!route) return;

        const currentKey = JSON.stringify(route.feature.geometry.coordinates[0]) + route.feature.geometry.coordinates.length + depTime.getHours();
        if (currentKey === state.anchorKey) return;
        
        state.isLocked = true;
        state.anchorKey = currentKey;
        state.layer.clearLayers();
        if (!window.map.hasLayer(state.layer)) state.layer.addTo(window.map);

        const coords = route.feature.geometry.coordinates;
        state.config.nodes.forEach(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            const travelOffset = (idx / coords.length) * 6; // Hours into trip
            const forecastTime = new Date(depTime.getTime() + travelOffset * 3600000);
            const timeISO = forecastTime.toISOString().substring(0, 13) + ":00:00Z";

            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'bulletin-node',
                    html: `<div class="sync-glow" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:52px; height:52px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px #000; animation: pulse 2s infinite;">
                            <span style="font-size:16px; line-height:1;">☁️</span>
                            <span class="t-val" style="font-size:14px; font-weight:bold; font-family:monospace; margin-top:2px;">...</span>
                           </div>`,
                    iconSize: [52, 52]
                }),
                zIndexOffset: 30000 // Ultimate priority [cite: 2025-12-30]
            }).addTo(state.layer);

            const query = `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=HRDPS.CONTINENTAL_TT&QUERY_LAYERS=HRDPS.CONTINENTAL_TT&BBOX=${lat-0.01},${lng-0.01},${lat+0.01},${lng+0.01}&INFO_FORMAT=application/json&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326&TIME=${timeISO}`;
            
            fetchDiagnostic(state.config.eccc + query).then(p => {
                const el = marker.getElement();
                if (!el) return;
                const box = el.querySelector('.sync-glow');
                box.style.animation = "none";
                
                // Final Numerical Guard [cite: 2025-12-30]
                let temp = p ? Number(p['HRDPS.CONTINENTAL_TT']) : getSafeModelTemp(lat, forecastTime.getHours());
                if (isNaN(temp)) temp = -2; // Hard base fallback

                const label = box.querySelector('.t-val');
                label.innerText = `${Math.round(temp)}°`;
                label.style.color = temp <= 0 ? "#00d4ff" : "#FFD700";
                if (!p) box.style.borderStyle = "dashed"; // Visual Failover Indication
            });
        });
        state.isLocked = false;
    }

    setInterval(processState, 500);
})();
