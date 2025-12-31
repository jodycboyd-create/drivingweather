/** * Project: [weong-bulletin]
 * Methodology: [weong-route] Mutation-Level Sync
 * Status: Proxy-Bypass + High-Precision Sticky Icons [cite: 2023-12-23, 2025-12-30]
 */

const WeatherBulletin = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        config: {
            // Added a new "Emergency" proxy channel [cite: 2025-12-30]
            proxies: [
                "https://api.allorigins.win/raw?url=",
                "https://corsproxy.io/?",
                "https://api.codetabs.com/v1/proxy?quest="
            ],
            eccc: "https://geo.weather.gc.ca/geomet",
            nodes: [0.15, 0.45, 0.75, 0.92]
        }
    };

    const sanitize = (val, fallback) => {
        const num = parseFloat(val);
        return isNaN(num) ? fallback : num;
    };

    async function fetchWEONG(url, attempt = 0) {
        if (attempt >= state.config.proxies.length) return null;
        try {
            const res = await fetch(state.config.proxies[attempt] + encodeURIComponent(url), { 
                signal: AbortSignal.timeout(1800) 
            });
            const d = await res.json();
            const p = d.contents ? JSON.parse(d.contents).features[0].properties : d.features[0].properties;
            return p;
        } catch (e) { return fetchWEONG(url, attempt + 1); }
    }

    async function reAnchor() {
        if (state.isLocked || !window.map) return;

        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!route || !route._parts || route._parts.length === 0) return;

        const depTime = window.currentDepartureTime instanceof Date ? window.currentDepartureTime : new Date();
        const coords = route.feature.geometry.coordinates;
        
        // NEW: Precision Fingerprint tracks the first and last coord exactly [cite: 2025-12-30]
        const geoFingerprint = `${coords[0][0]},${coords[0][1]}|${coords[coords.length-1][0]}`;
        const currentKey = `${geoFingerprint}-${depTime.getTime()}`;

        if (currentKey === state.anchorKey) return;
        state.isLocked = true;
        state.anchorKey = currentKey;

        state.layer.clearLayers();
        if (!window.map.hasLayer(state.layer)) state.layer.addTo(window.map);

        state.config.nodes.forEach(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            
            const forecastTime = new Date(depTime.getTime() + (pct * 8) * 3600000);
            const timeISO = forecastTime.toISOString().substring(0, 13) + ":00:00Z";

            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div class="sync-glow" style="background:rgba(0,0,0,0.9); border:2px solid #FFD700; border-radius:4px; width:56px; height:56px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px #000; backdrop-filter:blur(2px);">
                            <span style="font-size:14px;">☁️</span>
                            <span class="t-val" style="font-size:13px; font-weight:bold; font-family:monospace;">...</span>
                            <span class="w-val" style="font-size:10px; font-family:monospace; color:#00d4ff;">--</span>
                           </div>`,
                    iconSize: [56, 56]
                }),
                zIndexOffset: 40000 // Priority over all UI elements [cite: 2025-12-30]
            }).addTo(state.layer);

            const query = `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=HRDPS.CONTINENTAL_TT,HRDPS.CONTINENTAL_UU&QUERY_LAYERS=HRDPS.CONTINENTAL_TT,HRDPS.CONTINENTAL_UU&BBOX=${lat-0.01},${lng-0.01},${lat+0.01},${lng+0.01}&INFO_FORMAT=application/json&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326&TIME=${timeISO}`;
            
            const data = await fetchWEONG(state.config.eccc + query);
            const el = marker.getElement();
            if (el) {
                const box = el.querySelector('.sync-glow');
                const temp = sanitize(data ? data['HRDPS.CONTINENTAL_TT'] : null, -2);
                const wind = sanitize(data ? data['HRDPS.CONTINENTAL_UU'] : null, null);

                box.querySelector('.t-val').innerText = `${Math.round(temp)}°`;
                // If wind exists, display it; otherwise show "OFF" diagnostic [cite: 2025-12-30]
                box.querySelector('.w-val').innerText = wind !== null ? `${Math.round(wind)}k` : "OFF";
                if (!data) box.style.borderStyle = "dashed";
            }
        });
        state.isLocked = false;
    }

    // High-frequency polling to match pin drag speed [cite: 2025-12-30]
    setInterval(reAnchor, 200);
})();
