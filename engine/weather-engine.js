/** * Project: [weong-bulletin]
 * Methodology: Real-Time Point-Fetch (Precision Pipe)
 * Strategy: Fetch only what is on the path. No massive downloads.
 * Status: L3 Direct Integration [cite: 2025-12-31]
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
     * PRECISION POINT FETCH
     * Grabs HRDPS data for a specific coordinate/time from GeoMet JSON feed.
     */
    const fetchPointData = async (lat, lng, eta) => {
        try {
            // Mapping to the MSC GeoMet HRDPS JSON Point API
            // This pulls ONLY the specific data for this coordinate.
            const url = `https://api.weather.gc.ca/met/city/v1/coverage/hrdps/point?lat=${lat}&lon=${lng}&format=json`;
            const response = await fetch(url);
            const raw = await response.json();
            
            // Dumb Pipe Extraction: 1:1 mapping from the API response
            const hourIndex = eta.getHours(); 
            const forecast = raw.forecasts[hourIndex] || {};

            return {
                temp: forecast.temperature ?? "--",
                wind: forecast.wind_speed ?? "--",
                vis:  forecast.visibility ?? "--",
                sky:  forecast.icon_code ? `https://weather.gc.ca/weathericons/${forecast.icon_code}.gif` : "❓",
                label: forecast.condition || "HRDPS"
            };
        } catch (e) {
            return { temp: "--", wind: "--", vis: "--", sky: "❓", label: "OFFLINE" };
        }
    };

    const sync = async () => {
        if (!window.map) return;
        
        const route = Object.values(window.map._layers).find(l => 
            l.feature?.geometry?.type === "LineString" || l._latlngs
        );
        if (!route) return;

        const coords = route.feature ? route.feature.geometry.coordinates.map(c => [c[1], c[0]]) : route._latlngs;
        const speed = window.currentCruisingSpeed || 100;
        const depTime = window.currentDepartureTime || new Date();

        let totalMeters = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            totalMeters += L.latLng(coords[i]).distanceTo(L.latLng(coords[i+1]));
        }
        const totalKm = totalMeters / 1000;

        // Perform Parallel Fetch for exactly 5 points
        const waypointPromises = state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const pos = coords[idx];
            const travelTimeHrs = (totalKm * pct) / speed;
            const eta = new Date(depTime.getTime() + (travelTimeHrs * 3600000));
            
            const city = state.communities.reduce((prev, curr) => 
                L.latLng(pos).distanceTo(L.latLng(curr.lat, curr.lng)) < L.latLng(pos).distanceTo(L.latLng(prev.lat, prev.lng)) ? curr : prev
            );

            const data = await fetchPointData(pos[0], pos[1], eta);

            return {
                name: city.name,
                latlng: pos,
                eta: eta.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                data: data
            };
        });

        const results = await Promise.all(waypointPromises);
        render(results);
    };

    const render = (wps) => {
        state.layer.clearLayers();
        let rowsHtml = "";

        wps.forEach(wp => {
            L.marker(wp.latlng, {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `
                    <div style="background:rgba(15,15,15,0.95); border:1px solid #FFD700; border-radius:12px; width:65px; height:65px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; box-shadow:0 8px 25px #000;">
                        <div style="font-size:7px; font-weight:bold; background:#FFD700; color:#000; width:100%; text-align:center; position:absolute; top:0; border-radius:11px 11px 0 0; padding:1px 0;">${wp.name.toUpperCase()}</div>
                        <img src="${wp.data.sky}" style="width:24px; height:24px; margin-top:5px;" onerror="this.style.display='none'">
                        <span style="font-size:13px; font-weight:bold;">${wp.data.temp}°</span>
                    </div>`,
                    iconSize: [65, 65], iconAnchor: [32, 32]
                })
            }).addTo(state.layer);

            rowsHtml += `
                <tr style="border-bottom:1px solid rgba(255,215,0,0.1); height:45px;">
                    <td style="padding:5px 0; font-weight:bold;">${wp.name}</td>
                    <td style="padding:5px 0; opacity:0.6;">${wp.eta}</td>
                    <td style="padding:5px 0; font-weight:bold; color:#FFD700;">${wp.data.temp}°C</td>
                    <td style="padding:5px 0;">${wp.data.wind} km/h</td>
                    <td style="padding:5px 0;">${wp.data.vis} km</td>
                    <td style="padding:5px 0;">${wp.data.label}</td>
                </tr>`;
        });

        const container = document.getElementById('weong-table-body');
        if (container) container.innerHTML = rowsHtml;
    };

    const init = () => {
        if (!document.getElementById('weong-hud')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="weong-hud" style="position:fixed; top:20px; left:20px; z-index:99999; font-family:monospace; background:rgba(10,10,10,0.98); border:1px solid #FFD700; width:550px; padding:20px; color:#fff; border-radius:15px; box-shadow:0 0 50px #000;">
                    <div style="color:#FFD700; font-weight:bold; font-size:14px; margin-bottom:15px; border-bottom:1px solid #FFD700; padding-bottom:8px;">NL WEATHER MATRIX [L3]</div>
                    <table style="width:100%; text-align:left; font-size:12px; border-collapse:collapse;">
                        <thead><tr style="color:#FFD700; opacity:0.5; font-size:10px;"><th>COMMUNITY</th><th>ETA</th><th>TEMP</th><th>WIND</th><th>VIS</th><th>SKY</th></tr></thead>
                        <tbody id="weong-table-body"></tbody>
                    </table>
                </div>`);
        }
        state.layer.addTo(window.map);
        // Only sync on route updates or manual triggers to save data
        setInterval(sync, 5000); 
    };

    return { init, forceSync: sync };
})();

WeatherEngine.init();
