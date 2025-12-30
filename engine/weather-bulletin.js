/** * [weong-bulletin] Final Sync Engine 
 * Status: Coupled + Time-Aware + Visual Feedback [cite: 2025-12-30]
 * Data: Dynamic HRDPS Newfoundland Dataset [cite: 2025-12-26]
 */

(function() {
    let weatherLayer = L.layerGroup();
    let lastStateKey = null;

    const ECCC_BASE = "https://geo.weather.gc.ca/geomet";
    const PROXY = "https://api.allorigins.win/raw?url=";

    const fetchHRDPS = async (lat, lng, timeISO) => {
        const layers = "HRDPS.CONTINENTAL_TT,HRDPS.CONTINENTAL_SDE,HRDPS.CONTINENTAL_VIS,HRDPS.CONTINENTAL_UU";
        const query = `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=${layers}&QUERY_LAYERS=${layers}` +
                      `&BBOX=${lat-0.01},${lng-0.01},${lat+0.01},${lng+0.01}&INFO_FORMAT=application/json` +
                      `&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326&TIME=${timeISO}`;
        try {
            const response = await fetch(PROXY + encodeURIComponent(ECCC_BASE + query));
            const json = await response.json();
            return json.contents ? JSON.parse(json.contents).features[0].properties : json.features[0].properties;
        } catch (e) { return null; }
    };

    const syncWeather = async () => {
        if (!window.map) return;

        let routeLayer = null;
        window.map.eachLayer(l => { if (l.feature?.geometry?.type === "LineString") routeLayer = l; });
        const depTime = window.currentDepartureTime || new Date();
        const coords = routeLayer?.feature?.geometry?.coordinates;

        if (!coords) return;

        // Anchor Check: Geometry + Time in Hours [cite: 2025-12-30]
        const stateKey = JSON.stringify(coords[0]) + coords.length + depTime.getHours();
        if (stateKey === lastStateKey) return;
        lastStateKey = stateKey;

        if (!window.map.hasLayer(weatherLayer)) weatherLayer.addTo(window.map);
        weatherLayer.clearLayers();

        const pcts = [0.15, 0.45, 0.75, 0.92];
        pcts.forEach(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            
            const travelHours = (idx / coords.length) * 6; 
            const forecastTime = new Date(depTime.getTime() + travelHours * 3600000);
            const timeISO = forecastTime.toISOString().substring(0, 13) + ":00:00Z";

            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'w-icon',
                    html: `<div class="sync-glow" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:48px; height:48px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px #000; animation: pulse 2s infinite;">
                            <span style="font-size:14px;">☁️</span>
                            <span class="t-val" style="font-size:13px; font-weight:bold; font-family:monospace;">...</span>
                           </div>`,
                    iconSize: [48, 48]
                }),
                zIndexOffset: 15000 
            }).addTo(weatherLayer);

            const p = await fetchHRDPS(lat, lng, timeISO);
            if (p) {
                const temp = p['HRDPS.CONTINENTAL_TT'] || 0;
                const el = marker.getElement();
                if (el) {
                    const box = el.querySelector('.sync-glow');
                    const label = el.querySelector('.t-val');
                    box.style.animation = "none"; // Stop glowing once data arrives [cite: 2025-12-30]
                    label.innerText = `${Math.round(temp)}°`;
                    label.style.color = temp <= 0 ? "#00d4ff" : "#FFD700";
                }
                marker.bindPopup(`<div style="font-family:monospace; font-size:11px; color:#fff; background:#111; padding:8px; border-left:3px solid #FFD700;">
                    <b>${forecastTime.getHours()}:00 FORECAST</b><br>
                    TEMP: ${temp.toFixed(1)}°C<br>
                    WIND: ${(p['HRDPS.CONTINENTAL_UU'] || 0).toFixed(0)} km/h<br>
                    VIS: ${(p['HRDPS.CONTINENTAL_VIS'] || 10).toFixed(1)} km
                </div>`);
            }
        });
    };

    // Inject required animation style [cite: 2025-12-30]
    const style = document.createElement('style');
    style.innerHTML = `@keyframes pulse { 0% { box-shadow: 0 0 5px #FFD700; } 50% { box-shadow: 0 0 20px #FFD700; } 100% { box-shadow: 0 0 5px #FFD700; } }`;
    document.head.appendChild(style);

    setInterval(syncWeather, 400); 
})();
