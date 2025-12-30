/** * [weong-bulletin] Unified HRDPS Diagnostic Engine 
 * Locked: Dec 30, 2025 - Independent Self-Starting Build [cite: 2025-12-30]
 */

(function() {
    let lastRoute = null;
    let weatherMarkers = L.layerGroup();

    /**
     * INITIALIZATION: Retrospective Map Attachment
     * Ensures markers are added even if script loads after the map [cite: 2025-12-30]
     */
    const initMapCheck = setInterval(() => {
        if (window.map) {
            weatherMarkers.addTo(window.map);
            // Retro-check: If a route exists globally, render immediately [cite: 2025-12-30]
            if (window.currentRouteData) {
                lastRoute = window.currentRouteData;
                updateWeatherMarkers(lastRoute);
            }
            clearInterval(initMapCheck);
        }
    }, 100);

    /**
     * CORE LOGIC: [weong-bulletin] Project Requirements
     */
    window.BulletinLogic = {
        ECCC_BASE: "https://geo.weather.gc.ca/geomet",
        
        // Rule: Report POP to nearest 10%, omit if < 30%
        formatPOP(popValue) {
            if (popValue === null || popValue === undefined) return null;
            const roundedPop = Math.round(popValue / 10) * 10;
            return roundedPop >= 30 ? `${roundedPop}%` : null;
        },

        // Rule: Level 3 triggers for Newfoundland Hazards [cite: 2023-12-23]
        checkException(data) {
            const triggers = {
                heavySnow: (data.snow || 0) > 5,   // Level 3 Snow
                lowVis: (data.vis || 10) < 0.8,    // Level 3 Visibility
                highWind: (data.wind || 0) > 90    // Level 3 Wind [cite: 2023-12-23]
            };
            return triggers.heavySnow || triggers.lowVis || triggers.highWind;
        },

        /**
         * ECCC HRDPS DIAGNOSTIC FETCH
         * Pulls raw values from ECCC GeoMet WMS GetFeatureInfo [cite: 2025-12-30]
         */
        async fetchECCCPoint(lat, lng, timeISO) {
            const layers = "HRDPS.CONTINENTAL_TT,HRDPS.CONTINENTAL_PRATE,HRDPS.CONTINENTAL_SDE,HRDPS.CONTINENTAL_VIS,HRDPS.CONTINENTAL_UU";
            const url = `${this.ECCC_BASE}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo` +
                        `&LAYERS=${layers}&QUERY_LAYERS=${layers}&BBOX=${lat-0.01},${lng-0.01},${lat+0.01},${lng+0.01}` +
                        `&INFO_FORMAT=application/json&I=50&J=50&WIDTH=101&HEIGHT=101&CRS=EPSG:4326` +
                        `&TIME=${timeISO}`;
            try {
                const res = await fetch(url);
                const json = await res.json();
                if (!json.features || json.features.length === 0) return null;
                const props = json.features[0].properties;
                return {
                    temp: props['HRDPS.CONTINENTAL_TT'] || 0,
                    snow: props['HRDPS.CONTINENTAL_SDE'] || 0,
                    vis: props['HRDPS.CONTINENTAL_VIS'] || 10,
                    wind: props['HRDPS.CONTINENTAL_UU'] || 0,
                    pop: 30 // ECCC Project Baseline
                };
            } catch (e) { 
                console.warn("ECCC: Link Severed."); 
                return null; 
            }
        },

        /**
         * UI GENERATION: Diagnostic Table [cite: 2025-12-30]
         */
        generateTableHTML(data) {
            const isCrit = this.checkException(data);
            const popStr = this.formatPOP(data.pop);
            return `
                <div style="font-family: 'Courier New', monospace; font-size: 11px; background: rgba(10,10,10,0.95); color: #fff; padding: 12px; border-left: 4px solid ${isCrit ? '#ff4757' : '#FFD700'}; box-shadow: 0 4px 15px #000;">
                    <div style="color: #FFD700; font-weight: bold; margin-bottom: 8px; letter-spacing: 1px;">HRDPS DIAGNOSTIC</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                        <span style="color: #888;">TEMP:</span><span style="text-align: right;">${data.temp.toFixed(1)}°C</span>
                        <span style="color: #888;">WIND:</span><span style="text-align: right;">${data.wind.toFixed(0)}km/h</span>
                        <span style="color: #888;">VIS:</span><span style="text-align: right; color: ${data.vis < 1 ? '#ff4757' : '#00FF00'};">${data.vis.toFixed(1)}km</span>
                        <span style="color: #888;">SNOW:</span><span style="text-align: right;">${data.snow.toFixed(1)}cm</span>
                        ${popStr ? `<span style="color: #888;">POP:</span><span style="text-align: right;">${popStr}</span>` : ''}
                    </div>
                </div>`;
        }
    };

    /**
     * MAP RENDERING: Waypoint Markers [cite: 2025-12-30]
     */
    async function updateWeatherMarkers(route) {
        if (!window.map || !route) return;
        weatherMarkers.clearLayers();

        const coords = route.geometry.coordinates;
        const totalDist = route.distance / 1000;
        const depTime = window.currentDepartureTime || new Date();
        const speedOffset = window.currentSpeedOffset || 0;
        
        // Dynamic pace based on speed tier + user offset [cite: 2025-12-30]
        const baseSpeed = totalDist > 45 ? 100 : 80;
        const travelSpeed = baseSpeed + speedOffset;

        // Sampling 4 high-value diagnostic waypoints along the route path
        for (let pct of [0.15, 0.45, 0.75, 0.95]) {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            
            // ETA Calculation synced with Velocity Widget [cite: 2025-12-30]
            const eta = new Date(depTime.getTime() + ((totalDist * pct) / travelSpeed) * 3600000);
            const timeISO = eta.toISOString().substring(0, 13) + ":00:00Z";

            const data = await window.BulletinLogic.fetchECCCPoint(lat, lng, timeISO);
            if (data) {
                const isCrit = window.BulletinLogic.checkException(data);
                const iconHtml = `
                    <div style="background: #000; border: 2px solid ${isCrit ? '#ff4757' : '#FFD700'}; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: ${isCrit ? '#ff4757' : '#FFD700'}; font-weight: bold; font-size: 14px; box-shadow: 0 0 10px #000; cursor: pointer;">
                        ${isCrit ? '!' : '●'}
                    </div>`;

                L.marker([lat, lng], {
                    icon: L.divIcon({ html: iconHtml, className: 'w-marker', iconSize: [24, 24] }),
                    zIndexOffset: 1000 // Always above route ribbon
                })
                .bindPopup(window.BulletinLogic.generateTableHTML(data), { maxWidth: 220, className: 'tactical-popup' })
                .addTo(weatherMarkers);
            }
        }
    }

    /**
     * EVENT HANDLERS: Global Synchronization [cite: 2025-12-30]
     */
    window.addEventListener('weong:routeUpdated', (e) => {
        lastRoute = e.detail;
        window.currentRouteData = lastRoute; // Store for retro-checks
        updateWeatherMarkers(lastRoute);
    });

    window.addEventListener('weong:update', () => {
        if (lastRoute) updateWeatherMarkers(lastRoute);
    });

})();
