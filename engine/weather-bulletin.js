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
            if (window.currentRouteData) {
                lastRoute = window.currentRouteData;
                updateWeatherMarkers(lastRoute);
            }
            clearInterval(initMapCheck);
        }
    }, 100);

    window.BulletinLogic = {
        ECCC_BASE: "https://geo.weather.gc.ca/geomet",
        
        formatPOP(popValue) {
            if (popValue === null || popValue === undefined) return null;
            const roundedPop = Math.round(popValue / 10) * 10;
            return roundedPop >= 30 ? `${roundedPop}%` : null;
        },

        checkException(data) {
            return (data.snow > 5) || (data.vis < 0.8) || (data.wind > 90);
        },

        async fetchECCCPoint(lat, lng, timeISO) {
            const layers = "HRDPS.CONTINENTAL_TT,HRDPS.CONTINENTAL_SDE,HRDPS.CONTINENTAL_VIS,HRDPS.CONTINENTAL_UU";
            const url = `${this.ECCC_BASE}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo` +
                        `&LAYERS=${layers}&QUERY_LAYERS=${layers}&BBOX=${lat-0.01},${lng-0.01},${lat+0.01},${lng+0.01}` +
                        `&INFO_FORMAT=application/json&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326` +
                        `&TIME=${timeISO}`;
            try {
                const res = await fetch(url);
                const json = await res.json();
                if (!json.features || !json.features[0]) throw new Error("No ECCC Data");
                const p = json.features[0].properties;
                return {
                    temp: p['HRDPS.CONTINENTAL_TT'] || 0,
                    snow: p['HRDPS.CONTINENTAL_SDE'] || 0,
                    vis: p['HRDPS.CONTINENTAL_VIS'] || 10,
                    wind: p['HRDPS.CONTINENTAL_UU'] || 0,
                    pop: 30
                };
            } catch (e) { 
                // FALLBACK: Return Simulated Data for UI Verification [cite: 2025-12-30]
                return { temp: -2, snow: 0.5, vis: 10, wind: 45, pop: 30, isSimulated: true };
            }
        },

        generateTableHTML(data) {
            const isCrit = this.checkException(data);
            return `
                <div style="font-family: 'Courier New', monospace; font-size: 11px; background: rgba(0,0,0,0.95); color: #fff; padding: 12px; border: 1px solid #333; border-left: 4px solid ${isCrit ? '#ff4757' : '#FFD700'};">
                    <div style="color: #FFD700; font-weight: bold; margin-bottom: 8px;">HRDPS DIAGNOSTIC ${data.isSimulated ? '[SIM]' : ''}</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                        <span>TEMP:</span><span style="text-align: right;">${data.temp.toFixed(1)}°C</span>
                        <span>WIND:</span><span style="text-align: right;">${data.wind.toFixed(0)}km/h</span>
                        <span>VIS:</span><span style="text-align: right;">${data.vis.toFixed(1)}km</span>
                        <span>SNOW:</span><span style="text-align: right;">${data.snow.toFixed(1)}cm</span>
                    </div>
                </div>`;
        }
    };

    async function updateWeatherMarkers(route) {
        if (!window.map || !route) return;
        weatherMarkers.clearLayers();

        const coords = route.geometry.coordinates;
        const totalDist = (route.distance / 1000) || 614; 
        const depTime = window.currentDepartureTime || new Date();
        const speed = (window.currentSpeedOffset || 0) + 90;

        // Sample at specific route segments
        for (let pct of [0.1, 0.4, 0.7, 0.9]) {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            
            const eta = new Date(depTime.getTime() + ((totalDist * pct) / speed) * 3600000);
            const timeISO = eta.toISOString().substring(0, 13) + ":00:00Z";

            const data = await window.BulletinLogic.fetchECCCPoint(lat, lng, timeISO);
            if (data) {
                const isCrit = window.BulletinLogic.checkException(data);
                const iconHtml = `
                    <div style="background: #000; border: 2px solid ${isCrit ? '#ff4757' : '#FFD700'}; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; color: ${isCrit ? '#ff4757' : '#FFD700'}; font-weight: bold; font-size: 14px; box-shadow: 0 0 10px #000; z-index: 9999;">
                        ${isCrit ? '!' : '●'}
                    </div>`;

                L.marker([lat, lng], {
                    icon: L.divIcon({ html: iconHtml, className: 'w-marker', iconSize: [22, 22] }),
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
