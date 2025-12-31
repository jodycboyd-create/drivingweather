/** * Project: [weong-bulletin]
 * Methodology: Variable-Agnostic HRDPS Ingestor
 * Status: HUD ACTIVE - SCANNING GLOBAL NAMESPACE [cite: 2025-12-31]
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
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

    /**
     * BRUTE FORCE DATA DISCOVERY
     * Scans window for any object with hour-based weather data.
     */
    const findHrdpsData = (targetHour) => {
        // Priority list of known variable names
        const keys = ['weongForecastData', 'hrdpsData', 'weongHRDPS', 'forecast', 'weatherData'];
        for (let k of keys) {
            if (window[k] && window[k][targetHour]) return window[k][targetHour];
        }

        // Emergency Scan: Find any object in window that has our hour and a 'temp' property
        for (let key in window) {
            try {
                if (window[key] && typeof window[key] === 'object' && window[key][targetHour]) {
                    if (window[key][targetHour].temp !== undefined) return window[key][targetHour];
                }
            } catch(e) {}
        }
        return null;
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
            const hour = eta.getHours();
            
            const anchor = state.communities.reduce((p, c) => 
                Math.hypot(lat-c.lat, lng-c.lng) < Math.hypot(lat-p.lat, lng-p.lng) ? c : p
            );

            const data = findHrdpsData(hour);

            return {
                name: anchor.name,
                lat, lng,
                eta: eta.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                t: data ? `${data.temp}°C` : "--",
                w: data ? `${data.wind} km/h` : "--",
                v: data ? `${data.vis} km` : "--",
                s: data ? (data.icon || "☁️") : "❓",
                l: data ? (data.condition || "HRDPS") : "FETCHING..."
            };
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
                    html: `<div style="background:rgba(0,0,0,0.85); border:1px solid #FFD700; border-radius:10px; width:65px; height:65px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; box-shadow:0 4px 15px #000;">
                        <div style="font-size:7px; background:#FFD700; color:#000; width:100%; text-align:center; position:absolute; top:0; border-radius:9px 9px 0 0; font-weight:bold;">${wp.name}</div>
                        <span style="font-size:22px; margin-top:5px;">${wp.s}</span>
                        <span style="font-size:13px; font-weight:bold;">${wp.t}</span>
                    </div>`,
                    iconSize: [65, 65], iconAnchor: [32, 32]
                })
            }).addTo(state.layer);
        });
    };

    const renderTable = (wps) => {
        const body = document.getElementById('weong-rows');
        if (body) {
            body.innerHTML = wps.map(wp => `
                <tr style="border-bottom:1px solid rgba(255,215,0,0.15);">
                    <td style="padding:10px 0; font-weight:bold;">${wp.name}</td>
                    <td style="padding:10px 0; opacity:0.6;">${wp.eta}</td>
                    <td style="padding:10px 0; font-weight:bold; color:#FFD700;">${wp.t}</td>
                    <td style="padding:10px 0;">${wp.w}</td>
                    <td style="padding:10px 0;">${wp.v}</td>
                    <td style="padding:10px 0;">${wp.s} ${wp.l}</td>
                </tr>`).join('');
        }
    };

    const init = () => {
        if(!document.getElementById('weong-hud')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="weong-hud" style="position:fixed; top:20px; left:20px; z-index:99999; font-family:sans-serif; background:rgba(15,15,15,0.95); border:1px solid #FFD700; width:550px; padding:20px; color:#fff; border-radius:15px; box-shadow:0 20px 40px rgba(0,0,0,0.8);">
                    <div style="color:#FFD700; font-weight:bold; font-size:14px; margin-bottom:15px; letter-spacing:1px; border-bottom:1px solid rgba(255,215,0,0.3); padding-bottom:10px;">NL WEATHER MATRIX [L3]</div>
                    <table style="width:100%; text-align:left; font-size:11px; border-collapse:collapse;">
                        <thead><tr style="color:#FFD700; opacity:0.6; text-transform:uppercase; font-size:9px;"><th>Location</th><th>ETA</th><th>TMP</th><th>WND</th><th>VIS</th><th>SKY</th></tr></thead>
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
