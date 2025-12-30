/** * Project: [weong-bulletin]
 * Methodology: [weong-route] Level 3 Exception Triggering
 * Status: Final Locked Build [cite: 2025-12-30]
 */

const WeatherBulletin = (function() {
    // Core State Store [cite: 2025-12-27]
    const state = {
        weatherLayer: L.layerGroup(),
        lastRouteID: null,
        lastTimeID: null,
        isProcessing: false,
        config: {
            proxy: "https://api.allorigins.win/raw?url=",
            eccc: "https://geo.weather.gc.ca/geomet",
            intervals: [0.15, 0.45, 0.75, 0.92] // Level 3 Waypoint Distribution
        }
    };

    // Level 3 Data Fetcher [cite: 2025-12-26]
    async function fetchDiagnostic(lat, lng, timeISO) {
        const layers = "HRDPS.CONTINENTAL_TT,HRDPS.CONTINENTAL_SDE,HRDPS.CONTINENTAL_VIS,HRDPS.CONTINENTAL_UU";
        const query = `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=${layers}&QUERY_LAYERS=${layers}&BBOX=${lat-0.01},${lng-0.01},${lat+0.01},${lng+0.01}&INFO_FORMAT=application/json&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326&TIME=${timeISO}`;
        
        try {
            const res = await fetch(state.config.proxy + encodeURIComponent(state.config.eccc + query));
            const json = await res.json();
            return json.contents ? JSON.parse(json.contents).features[0].properties : json.features[0].properties;
        } catch (e) { return null; }
    }

    // Trigger Methodology: Only executes on Level 3 state delta [cite: 2023-12-23]
    async function evaluateState() {
        if (state.isProcessing || !window.map) return;

        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        const depTime = window.currentDepartureTime || new Date();
        
        if (!route) return;

        const routeID = JSON.stringify(route.feature.geometry.coordinates[0]) + route.feature.geometry.coordinates.length;
        const timeID = depTime.getHours();

        // Exception Trigger: If geometry or time hasn't changed, halt [cite: 2025-12-30]
        if (routeID === state.lastRouteID && timeID === state.lastTimeID) return;
        
        state.isProcessing = true;
        state.lastRouteID = routeID;
        state.lastTimeID = timeID;

        if (!window.map.hasLayer(state.weatherLayer)) state.weatherLayer.addTo(window.map);
        state.weatherLayer.clearLayers();

        const coords = route.feature.geometry.coordinates;
        
        for (const pct of state.config.intervals) {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            
            // Temporal Offset Logic [cite: 2025-12-30]
            const forecastTime = new Date(depTime.getTime() + (idx / coords.length * 6) * 3600000);
            const timeISO = forecastTime.toISOString().substring(0, 13) + ":00:00Z";

            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'weong-bulletin-node',
                    html: `<div class="sync-glow" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:48px; height:48px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px #000; animation: pulse 2s infinite;">
                            <span style="font-size:14px;">☁️</span>
                            <span class="t-val" style="font-size:13px; font-weight:bold; font-family:monospace;">...</span>
                           </div>`,
                    iconSize: [48, 48]
                }),
                zIndexOffset: 15000
            }).addTo(state.weatherLayer);

            // Execute Parallel Hydration [cite: 2025-12-30]
            fetchDiagnostic(lat, lng, timeISO).then(p => {
                if (!p) return;
                const temp = p['HRDPS.CONTINENTAL_TT'] || 0;
                const el = marker.getElement();
                if (el) {
                    el.querySelector('.sync-glow').style.animation = "none";
                    const label = el.querySelector('.t-val');
                    label.innerText = `${Math.round(temp)}°`;
                    label.style.color = temp <= 0 ? "#00d4ff" : "#FFD700";
                }
                marker.bindPopup(`
                    <div style="font-family:monospace; font-size:11px; color:#fff; background:#111; padding:10px; border-left:4px solid #FFD700;">
                        <b style="color:#FFD700;">[WEONG-BULLETIN] LEVEL 3</b><br>
                        TIME: ${forecastTime.getHours()}:00<br>
                        TEMP: ${temp.toFixed(1)}°C<br>
                        WIND: ${(p['HRDPS.CONTINENTAL_UU'] || 0).toFixed(0)} km/h<br>
                        VIS: ${(p['HRDPS.CONTINENTAL_VIS'] || 10).toFixed(1)} km
                    </div>`);
            });
        }
        state.isProcessing = false;
    }

    // Initialize Global Watcher [cite: 2025-12-30]
    setInterval(evaluateState, 400);

    return { refresh: () => { state.lastRouteID = null; evaluateState(); } };
})();
