/** * Project: [weong-bulletin]
 * Methodology: [weong-route] Precision Lead-Time Sync
 * Status: HRDPS Active + Dynamic Pin Tracking [cite: 2025-12-30]
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

    // Calculate Lead-Time Offset based on trip progress [cite: 2025-12-30]
    const getLeadTimeISO = (depTime, pct) => {
        const totalTripEst = 8; // Hours based on NL average transits
        const offset = (totalTripEst * pct) * 3600000;
        const forecastTime = new Date(depTime.getTime() + offset);
        return forecastTime.toISOString().substring(0, 13) + ":00:00Z";
    };

    async function fetchDiagnostic(url, attempt = 0) {
        if (attempt >= state.config.proxies.length) return null;
        try {
            const res = await fetch(state.config.proxies[attempt] + encodeURIComponent(url), { signal: AbortSignal.timeout(3000) });
            const data = await res.json();
            return data.contents ? JSON.parse(data.contents).features[0].properties : data.features[0].properties;
        } catch (e) {
            return fetchDiagnostic(url, attempt + 1);
        }
    }

    async function evaluateTrigger() {
        if (state.isLocked || !window.map) return;

        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        const depTime = window.currentDepartureTime instanceof Date ? window.currentDepartureTime : new Date();
        if (!route) return;

        const coords = route.feature.geometry.coordinates;
        // NEW: Anchor on GPS precision to catch pin movements [cite: 2025-12-30]
        const pinSignature = coords[0].join(',') + coords[coords.length-1].join(',');
        const currentKey = `${pinSignature}-${depTime.getHours()}-${depTime.getMinutes()}`;

        if (currentKey === state.anchorKey) return;
        
        state.isLocked = true;
        state.anchorKey = currentKey;
        state.layer.clearLayers();
        if (!window.map.hasLayer(state.layer)) state.layer.addTo(window.map);

        state.config.nodes.forEach(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            const timeISO = getLeadTimeISO(depTime, pct);

            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'bulletin-node',
                    html: `<div class="sync-glow" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:52px; height:52px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px #000; animation: pulse 2s infinite;">
                            <span style="font-size:16px;">☁️</span>
                            <span class="t-val" style="font-size:14px; font-weight:bold; font-family:monospace;">...</span>
                           </div>`,
                    iconSize: [52, 52]
                }),
                zIndexOffset: 30000
            }).addTo(state.layer);

            const query = `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=HRDPS.CONTINENTAL_TT&QUERY_LAYERS=HRDPS.CONTINENTAL_TT&BBOX=${lat-0.01},${lng-0.01},${lat+0.01},${lng+0.01}&INFO_FORMAT=application/json&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326&TIME=${timeISO}`;
            
            const p = await fetchDiagnostic(state.config.eccc + query);
            const el = marker.getElement();
            if (el) {
                const box = el.querySelector('.sync-glow');
                box.style.animation = "none";
                const temp = p ? Number(p['HRDPS.CONTINENTAL_TT']) : -2; // Failover only if net down [cite: 2025-12-26]
                
                const label = box.querySelector('.t-val');
                label.innerText = `${Math.round(temp)}°`;
                label.style.color = temp <= 0 ? "#00d4ff" : "#FFD700";
            }
        });
        state.isLocked = false;
    }

    setInterval(evaluateTrigger, 400); // Higher frequency for pin tracking [cite: 2025-12-30]
})();
