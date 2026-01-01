/** * Project: [weong-bulletin] | L3 FINAL INTEGRATED BUILD
 * Status: Self-Contained CSS + Glassmorph + Hub Sync
 * Date: 2025-12-31 | NL Mission Baseline
 */

(function() {
    // 1. INJECT STYLESHEET
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(20, 20, 20, 0.7);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 215, 0, 0.3);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
            display: flex; flex-direction: column; align-items: center;
            width: 65px; height: 65px; color: #fff; overflow: hidden;
        }
        .glass-label { 
            font-size: 7px; background: #FFD700; color: #000; 
            width: 100%; text-align: center; font-weight: bold; 
            padding: 2px 0; text-transform: uppercase;
        }
        .glass-sky { font-size: 22px; margin: 2px 0; }
        .glass-temp { font-size: 12px; font-weight: 800; color: #FFD700; }
        
        #weong-status-bar {
            position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
            background: rgba(0,0,0,0.9); color: #FFD700; padding: 10px 20px;
            border: 1px solid #FFD700; border-radius: 30px; font-family: monospace;
            z-index: 100000; display: none; font-size: 11px; letter-spacing: 1px;
        }
        .loader-dot {
            display: inline-block; width: 6px; height: 6px;
            background: #FFD700; border-radius: 50%;
            margin-left: 8px; animation: blink 1s infinite;
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
    `;
    document.head.appendChild(style);

    // 2. WEATHER ENGINE LOGIC
    const WeatherEngine = (function() {
        const state = {
            layer: L.layerGroup(),
            anchorKey: null,
            isLocked: false,
            isOpen: false,
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
            
            const currentKey = `${coords[0][0].toFixed(3)}-${coords.length}-${speed}-${depTime.getTime()}`;
            if (currentKey === state.anchorKey) return;

            state.isLocked = true;
            state.anchorKey = currentKey;

            // Trigger "Loading..." Status Bar
            const status = document.getElementById('weong-status-bar');
            if (status) status.style.display = 'block';

            const waypoints = await Promise.all(state.partitions.map(async (pct) => {
                const coordIdx = Math.floor((coords.length - 1) * pct);
                const [lng, lat] = coords[coordIdx];
                
                const dist = window.currentRouteDistance || 500;
                const travelHours = (pct * dist) / speed; 
                const arrival = new Date(depTime.getTime() + (travelHours * 3600000));
                
                const hub = state.hubs.reduce((prev, curr) => 
                    Math.hypot(lat - curr.lat, lng - curr.lng) < Math.hypot(lat - prev.lat, lng - prev.lng) ? curr : prev
                );

                try {
                    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,weather_code&wind_speed_unit=kmh&timezone=auto`;
                    const res = await fetch(url);
                    const json = await res.json();
                    const target = arrival.toISOString().split(':')[0] + ":00";
                    const i = Math.max(0, json.hourly.time.indexOf(target));

                    return {
                        name: hub.name, lat, lng,
                        temp: Math.round(json.hourly.temperature_2m[i]),
                        sky: getSkyIcon(json.hourly.weather_code[i], arrival.getHours()),
                        eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    };
                } catch (e) { return null; }
            }));

            render(waypoints.filter(w => w !== null));
            if (status) status.style.display = 'none';
            state.isLocked = false;
        };

        const render = (data) => {
            state.layer.clearLayers();
            let html = "";
            data.forEach(wp => {
                L.marker([wp.lat, wp.lng], {
                    icon: L.divIcon({
                        className: 'glass-container',
                        html: `<div class="glass-node">
                                <div class="glass-label">${wp.name}</div>
                                <div class="glass-sky">${wp.sky}</div>
                                <div class="glass-temp">${wp.temp}°</div>
                               </div>`,
                        iconSize: [65, 65]
                    })
                }).addTo(state.layer);

                html += `<tr style="border-bottom: 1px solid rgba(255,215,0,0.1);">
                    <td style="padding:10px;">${wp.name}</td>
                    <td style="padding:10px;">${wp.eta}</td>
                    <td style="padding:10px; color:#FFD700;">${wp.temp}°C</td>
                    <td style="padding:10px; font-size:18px;">${wp.sky}</td>
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
                syncCycle();
            },
            toggleModal: () => {
                state.isOpen = !state.isOpen;
                document.getElementById('bulletin-modal').style.display = state.isOpen ? 'block' : 'none';
            }
        };

        function initUI() {
            const ui = `
                <div id="weong-status-bar">UPDATING MISSION METEO<span class="loader-dot"></span></div>
                <div id="bulletin-ui" style="position:fixed; bottom:20px; left:20px; z-index:90000; font-family:monospace;">
                    <button onclick="WeatherEngine.toggleModal()" style="background:#000; color:#FFD700; border:1px solid #FFD700; padding:10px 20px; cursor:pointer; font-weight:bold; border-radius:4px;">OPEN MISSION BULLETIN</button>
                    <div id="bulletin-modal" style="display:none; margin-top:10px; background:rgba(10,10,10,0.95); border:1px solid #FFD700; width:450px; padding:15px; border-radius:8px; backdrop-filter:blur(10px);">
                        <div style="font-size:12px; font-weight:bold; color:#FFD700; border-bottom:1px solid #FFD700; padding-bottom:5px; margin-bottom:10px;">DETAILED TABULAR FORECAST</div>
                        <table style="width:100%; color:#fff; font-size:11px; text-align:left; border-collapse:collapse;">
                            <thead><tr style="color:#FFD700;"><th>HUB</th><th>ETA</th><th>TEMP</th><th>SKY</th></tr></thead>
                            <tbody id="bulletin-rows"></tbody>
                        </table>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', ui);
        }
    })();

    window.WeatherEngine = WeatherEngine;
    WeatherEngine.init();
})();
