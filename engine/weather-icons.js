/** * Project: [weong-bulletin]
 * Methodology: [weong-route] L3 Stealth-Sync
 * Status: Proxy-Bypass + Virtual NL Dataset [cite: 2023-12-23, 2025-12-30]
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
                "https://api.codetabs.com/v1/proxy?quest="
            ],
            eccc: "https://geo.weather.gc.ca/geomet",
            nodes: [0.15, 0.45, 0.75, 0.92]
        }
    };

    // Geographic Wind Model for NL (Used only when net is down) [cite: 2025-12-26, 2025-12-30]
    const getNLWindBridge = (lat, lng, hour) => {
        const baseWind = lat > 49 ? 25 : 15; // North Peninsula is windier
        const coastalEffect = lng < -56 ? 10 : 0; // West coast / Gulf effect
        const diurnal = Math.abs(Math.cos(hour * Math.PI / 12)) * 15;
        return baseWind + coastalEffect + diurnal;
    };

    const sanitize = (val, fallback) => {
        const num = parseFloat(val);
        return isNaN(num) ? fallback : num;
    };

    async function fetchWEONG(url, attempt = 0) {
        if (attempt >= state.config.proxies.length) return null;
        try {
            const res = await fetch(state.config.proxies[attempt] + encodeURIComponent(url), { 
                mode: 'cors',
                signal: AbortSignal.timeout(1500) 
            });
            const d = await res.json();
            return d.contents ? JSON.parse(d.contents).features[0].properties : d.features[0].properties;
        } catch (e) { return fetchWEONG(url, attempt + 1); }
    }

    async function reAnchor() {
        if (state.isLocked || !window.map) return;

        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!route) return;

        const depTime = window.currentDepartureTime instanceof Date ? window.currentDepartureTime : new Date();
        const coords = route.feature.geometry.coordinates;
        
        // Dynamic key triggers on any coordinate change or time shift [cite: 2025-12-30]
        const currentKey = `${coords[0][0].toFixed(4)}-${coords.length}-${depTime.getHours()}`;
        if (currentKey === state.anchorKey) return;
        
        state.isLocked = true;
        state.anchorKey = currentKey;
        state.layer.clearLayers();
        if (!window.map.hasLayer(state.layer)) state.layer.addTo(window.map);

        state.config.nodes.forEach(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            const forecastHour = (depTime.getHours() + Math.floor(pct * 8)) % 24;
            const timeISO = new Date(depTime.getTime() + (pct * 8) * 3600000).toISOString().substring(0, 13) + ":00:00Z";

            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div class="sync-glow" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:56px; height:56px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px rgba(0,0,0,0.8);">
                            <span style="font-size:14px;">☁️</span>
                            <span class="t-val" style="font-size:13px; font-weight:bold; font-family:monospace;">...</span>
                            <span class="w-val" style="font-size:10px; font-family:monospace; color:#00d4ff;">--</span>
                           </div>`,
                    iconSize: [56, 56]
                }),
                zIndexOffset: 45000
            }).addTo(state.layer);

            const query = `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=HRDPS.CONTINENTAL_TT,HRDPS.CONTINENTAL_UU&QUERY_LAYERS=HRDPS.CONTINENTAL_TT,HRDPS.CONTINENTAL_UU&BBOX=${lat-0.01},${lng-0.01},${lat+0.01},${lng+0.01}&INFO_FORMAT=application/json&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326&TIME=${timeISO}`;
            
            const data = await fetchWEONG(state.config.eccc + query);
            const el = marker.getElement();
            if (el) {
                const box = el.querySelector('.sync-glow');
                
                // DATA SELECTION: Live HRDPS vs Virtual NL Bridge [cite: 2025-12-30]
                const temp = data ? sanitize(data['HRDPS.CONTINENTAL_TT'], -2) : -2;
                const wind = data ? sanitize(data['HRDPS.CONTINENTAL_UU'], 0) : getNLWindBridge(lat, lng, forecastHour);

                box.querySelector('.t-val').innerText = `${Math.round(temp)}°`;
                box.querySelector('.w-val').innerText = `${Math.round(wind)}k`;
                
                // Visual marker: Dashed = Virtual, Solid = Live HRDPS [cite: 2025-12-30]
                box.style.borderStyle = data ? "solid" : "dashed";
                if (!data) box.style.borderColor = "#00d4ff"; // Blue tint for virtual data
            }
        });
        state.isLocked = false;
    }

    setInterval(reAnchor, 250);
})();
