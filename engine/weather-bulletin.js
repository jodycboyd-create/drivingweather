/** * [weong-bulletin] Time-Aware HRDPS Engine 
 * Status: Velocity-Widget Synced [cite: 2025-12-30]
 * Logic: Real-time Newfoundland HRDPS Final Dataset [cite: 2025-12-26]
 */

(function() {
    let weatherLayer = L.layerGroup();
    let lastAnchor = null;

    const ECCC_BASE = "https://geo.weather.gc.ca/geomet";
    const PROXY = "https://api.allorigins.win/raw?url=";

    const fetchPointWeather = async (lat, lng, timeISO) => {
        const layers = "HRDPS.CONTINENTAL_TT,HRDPS.CONTINENTAL_SDE,HRDPS.CONTINENTAL_VIS,HRDPS.CONTINENTAL_UU";
        const query = `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=${layers}&QUERY_LAYERS=${layers}` +
                      `&BBOX=${lat-0.01},${lng-0.01},${lat+0.01},${lng+0.01}&INFO_FORMAT=application/json` +
                      `&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326&TIME=${timeISO}`;
        try {
            const response = await fetch(PROXY + encodeURIComponent(ECCC_BASE + query));
            const json = await response.json();
            const p = json.contents ? JSON.parse(json.contents).features[0].properties : json.features[0].properties;
            return p;
        } catch (e) { 
            return null; 
        }
    };

    const updateWeatherNodes = async () => {
        if (!window.map) return;

        // 1. Grab Current Route & Departure Time [cite: 2025-12-30]
        let activeRoute = null;
        window.map.eachLayer(layer => {
            if (layer.feature?.geometry?.type === "LineString") activeRoute = layer;
        });

        const depTime = window.currentDepartureTime || new Date(); // Link to Velocity Widget [cite: 2025-12-30]
        const coords = activeRoute?.feature?.geometry?.coordinates;
        
        if (!coords) return;

        // Unique anchor: Route Geometry + Departure Hour [cite: 2025-12-30]
        const currentAnchor = JSON.stringify(coords[0]) + coords.length + depTime.getHours();
        if (currentAnchor === lastAnchor) return;
        lastAnchor = currentAnchor;

        weatherLayer.clearLayers();
        const pcts = [0.15, 0.45, 0.75, 0.92];

        pcts.forEach(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            
            // Calculate time offset based on route progress [cite: 2025-12-30]
            const travelHours = (idx / coords.length) * 6; // Est. based on average NL transit
            const forecastTime = new Date(depTime.getTime() + travelHours * 3600000);
            const timeISO = forecastTime.toISOString().substring(0, 13) + ":00:00Z";

            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'w-icon',
                    html: `<div class="w-box" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:48px; height:48px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px #000;">
                            <span style="font-size:14px;">☁️</span>
                            <span class="t-val" style="font-size:13px; font-weight:bold; font-family:monospace;">...</span>
                           </div>`,
                    iconSize: [48, 48]
                })
            }).addTo(weatherLayer);

            // Fetch Real HRDPS Data (Replacing the -2 hardcode) [cite: 2025-12-30]
            const p = await fetchPointWeather(lat, lng, timeISO);
            if (p) {
                const temp = p['HRDPS.CONTINENTAL_TT'] || 0;
                const el = marker.getElement();
                if (el) {
                    const label = el.querySelector('.t-val');
                    label.innerText = `${Math.round(temp)}°`;
                    label.style.color = temp <= 0 ? "#00d4ff" : "#FFD700";
                }
                
                marker.bindPopup(`
                    <div style="font-family:monospace; font-size:11px; background:#111; color:#fff; padding:10px; border-left:3px solid #FFD700;">
                        <b style="color:#FFD700;">HRDPS @ ${forecastTime.getHours()}:00</b><br>
                        TEMP: ${temp.toFixed(1)}°C<br>
                        WIND: ${(p['HRDPS.CONTINENTAL_UU'] || 0).toFixed(1)} km/h<br>
                        VIS: ${(p['HRDPS.CONTINENTAL_VIS'] || 10).toFixed(1)} km
                    </div>`);
            }
        });
    };

    if (!window.map.hasLayer(weatherLayer)) weatherLayer.addTo(window.map);
    setInterval(updateWeatherNodes, 500); // Frequent poll to catch Widget updates [cite: 2025-12-30]
})();
