/** * Project: [weong-bulletin]
 * Methodology: [weong-route] Level 3 Exception Triggering
 * Status: Multi-Channel Proxy Bypass [cite: 2023-12-23, 2025-12-30]
 */

const WeatherBulletin = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        config: {
            // Level 3 Redundancy: Primary, Secondary, Tertiary [cite: 2025-12-30]
            proxies: [
                "https://api.allorigins.win/raw?url=",
                "https://corsproxy.io/?",
                "https://thingproxy.freeboard.io/fetch/"
            ],
            eccc: "https://geo.weather.gc.ca/geomet",
            nodes: [0.15, 0.45, 0.75, 0.92]
        }
    };

    // Level 3 Multi-Channel Fetch [cite: 2023-12-23]
    async function fetchDiagnostic(url, attempt = 0) {
        if (attempt >= state.config.proxies.length) return null;
        
        try {
            const res = await fetch(state.config.proxies[attempt] + encodeURIComponent(url));
            if (!res.ok) throw new Error();
            const json = await res.json();
            return json.contents ? JSON.parse(json.contents).features[0].properties : json.features[0].properties;
        } catch (e) {
            console.warn(`[weong-bulletin] Channel ${attempt} Failed. Rotating...`);
            return fetchDiagnostic(url, attempt + 1); // Recursive fallback [cite: 2025-12-30]
        }
    }

    async function processException() {
        if (state.isLocked || !window.map) return;

        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        const depTime = window.currentDepartureTime || new Date();
        if (!route) return;

        // State Delta Detection [cite: 2023-12-23]
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
            const forecastTime = new Date(depTime.getTime() + (idx / coords.length * 6) * 3600000);
            const timeISO = forecastTime.toISOString().substring(0, 13) + ":00:00Z";

            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'bulletin-node',
                    html: `<div class="sync-glow" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:48px; height:48px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px #000; animation: pulse 2s infinite;">
                            <span style="font-size:16px; line-height:1;">☁️</span>
                            <span class="t-val" style="font-size:13px; font-weight:bold; font-family:monospace; margin-top:2px;">...</span>
                           </div>`,
                    iconSize: [48, 48]
                }),
                zIndexOffset: 20000 // Priority over all route elements [cite: 2025-12-30]
            }).addTo(state.layer);

            const query = `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=HRDPS.CONTINENTAL_TT,HRDPS.CONTINENTAL_UU&QUERY_LAYERS=HRDPS.CONTINENTAL_TT,HRDPS.CONTINENTAL_UU&BBOX=${lat-0.01},${lng-0.01},${lat+0.01},${lng+0.01}&INFO_FORMAT=application/json&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326&TIME=${timeISO}`;
            
            fetchDiagnostic(state.config.eccc + query).then(p => {
                const el = marker.getElement();
                if (!el) return;
                const box = el.querySelector('.sync-glow');
                
                if (p) {
                    const temp = p['HRDPS.CONTINENTAL_TT'];
                    box.style.animation = "none";
                    box.querySelector('.t-val').innerText = `${Math.round(temp)}°`;
                    box.querySelector('.t-val').style.color = temp <= 0 ? "#00d4ff" : "#FFD700";
                } else {
                    box.querySelector('.t-val').innerText = "OFF"; // Failure state
                    box.querySelector('.t-val').style.color = "#ff4d4d";
                }
            });
        });
        state.isLocked = false;
    }

    // Diagnostic Glow Animation [cite: 2025-12-30]
    const style = document.createElement('style');
    style.innerHTML = `@keyframes pulse { 0% { box-shadow: 0 0 5px #FFD700; } 50% { box-shadow: 0 0 20px #FFD700; } 100% { box-shadow: 0 0 5px #FFD700; } }`;
    document.head.appendChild(style);

    setInterval(processException, 400);
})();
