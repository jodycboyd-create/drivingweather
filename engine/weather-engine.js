/** * Project: [weong-bulletin]
 * Methodology: Unified HUD & Mechanical Data Pipe
 * Status: HUD RESTORED - DATA LINK FIXED [cite: 2025-12-31]
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        communities: [
            { name: "Corner Brook", lat: 48.9515, lng: -57.9482 },
            { name: "Grand Falls", lat: 48.93, lng: -55.65 },
            { name: "Gander", lat: 48.9578, lng: -54.6122 },
            { name: "Clarenville", lat: 48.16, lng: -53.96 },
            { name: "St. John's", lat: 47.5615, lng: -52.7126 }
        ],
        nodes: [0.15, 0.35, 0.55, 0.75, 0.95]
    };

    const getHrdpsValue = (arrivalTime) => {
        const hr = arrivalTime.getHours();
        // Check every possible global handle for the locked data
        const d = window.weongForecastData || window.hrdpsData || window.weongHRDPS || window.forecast;
        
        if (d && d[hr]) {
            return {
                t: d[hr].temp ?? "--",
                w: d[hr].wind ?? "--",
                v: d[hr].vis ?? "--",
                s: d[hr].icon || d[hr].sky || "☁️",
                l: d[hr].condition || "HRDPS"
            };
        }
        return { t: "--", w: "--", v: "--", s: "❓", l: "FETCHING..." };
    };

    const sync = async () => {
        if (state.isLocked || !window.map) return;
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!route) return;

        const coords = route.feature.geometry.coordinates;
        const speed = window.currentCruisingSpeed || 100;
        const start = window.currentDepartureTime || new Date();

        let dist = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            dist += L.latLng(coords[i][1], coords[i][0]).distanceTo(L.latLng(coords[i+1][1], coords[i+1][0])) / 1000;
        }

        state.isLocked = true;
        const waypoints = state.nodes.map(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            const eta = new Date(start.getTime() + ((dist * pct) / speed * 3600000));
            const anchor = state.communities.reduce((p, c) => Math.hypot(lat-c.lat, lng-c.lng) < Math.hypot(lat-p.lat, lng-p.lng) ? c : p);
            const data = getHrdpsValue(eta);

            return { name: anchor.name, lat, lng, eta: eta.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), ...data };
        });

        renderMap(waypoints);
        renderTable(waypoints);
        state.isLocked = false;
    };

    const renderMap = (wps) => {
        state.layer.clearLayers();
        wps.forEach(wp => {
            L.marker([wp.lat, wp.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div style="background:rgba(0,0,0,0.8); border:1px solid #FFD700; border-radius:10px; width:60px; height:60px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff;">
                        <div style="font-size:7px; background:#FFD700; color:#000; width:100%; text-align:center; position:absolute; top:0; border-radius:9px 9px 0 0;">${wp.name}</div>
                        <span style="font-size:20px; margin-top:5px;">${wp.s}</span>
                        <span style="font-size:12px; font-weight:bold;">${wp.t}${wp.t !== "--" ? '°' : ''}</span>
                    </div>`,
                    iconSize: [60, 60], iconAnchor: [30, 30]
                })
            }).addTo(state.layer);
        });
    };

    const renderTable = (wps) => {
        const rows = wps.map(wp => `
            <tr style="border-bottom:1px solid rgba(255,215,0,0.1);">
                <td style="padding:8px 0;">${wp.name}</td>
                <td style="padding:8px 0; opacity:0.6;">${wp.eta}</td>
                <td style="padding:8px 0; font-weight:bold; color:#FFD700;">${wp.t}°C</td>
                <td style="padding:8px 0;">${wp.w} km/h</td>
                <td style="padding:8px 0;">${wp.v} km</td>
                <td style="padding:8px 0;">${wp.s} ${wp.l}</td>
            </tr>`).join('');
        
        const body = document.getElementById('weong-rows');
        if (body) body.innerHTML = rows;
    };

    const init = () => {
        if(!document.getElementById('weong-hud')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="weong-hud" style="position:fixed; top:20px; left:20px; z-index:9999; font-family:monospace; background:rgba(0,0,0,0.9); border:1px solid #FFD700; width:500px; padding:15px; color:#fff; border-radius:10px; box-shadow:0 0 20px #000;">
                    <div style="color:#FFD700; font-weight:bold; margin-bottom:10px; border-bottom:1px solid #FFD700; padding-bottom:5px;">NL WEATHER MATRIX [L3]</div>
                    <table style="width:100%; text-align:left; font-size:11px;">
                        <thead><tr style="color:#FFD700; opacity:0.7;"><th>Location</th><th>ETA</th><th>TMP</th><th>WND</th><th>VIS</th><th>SKY</th></tr></thead>
                        <tbody id="weong-rows"></tbody>
                    </table>
                </div>`);
        }
        state.layer.addTo(window.map);
        setInterval(sync, 1000);
    };

    return { init };
})();

WeatherEngine.init();
