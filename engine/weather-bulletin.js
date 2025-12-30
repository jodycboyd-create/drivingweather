/** * [weong-bulletin] Clean HRDPS Diagnostic Engine 
 * Status: Uniform Reporting (Level 3 Triggers Disabled) 
 * Locked: Dec 30, 2025 [cite: 2025-12-30]
 */

(function() {
    let weatherLayer = L.layerGroup();
    let lastCoords = null;

    const BulletinLogic = {
        ECCC_BASE: "https://geo.weather.gc.ca/geomet",
        PROXY: "https://api.allorigins.win/raw?url=",

        async fetchECCCPoint(lat, lng, timeISO) {
            const layers = "HRDPS.CONTINENTAL_TT,HRDPS.CONTINENTAL_SDE,HRDPS.CONTINENTAL_VIS,HRDPS.CONTINENTAL_UU";
            const query = `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo` +
                          `&LAYERS=${layers}&QUERY_LAYERS=${layers}&BBOX=${lat-0.01},${lng-0.01},${lat+0.01},${lng+0.01}` +
                          `&INFO_FORMAT=application/json&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326` +
                          `&TIME=${timeISO}`;
            try {
                const response = await fetch(this.PROXY + encodeURIComponent(this.ECCC_BASE + query));
                const json = await response.json();
                const p = json.contents ? JSON.parse(json.contents).features[0].properties : json.features[0].properties;
                return { lat, lng, temp: p['HRDPS.CONTINENTAL_TT'] || 0, snow: p['HRDPS.CONTINENTAL_SDE'] || 0, vis: p['HRDPS.CONTINENTAL_VIS'] || 10, wind: p['HRDPS.CONTINENTAL_UU'] || 0 };
            } catch (e) {
                return { lat, lng, temp: 0, snow: 0, vis: 10, wind: 0, isSim: true };
            }
        },

        generateTableHTML(data) {
            return `
                <div style="font-family: 'Courier New', monospace; font-size: 11px; background: rgba(10,10,10,0.98); color: #fff; padding: 12px; border-left: 4px solid #FFD700; box-shadow: 0 4px 15px #000; min-width: 170px;">
                    <div style="color: #FFD700; font-weight: bold; margin-bottom: 8px; letter-spacing: 1px; border-bottom: 1px solid #333; padding-bottom: 4px;">HRDPS DIAGNOSTIC</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                        <span style="color: #888;">TEMPERATURE</span><span style="text-align: right;">${data.temp.toFixed(1)}°C</span>
                        <span style="color: #888;">WIND VEL</span><span style="text-align: right;">${data.wind.toFixed(0)}km/h</span>
                        <span style="color: #888;">VISIBILITY</span><span style="text-align: right;">${data.vis.toFixed(1)}km</span>
                        <span style="color: #888;">SNOW ACCUM</span><span style="text-align: right;">${data.snow.toFixed(1)}cm</span>
                    </div>
                </div>`;
        }
    };

    const findAndSyncWeather = async () => {
        if (!window.map) return;
        if (!window.map.hasLayer(weatherLayer)) weatherLayer.addTo(window.map);

        let routeCoords = null;
        window.map.eachLayer(layer => {
            if (layer.feature && layer.feature.geometry && layer.feature.geometry.type === "LineString") {
                routeCoords = layer.feature.geometry.coordinates;
            }
        });

        if (!routeCoords || JSON.stringify(routeCoords) === lastCoords) return;
        lastCoords = JSON.stringify(routeCoords);
        weatherLayer.clearLayers();

        const depTime = window.currentDepartureTime || new Date();
        const speed = (window.currentSpeedOffset || 0) + 90;
        
        // Sampling points across the route [cite: 2025-12-30]
        const pcts = [0.15, 0.45, 0.75, 0.95];
        const fetchPromises = pcts.map(pct => {
            const idx = Math.floor((routeCoords.length - 1) * pct);
            const [lng, lat] = routeCoords[idx];
            const travelHours = (idx / routeCoords.length) * (routeCoords.length / speed);
            const timeISO = new Date(depTime.getTime() + travelHours * 3600000).toISOString().substring(0, 13) + ":00:00Z";
            return BulletinLogic.fetchECCCPoint(lat, lng, timeISO);
        });

        const results = await Promise.all(fetchPromises);

        results.forEach(data => {
            // Uniform Tactical Icon (Boxed Cloud)
            const iconHtml = `
                <div style="background: #000; border: 2px solid #FFD700; border-radius: 4px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: #FFD700; box-shadow: 0 0 10px #000;">
                    ☁️
                </div>`;

            L.marker([data.lat, data.lng], {
                icon: L.divIcon({ html: iconHtml, className: 'w-icon', iconSize: [28, 28] }),
                zIndexOffset: 10000 
            })
            .bindPopup(BulletinLogic.generateTableHTML(data), { maxWidth: 250 })
            .addTo(weatherLayer);
        });
    };

    setInterval(findAndSyncWeather, 2000); 
    window.addEventListener('weong:update', findAndSyncWeather);
})();
