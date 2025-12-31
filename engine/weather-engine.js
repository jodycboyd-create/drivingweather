/** * Project: [weong-bulletin]
 * Methodology: Proactive Global Data Discovery (Zero Config)
 * Status: Mechanical Data Pipe - Auto-Connect [cite: 2025-12-31]
 * Logic: Scan all window variables -> Match hour -> Display.
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

    /**
     * AUTO-DISCOVERY ENGINE
     * Scans the window object for any variable containing forecast data.
     */
    const findDataInGlobalNamespace = (hour) => {
        const potentialKeys = ['weongForecastData', 'hrdpsData', 'weongHRDPS', 'forecast', 'weatherData'];
        
        for (let key of potentialKeys) {
            if (window[key] && window[key][hour]) return window[key][hour];
        }

        // Deep Scan: Look for any object that has a numeric key matching our hour
        for (let key in window) {
            if (typeof window[key] === 'object' && window[key] !== null && window[key][hour]) {
                if (window[key][hour].temp !== undefined) return window[key][hour];
            }
        }
        return null;
    };

    const syncCycle = async (force = false) => {
        if (state.isLocked || !window.map) return;
        
        const routeLayer = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!routeLayer) return;

        const coords = routeLayer.feature.geometry.coordinates;
        const speed = window.currentCruisingSpeed || 100;
        const startTime = window.currentDepartureTime instanceof Date ? window.currentDepartureTime : new Date();

        let totalKm = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            totalKm += L.latLng(coords[i][1], coords[i][0]).distanceTo(L.latLng(coords[i+1][1], coords[i+1][0])) / 1000;
        }

        const currentKey = `${totalKm.toFixed(2)}-${speed}-${startTime.getTime()}`;
        if (currentKey === state.anchorKey && !force) return;

        state.isLocked = true;
        state.anchorKey = currentKey;

        const waypoints = state.nodes.map(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            const eta = new Date(startTime.getTime() + ((totalKm * pct) / speed * 3600000));
            
            const anchor = state.communities.reduce((prev, curr) => 
                Math.hypot(lat - curr.lat, lng - curr.lng) < Math.hypot(lat - prev.lat, lng - prev.lng) ? curr : prev
            );

            const raw = findDataInGlobalNamespace(eta.getHours());

            return {
                name: anchor.name,
                lat, lng,
                eta: eta.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                temp: raw ? `${raw.temp}°C` : "--°C",
                wind: raw ? `${raw.wind} km/h` : "-- km/h",
                vis:  raw ? `${raw.vis} km` : "-- km",
                sky:  raw ? (raw.icon || "☁️") : "❓",
                label: raw ? (raw.condition || "HRDPS") : "FETCHING..."
            };
        });

        render(waypoints);
        state.isLocked = false;
    };

    const render = (waypoints) => {
        state.layer.clearLayers();
        const rows = waypoints.map(wp => {
            L.marker([wp.lat, wp.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div style="background:rgba(0,0,0,0.85); border:1px solid #FFD700; border-radius:12px; width:65px; height:65px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff;">
                        <div style="font-size:7px; background:#FFD700; color:#000; width:100%; text-align:center; position:absolute; top:0; border-radius:11px 11px 0 0;">${wp.name}</div>
                        <span style="font-size:22px; margin-top:5px;">${wp.sky}</span>
                        <span style="font-size:14px; font-weight:bold;">${wp.temp}</span>
                    </div>`,
                    iconSize: [65, 65], iconAnchor: [32, 32]
                })
            }).addTo(state.layer);

            return `<tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                <td style="padding:10px 5px;">${wp.name}</td>
                <td style="padding:10px 5px; opacity:0.7;">${wp.eta}</td>
                <td style="padding:10px 5px; font-weight:bold; color:#FFD700;">${wp.temp}</td>
                <td style="padding:10px 5px;">${wp.wind}</td>
                <td style="padding:10px 5px;">${wp.vis}</td>
                <td style="padding:10px 5px;">${wp.sky} ${wp.label}</td>
            </tr>`;
        });

        const tableBody = document.getElementById('bulletin-rows');
        if (tableBody) tableBody.innerHTML = rows.join('');
    };

    const init = () => {
        const style = document.createElement('style');
        style.innerHTML = `.leaflet-routing-container { display: none !important; }`;
        document.head.appendChild(style);

        if(!document.getElementById('bulletin-widget')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="bulletin-widget" style="position:fixed; top:20px; left:20px; z-index:9999; font-family:monospace;">
                    <button onclick="const m=document.getElementById('bulletin-modal'); m.style.display=m.style.display==='none'?'block':'none'" style="background:#000; color:#FFD700; border:1px solid #FFD700; padding:8px 15px; cursor:pointer; border-radius:5px;">WEONG HUD</button>
                    <div id="bulletin-modal" style="display:none; margin-top:10px; background:rgba(10,10,10,0.95); border:1px solid #FFD700; width:550px; padding:15px; color:#fff; border-radius:10px; box-shadow:0 0 30px #000;">
                        <table style="width:100%; text-align:left; font-size:11px;">
                            <thead><tr style="color:#FFD700;"><th>Waypoint</th><th>ETA</th><th>TMP</th><th>WND</th><th>VIS</th><th>SKY</th></tr></thead>
                            <tbody id="bulletin-rows"></tbody>
                        </table>
                    </div>
                </div>`);
        }
        state.layer.addTo(window.map);
        setInterval(syncCycle, 1000);
    };

    return { init };
})();

WeatherEngine.init();
