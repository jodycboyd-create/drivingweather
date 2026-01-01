/** * Project: [weong-bulletin] | L3 Final Mission Engine
 * Status: Glassmorph + Hub Sync + Loading Status
 * Date: 2025-12-31 | Newfoundland Baseline Build
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        isOpen: false,
        // Strategic TCH & Branch Hubs [cite: 2025-12-26]
        hubs: [
            { name: "Port aux Basques", lat: 47.57, lng: -59.13 },
            { name: "Stephenville Jct", lat: 48.45, lng: -58.43 },
            { name: "Corner Brook", lat: 48.95, lng: -57.94 },
            { name: "Deer Lake Jct", lat: 49.17, lng: -57.43 },
            { name: "Grand Falls-Windsor", lat: 48.93, lng: -55.65 },
            { name: "Gander Hub", lat: 48.95, lng: -54.61 },
            { name: "Clarenville", lat: 48.16, lng: -53.96 },
            { name: "Whitbourne Jct", lat: 47.42, lng: -53.52 },
            { name: "St. John's Metro", lat: 47.56, lng: -52.71 }
        ],
        partitions: [0.10, 0.32, 0.55, 0.78, 0.95]
    };

    const getSkyIcon = (code, hour) => {
        const isNight = hour >= 18 || hour <= 7; 
        if (code <= 1) return isNight ? "🌙" : "☀️";
        if (code <= 3) return isNight ? "☁️" : "🌤️";
        if (code <= 65) return "🌧️";
        if (code <= 75) return "❄️";
        return "☁️";
    };

    const syncCycle = async () => {
        if (state.isLocked || !window.map) return;
        
        const route = Object.values(window.map._layers).find(l => 
            l.feature?.geometry?.type === "LineString" || (l._latlngs && l._latlngs.length > 0)
        );
        if (!route) return;

        const coords = route.feature ? route.feature.geometry.coordinates : route.getLatLngs().map(p => [p.lng, p.lat]);
        const speed = window.currentCruisingSpeed || 100;
        const depTime = window.currentDepartureTime || new Date();
        
        // UNIQUE KEY: Anchors to route shape, speed, and time adjustments
        const currentKey = `${coords[0][0].toFixed(3)}-${coords.length}-${speed}-${depTime.getTime()}`;
        if (currentKey === state.anchorKey) return;

        state.isLocked = true;
        state.anchorKey = currentKey;

        // UI: Show Loading Status
        const statusBar = document.getElementById('weong-status-bar');
        if (statusBar) statusBar.style.display = 'block';

        const waypoints = await Promise.all(state.partitions.map(async (pct) => {
            const coordIdx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[coordIdx];
            
            // ETA Calculation via Velocity linkage
            const travelHours = (pct * (window.currentRouteDistance || 500)) / speed; 
            const arrival = new Date(depTime.getTime() + (travelHours * 3600000));
            
            // Hub Region Snapping
            const hub = state.hubs.reduce((prev, curr) => 
                Math.hypot(lat - curr.lat, lng - curr.lng) < Math.hypot(lat - prev.lat, lng - prev.lng) ? curr : prev
            );

            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,weather_code&wind_speed_unit=kmh&timezone=auto`;
                const res = await fetch(url);
                const json = await res.json();
                const target = arrival.toISOString().split(':')[0] + ":00";
                const hIdx = Math.max(0, json.hourly.time.indexOf(target));

                return {
                    name: hub.name,
                    lat, lng,
                    temp: Math.round(json.hourly.temperature_2m[hIdx]),
                    sky: getSkyIcon(json.hourly.weather_code[hIdx], arrival.getHours()),
                    eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                };
            } catch (e) { return null; }
        }));

        render(waypoints.filter(w => w !== null));
        if (statusBar) statusBar.style.display = 'none';
        state.isLocked = false;
    };

    const render = (data) => {
        state.layer.clearLayers();
        let html = "";

        data.forEach(wp => {
            // GLASSMORPH MARKER
            L.marker([wp.lat, wp.lng], {
                icon: L.divIcon({
                    className: 'glass-node-container',
                    html: `<div class="glass-node">
                            <div class="glass-label">${wp.name}</div>
                            <div class="glass-sky">${wp.sky}</div>
                            <div class="glass-temp">${wp.temp}°</div>
                           </div>`,
                    iconSize: [65, 65]
                })
            }).addTo(state.layer);

            html += `<tr>
                <td>${wp.name}</td><td>${wp.eta}</td>
                <td style="color:${wp.temp <= 0 ? '#00d4ff' : '#ff4500'}">${wp.temp}°C</td>
                <td>${wp.sky}</td>
            </tr>`;
        });

        const rows = document.getElementById('bulletin-rows');
        if (rows) rows.innerHTML = html;
    };

    return { 
        init: () => { 
            state.layer.addTo(window.map);
            initUI(); 
            setInterval(syncCycle, 2000); 
        },
        toggleModal: () => {
            state.isOpen = !state.isOpen;
            document.getElementById('bulletin-modal').style.display = state.isOpen ? 'block' : 'none';
        }
    };

    function initUI() {
        const uiHTML = `
            <div id="weong-status-bar" style="display:none; position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:#FFD700; padding:8px 15px; border-radius:20px; font-size:10px; z-index:99999; border:1px solid #FFD700; font-family:monospace;">
                SYNCING MISSION METEO... <span class="loader-dot"></span>
            </div>
            <div id="bulletin-widget" style="position:fixed; bottom:20px; left:20px; z-index:70000; font-family:monospace;">
                <button onclick="WeatherEngine.toggleModal()" style="background:#000; color:#FFD700; border:2px solid #FFD700; padding:12px; cursor:pointer; font-weight:bold; box-shadow:0 0 20px rgba(0,0,0,0.8);">MISSION WEATHER BULLETIN</button>
                <div id="bulletin-modal" style="display:none; margin-top:10px; background:rgba(15,15,15,0.95); border:1px solid rgba(255,215,0,0.5); width:500px; padding:20px; color:#FFD700; backdrop-filter:blur(10px); border-radius:12px;">
                    <div style="border-bottom:1px solid #FFD700; padding-bottom:10px; margin-bottom:10px; font-weight:bold;">TABULAR ROUTE FORECAST</div>
                    <table style="width:100%; border-collapse:collapse; font-size:11px; color:#fff;">
                        <thead><tr style="text-align:left; color:#FFD700;"><th>HUB</th><th>ETA</th><th>TEMP</th><th>SKY</th></tr></thead>
                        <tbody id="bulletin-rows"></tbody>
                    </table>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', uiHTML);
    }
})();

// Initialize
WeatherEngine.init();
