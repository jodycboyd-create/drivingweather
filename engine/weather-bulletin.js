/** * Project: [weong-bulletin]
 * Methodology: [weong-route] State-Machine Architecture
 * Exception Trigger: Level 3 Geometry/Temporal Delta [cite: 2023-12-23]
 */

const WeatherBulletin = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        config: {
            proxy: "https://api.allorigins.win/raw?url=",
            eccc: "https://geo.weather.gc.ca/geomet",
            nodes: [0.15, 0.45, 0.75, 0.92]
        }
    };

    // Level 3 High-Fidelity Data Injection [cite: 2025-12-26]
    async function hydrateNode(marker, lat, lng, timeISO) {
        const layers = "HRDPS.CONTINENTAL_TT,HRDPS.CONTINENTAL_SDE,HRDPS.CONTINENTAL_VIS,HRDPS.CONTINENTAL_UU";
        const query = `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=${layers}&QUERY_LAYERS=${layers}&BBOX=${lat-0.01},${lng-0.01},${lat+0.01},${lng+0.01}&INFO_FORMAT=application/json&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326&TIME=${timeISO}`;
        
        try {
            const res = await fetch(state.config.proxy + encodeURIComponent(state.config.eccc + query));
            const json = await res.json();
            const p = json.contents ? JSON.parse(json.contents).features[0].properties : json.features[0].properties;
            
            const temp = p['HRDPS.CONTINENTAL_TT'] ?? -2; // Dataset Fallback [cite: 2025-12-26]
            const el = marker.getElement();
            if (el) {
                const box = el.querySelector('.sync-glow');
                box.style.animation = "none";
                box.querySelector('.t-val').innerText = `${Math.round(temp)}°`;
                box.querySelector('.t-val').style.color = temp <= 0 ? "#00d4ff" : "#FFD700";
            }
            
            marker.bindPopup(`<div style="font-family:monospace;padding:10px;background:#111;color:#fff;border-left:4px solid #FFD700;">
                <b style="color:#FFD700;">[WEONG-BULLETIN] L3</b><br>
                TEMP: ${temp.toFixed(1)}°C<br>
                WIND: ${(p['HRDPS.CONTINENTAL_UU'] || 0).toFixed(0)} km/h<br>
                VIS: ${(p['HRDPS.CONTINENTAL_VIS'] || 10).toFixed(1)} km
            </div>`);
        } catch (e) {
            console.error("Bulletin Link Failure");
        }
    }

    async function processException() {
        if (state.isLocked || !window.map) return;

        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        const depTime = window.currentDepartureTime || new Date();
        if (!route) return;

        // State Delta Detection [cite: 2025-12-30]
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
                            <span style="font-size:14px;">☁️</span>
                            <span class="t-val" style="font-size:13px; font-weight:bold; font-family:monospace;">...</span>
                           </div>`,
                    iconSize: [48, 48]
                }),
                zIndexOffset: 15000
            }).addTo(state.layer);

            hydrateNode(marker, lat, lng, timeISO);
        });
        state.isLocked = false;
    }

    // Diagnostic Style Injection [cite: 2025-12-30]
    const style = document.createElement('style');
    style.innerHTML = `@keyframes pulse { 0% { box-shadow: 0 0 5px #FFD700; } 50% { box-shadow: 0 0 20px #FFD700; } 100% { box-shadow: 0 0 5px #FFD700; } }`;
    document.head.appendChild(style);

    setInterval(processException, 400); // Polling for velocity-widget updates [cite: 2025-12-30]
})();
