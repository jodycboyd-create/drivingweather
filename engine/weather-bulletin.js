/** * [weong-bulletin] Unified HRDPS Diagnostic Engine 
 * Status: Locked & Independent - Dec 30, 2025 [cite: 2025-12-30]
 */

(function() {
    let lastRoute = null;
    let weatherMarkers = L.layerGroup();

    // 1. AUTO-INITIALIZATION [cite: 2025-12-30]
    const initMapCheck = setInterval(() => {
        if (window.map) {
            weatherMarkers.addTo(window.map);
            // Retrospective check: If route-engine already placed a route [cite: 2025-12-30]
            if (window.currentRouteData) {
                lastRoute = window.currentRouteData;
                updateWeatherMarkers(lastRoute);
            }
            clearInterval(initMapCheck);
        }
    }, 100);

    // 2. DIAGNOSTIC LOGIC [cite: 2023-12-23, 2025-12-30]
    window.BulletinLogic = {
        ECCC_BASE: "https://geo.weather.gc.ca/geomet",
        
        formatPOP(popValue) {
            if (popValue === null || popValue === undefined) return null;
            const roundedPop = Math.round(popValue / 10) * 10;
            return roundedPop >= 30 ? `${roundedPop}%` : null;
        },

        checkException(data) {
            // Level 3 Hazard Triggers for Newfoundland [cite: 2023-12-23]
            return (data.snow > 5) || (data.vis < 0.8) || (data.wind > 90);
        },

        async fetchECCCPoint(lat, lng, timeISO) {
            // Querying HRDPS Continental Grid for Temperature, Snow, Visibility, and Wind [cite: 2025-12-30]
            const layers = "HRDPS.CONTINENTAL_TT,HRDPS.CONTINENTAL_SDE,HRDPS.CONTINENTAL_VIS,HRDPS.CONTINENTAL_UU";
            const url = `${this.ECCC_BASE}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo` +
                        `&LAYERS=${layers}&QUERY_LAYERS=${layers}&BBOX=${lat-0.01},${lng-0.01},${lat+0.01},${lng+0.01}` +
                        `&INFO_FORMAT=application/json&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326` +
                        `&TIME=${timeISO}`;
            try {
                const res = await fetch(url);
                const json = await res.json();
                if (!json.features || !json.features[0]) return null;
                const p = json.features[0].properties;
                return {
                    temp: p['HRDPS.CONTINENTAL_TT'] || 0,
                    snow: p['HRDPS.CONTINENTAL_SDE'] || 0,
                    vis: p['HRDPS.CONTINENTAL_VIS'] || 10,
                    wind: p['HRDPS.CONTINENTAL_UU'] || 0,
                    pop: 30 // Baseline for PubPro rules [cite: 2025-12-30]
                };
            } catch (e) { return null; }
        },

        generateTableHTML(data) {
            const isCrit = this.checkException(data);
            const popStr = this.formatPOP(data.pop);
            return `
                <div style="font-family: 'Courier New', monospace; font-size: 11px; background: rgba(10,10,10,0.98); color: #fff; padding: 12px; border-left: 4px solid ${isCrit ? '#ff4757' : '#FFD700'}; box-shadow: 0 4px 15px #000;">
                    <div style="color: #FFD700; font-weight: bold; margin-bottom: 8px; letter-spacing: 1px;">HRDPS DIAGNOSTIC</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                        <span style="color: #888;">TEMP:</span><span style="text-align: right;">${data.temp.toFixed(1)}°C</span>
                        <span style="color: #888;">WIND:</span><span style="text-align: right;">${data.wind.toFixed(0)}km/h</span>
                        <span style="color: #888; color: ${data.vis < 1 ? '#ff4757' : '#888'};">VIS:</span><span style="text-align: right;">${data.vis.toFixed(1)}km</span>
                        <span style="color: #888;">SNOW:</span><span style="text-align: right;">${data.snow.toFixed(1)}cm</span>
                        ${popStr ? `<span style="color: #888;">POP:</span><span style="text-align: right;">${popStr}</span>` : ''}
                    </div>
                </div>`;
        }
    };

    // 3. MAP RENDERING [cite: 2025-12-30]
    async function updateWeatherMarkers(route) {
        if (!window.map || !route) return;
        weatherMarkers.clearLayers();

        const coords = route.geometry.coordinates;
        const totalDist = route.distance / 1000;
        const depTime = window.currentDepartureTime || new Date();
        const speed = (window.currentSpeedOffset || 0) + 90;

        // Diagnostic points sampled at key route segments [cite: 2025-12-30]
        for (let pct of [0.1, 0.35, 0.65, 0.9]) {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            
            const eta = new Date(depTime.getTime() + ((totalDist * pct) / speed) * 3600000);
            const timeISO = eta.toISOString().substring(0, 13) + ":00:00Z";

            const data = await window.BulletinLogic.fetchECCCPoint(lat, lng, timeISO);
            if (data) {
                const isCrit = window.BulletinLogic.checkException(data);
                const iconHtml = `
                    <div style="background: #000; border: 2px solid ${isCrit ? '#ff4757' : '#FFD700'}; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; color: ${isCrit ? '#ff4757' : '#FFD700'}; font-weight: bold; font-size: 14px; box-shadow: 0 0 10px #000; cursor: pointer;">
                        ${isCrit ? '!' : '●'}
                    </div>`;

                L.marker([lat, lng], {
                    icon: L.divIcon({ html: iconHtml, className: 'w-marker', iconSize: [26, 26] }),
                    zIndexOffset: 1000 // Force display above the route ribbon [cite: 2025-12-30]
                })
                .bindPopup(window.BulletinLogic.generateTableHTML(data), { maxWidth: 220 })
                .addTo(weatherMarkers);
            }
        }
    }

    // 4. EVENT BINDINGS [cite: 2025-12-30]
    window.addEventListener('weong:routeUpdated', (e) => {
        lastRoute = e.detail;
        window.currentRouteData = lastRoute; 
        updateWeatherMarkers(lastRoute);
    });

    window.addEventListener('weong:update', () => {
        if (lastRoute) updateWeatherMarkers(lastRoute);
    });

})();
