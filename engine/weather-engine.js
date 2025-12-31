/** * Project: [weong-bulletin]
 * Methodology: Direct-Map Observer / L3 Data Pipe
 * Strategy: Strip logic -> Bind to Global Anchor -> Render 1:1
 * Status: Mechanical Final [cite: 2025-12-31]
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        communities: [
            { name: "Corner Brook", lat: 48.9515, lng: -57.9482 },
            { name: "Grand Falls", lat: 48.93, lng: -55.65 },
            { name: "Gander", lat: 48.9578, lng: -54.6122 },
            { name: "Clarenville", lat: 48.16, lng: -53.96 },
            { name: "St. John's", lat: 47.5615, lng: -52.7126 }
        ],
        nodes: [0.15, 0.35, 0.55, 0.75, 0.95]
    };

    /**
     * PURE MECHANICAL EXTRACTION
     * 1:1 Mapping of HRDPS Grid lead-times to arrival hours.
     */
    const getPointData = (arrivalTime) => {
        const hour = arrivalTime.getHours();
        const dataset = window.weongForecastData; // The core L3 anchor point [cite: 2025-12-27]

        if (dataset && dataset[hour]) {
            return {
                temp: dataset[hour].temp ?? "--",
                wind: dataset[hour].wind ?? "--",
                vis:  dataset[hour].vis ?? "--",
                sky:  dataset[hour].icon || "❓",
                label: dataset[hour].condition || "HRDPS"
            };
        }
        return { temp: "--", wind: "--", vis: "--", sky: "❓", label: "NO_DATA" };
    };

    const sync = () => {
        if (!window.map) return;
        
        // Find the active Route Line
        const route = Object.values(window.map._layers).find(l => 
            l.feature?.geometry?.type === "LineString" || l._latlngs
        );
        if (!route) return;

        const coords = route.feature ? route.feature.geometry.coordinates.map(c => [c[1], c[0]]) : route._latlngs;
        const speed = window.currentCruisingSpeed || 100;
        const depTime = window.currentDepartureTime || new Date();

        // Calculate total distance for waypoint distribution
        let totalMeters = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            totalMeters += L.latLng(coords[i]).distanceTo(L.latLng(coords[i+1]));
        }
        const totalKm = totalMeters / 1000;

        const waypoints = state.nodes.map(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const pos = coords[idx];
            const travelTimeHrs = (totalKm * pct) / speed;
            const eta = new Date(depTime.getTime() + (travelTimeHrs * 3600000));
            
            // Spatial labeling (closest community)
            const city = state.communities.reduce((prev, curr) => 
                L.latLng(pos).distanceTo(L.latLng(curr.lat, curr.lng)) < L.latLng(pos).distanceTo(L.latLng(prev.lat, prev.lng)) ? curr : prev
            );

            return {
                name: city.name,
                latlng: pos,
                eta: eta.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                data: getPointData(eta)
            };
        });

        render(waypoints);
    };

    const render = (wps) => {
        state.layer.clearLayers();
        let rowsHtml = "";

        wps.forEach(wp => {
            // Render Map Icon
            L.marker(wp.latlng, {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `
                    <div style="background:rgba(20,20,20,0.9); border:1px solid #FFD700; border-radius:12px; width:65px; height:65px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; box-shadow:0 10px 20px rgba(0,0,0,0.5);">
                        <div style="font-size:7px; font-weight:bold; background:#FFD700; color:#000; width:100%; text-align:center; position:absolute; top:0; border-radius:11px 11px 0 0; padding:1px 0;">${wp.name.toUpperCase()}</div>
                        <span style="font-size:24px; margin-top:5px;">${wp.data.sky}</span>
                        <span style="font-size:13px; font-weight:bold;">${wp.data.temp}${wp.data.temp !== "--" ? '°' : ''}</span>
                    </div>`,
                    iconSize: [65, 65], iconAnchor: [32, 32]
                })
            }).addTo(state.layer);

            // Build Table Row
            rowsHtml += `
                <tr style="border-bottom:1px solid rgba(255,215,0,0.1); height:45px;">
                    <td style="padding:5px 0; font-weight:bold;">${wp.name}</td>
                    <td style="padding:5px 0; opacity:0.6;">${wp.eta}</td>
                    <td style="padding:5px 0; font-weight:bold; color:#5bc0de;">${wp.data.temp}°C</td>
                    <td style="padding:5px 0;">${wp.data.wind} km/h</td>
                    <td style="padding:5px 0;">${wp.data.vis} km</td>
                    <td style="padding:5px 0;">${wp.data.label} ${wp.data.sky}</td>
                </tr>`;
        });

        const container = document.getElementById('weong-table-body');
        if (container) container.innerHTML = rowsHtml;
    };

    const init = () => {
        if (!document.getElementById('weong-hud')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="weong-hud" style="position:fixed; top:25px; left:25px; z-index:99999; font-family:monospace; background:rgba(18,18,18,0.98); border:1px solid #FFD700; width:560px; padding:20px; color:#fff; border-radius:15px; box-shadow:0 0 40px rgba(0,0,0,0.9);">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #FFD700; padding-bottom:10px; margin-bottom:15px;">
                        <span style="color:#FFD700; font-weight:bold; font-size:15px;">NL WEATHER MATRIX [L3]</span>
                        <button style="background:#FFD700; color:#000; border:none; padding:4px 10px; font-size:10px; font-weight:bold; border-radius:4px; cursor:pointer;">COPY DATA</button>
                    </div>
                    <table style="width:100%; text-align:left; font-size:12px; border-collapse:collapse;">
                        <thead><tr style="color:#FFD700; opacity:0.6; font-size:10px;"><th>COMMUNITY</th><th>ETA</th><th>TEMP</th><th>WIND</th><th>VIS</th><th>SKY</th></tr></thead>
                        <tbody id="weong-table-body"></tbody>
                    </table>
                </div>`);
        }
        state.layer.addTo(window.map);
        setInterval(sync, 1000); // 1Hz Sync Cycle
    };

    return { init };
})();

// Execution [cite: 2025-12-25]
WeatherEngine.init();
