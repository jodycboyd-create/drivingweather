/** * Project: [weong-bulletin] | L3 HYPER-SYNC PATCH 007
 * Focus: Strict Coordinate Binding + Name Stack Exclusion
 * Date: 2025-12-31
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(10, 10, 10, 0.95); backdrop-filter: blur(10px);
            border: 1px solid #FFD700; border-radius: 4px;
            display: flex; flex-direction: column; width: 110px; color: #fff;
            box-shadow: 0 4px 25px rgba(0,0,0,0.9);
        }
        .glass-label { 
            font-size: 8px; background: #FFD700; color: #000; 
            text-align: center; font-weight: bold; padding: 4px 0;
            text-transform: uppercase; letter-spacing: 1px;
        }
        .glass-body { padding: 8px; text-align: center; }
        .glass-temp { font-size: 18px; font-weight: 900; color: #FFD700; line-height: 1; }
        .glass-meta { font-size: 10px; color: #ccc; margin-top: 4px; font-family: monospace; }
        
        #weong-loading-overlay {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.98); color: #FFD700;
            padding: 40px 80px; border: 2px solid #FFD700;
            font-family: monospace; z-index: 200000; font-weight: bold;
            display: none; font-size: 18px; letter-spacing: 5px;
            box-shadow: 0 0 150px rgba(255, 215, 0, 0.5); text-align: center;
        }
    `;
    document.head.appendChild(style);

    const WeatherEngine = (function() {
        const state = {
            layer: L.layerGroup(),
            lastHash: "",
            isSyncing: false,
            // Enhanced hub list to prevent duplicates even on short routes
            hubs: [
                { name: "P.A.B", lat: 47.57, lng: -59.13 },
                { name: "Stephenville", lat: 48.45, lng: -58.43 },
                { name: "Corner Brook", lat: 48.95, lng: -57.94 },
                { name: "Deer Lake", lat: 49.17, lng: -57.43 },
                { name: "Grand Falls", lat: 48.93, lng: -55.65 },
                { name: "Gander", lat: 48.95, lng: -54.61 },
                { name: "Clarenville", lat: 48.16, lng: -53.96 },
                { name: "Goobies", lat: 47.93, lng: -53.93 },
                { name: "Whitbourne", lat: 47.42, lng: -53.52 },
                { name: "Holyrood", lat: 47.38, lng: -53.12 },
                { name: "St. John's", lat: 47.56, lng: -52.71 }
            ]
        };

        const getVisCondition = (vis, temp, code) => {
            if (vis <= 1) return temp <= 0 ? "Freezing Fog" : "Dense Fog";
            if (vis <= 3) return "Mist/Haze";
            if (code >= 71) return "Snow";
            if (code >= 61) return "Rain";
            return "Clear";
        };

        const refresh = async () => {
            if (state.isSyncing || !window.map) return;

            // 1. LOCATE ROUTE & CAPTURE METRICS
            const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 2);
            if (!route) return;

            const coords = route.getLatLngs();
            const dist = window.currentRouteDistance || 0;
            const speed = window.currentCruisingSpeed || 100;
            
            // Generate hash to detect pin movement
            const hash = `${coords[0].lat.toFixed(4)}${coords[coords.length-1].lat.toFixed(4)}${speed}${dist}`;
            if (hash === state.lastHash) return;

            state.isSyncing = true;
            state.lastHash = hash;
            document.getElementById('weong-loading-overlay').style.display = 'block';

            // 2. FORCE VELOCITY WIDGET SYNC
            const durHours = dist / (speed || 1);
            const widgetDur = document.querySelector('.mission-dur-value');
            if (widgetDur) widgetDur.innerText = `${Math.floor(durHours)}H ${Math.round((durHours % 1) * 60)}M`;

            const usedNames = new Set();
            const segments = [0.05, 0.28, 0.52, 0.78, 0.95];

            const data = await Promise.all(segments.map(async (pct) => {
                const p = coords[Math.floor((coords.length - 1) * pct)];
                const travelTime = ((pct * dist) / speed) * 3600000;
                const arrival = new Date((window.currentDepartureTime || new Date()).getTime() + travelTime);

                // HUB SELECTION WITH EXCLUSION
                let pool = [...state.hubs].sort((a, b) => 
                    Math.hypot(p.lat - a.lat, p.lng - a.lng) - Math.hypot(p.lat - b.lat, p.lng - b.lng)
                );
                let choice = pool.find(h => !usedNames.has(h.name)) || pool[0];
                usedNames.add(choice.name);

                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=temperature_2m,weather_code,wind_speed_10m,visibility&wind_speed_unit=kmh&timezone=auto`);
                    const json = await res.json();
                    const i = Math.max(0, json.hourly.time.indexOf(arrival.toISOString().split(':')[0] + ":00"));

                    const visKm = Math.round(json.hourly.visibility[i] / 1000);
                    return {
                        name: choice.name, lat: p.lat, lng: p.lng,
                        temp: Math.round(json.hourly.temperature_2m[i]),
                        wind: Math.round(json.hourly.wind_speed_10m[i]),
                        vis: visKm,
                        cond: getVisCondition(visKm, json.hourly.temperature_2m[i], json.hourly.weather_code[i]),
                        eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    };
                } catch (e) { return null; }
            }));

            render(data.filter(d => d));
            document.getElementById('weong-loading-overlay').style.display = 'none';
            state.isSyncing = false;
        };

        const render = (points) => {
            state.layer.clearLayers();
            let rows = "";
            points.forEach(p => {
                // FIXED: Use explicit lat/lng from route array to prevent displacement
                L.marker([p.lat, p.lng], {
                    icon: L.divIcon({
                        className: '',
                        html: `<div class="glass-node">
                                <div class="glass-label">${p.name}</div>
                                <div class="glass-body">
                                    <div class="glass-temp">${p.temp}°C</div>
                                    <div class="glass-meta">${p.wind}kmh | ${p.vis}km</div>
                                </div>
                               </div>`,
                        iconSize: [110, 65]
                    })
                }).addTo(state.layer);

                rows += `<tr><td>${p.name}</td><td>${p.eta}</td><td style="color:#FFD700;">${p.temp}°C</td><td>${p.wind}k</td><td>${p.vis}km</td><td>${p.cond}</td></tr>`;
            });
            document.getElementById('bulletin-rows').innerHTML = rows;
        };

        return {
            init: () => {
                state.layer.addTo(window.map);
                document.body.insertAdjacentHTML('beforeend', `
                    <div id="weong-loading-overlay">CALCULATING L3 MISSION METRICS...</div>
                    <div id="bulletin-ui" style="position:fixed; bottom:20px; left:20px; z-index:100000; font-family:monospace;">
                        <div style="background:rgba(0,0,0,0.9); border:1px solid #FFD700; width:550px; padding:15px; box-shadow: 0 0 40px #000;">
                            <div style="color:#FFD700; border-bottom:1px solid #FFD700; margin-bottom:10px; font-weight:bold; letter-spacing:1px;">NL WEATHER MATRIX</div>
                            <table style="width:100%; color:#fff; font-size:11px; text-align:left;">
                                <thead><tr style="color:#FFD700;"><th>HUB</th><th>ETA</th><th>TEMP</th><th>WIND</th><th>VIS</th><th>SKY</th></tr></thead>
                                <tbody id="bulletin-rows"></tbody>
                            </table>
                        </div>
                    </div>
                `);
                setInterval(refresh, 2000);
            }
        };
    })();

    window.WeatherEngine = WeatherEngine;
    WeatherEngine.init();
})();
