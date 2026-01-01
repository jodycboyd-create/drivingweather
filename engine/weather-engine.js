/** * Project: [weong-bulletin] | L3 HYPER-SYNC PATCH 010
 * Focus: Glassmorph UI Reinstatement + Detailed Tabular Forecast
 * Features: Sky Text, Wind Direction, Temporal Sync
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(15, 15, 15, 0.8); backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 215, 0, 0.5); border-radius: 12px;
            display: flex; align-items: center; justify-content: space-around;
            width: 80px; height: 45px; color: #fff;
            box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        }
        .glass-sky-icon { font-size: 20px; }
        .glass-temp-val { font-size: 16px; font-weight: 900; color: #FFD700; }
        
        #weong-loading-overlay {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95); color: #FFD700;
            padding: 30px 60px; border: 2px solid #FFD700;
            font-family: monospace; z-index: 200000; font-weight: bold;
            display: none; font-size: 16px; letter-spacing: 4px;
            box-shadow: 0 0 100px rgba(255, 215, 0, 0.4); text-align: center;
        }
    `;
    document.head.appendChild(style);

    const WeatherEngine = (function() {
        const state = {
            layer: L.layerGroup(),
            lastSignature: "",
            isSyncing: false,
            hubs: [
                { name: "P.A.B", lat: 47.57, lng: -59.13 },
                { name: "Corner Brook", lat: 48.95, lng: -57.94 },
                { name: "Grand Falls", lat: 48.93, lng: -55.65 },
                { name: "Gander", lat: 48.95, lng: -54.61 },
                { name: "Clarenville", lat: 48.16, lng: -53.96 },
                { name: "St. John's", lat: 47.56, lng: -52.71 }
            ]
        };

        const getSkyData = (code) => {
            const map = {
                0: { icon: "☀️", txt: "Clear" },
                1: { icon: "🌤️", txt: "Mainly Clear" },
                2: { icon: "⛅", txt: "Partly Cloudy" },
                3: { icon: "☁️", txt: "Overcast" },
                45: { icon: "🌫️", txt: "Fog" },
                61: { icon: "🌧️", txt: "Light Rain" },
                71: { icon: "❄️", txt: "Light Snow" },
                95: { icon: "⛈️", txt: "Storm" }
            };
            return map[code] || { icon: "☁️", txt: "Cloudy" };
        };

        const getWindDir = (deg) => {
            const sectors = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
            return sectors[Math.round(deg / 45) % 8];
        };

        const refresh = async () => {
            if (state.isSyncing || !window.map) return;

            const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
            if (!route) return;

            const coords = route.getLatLngs();
            const speed = window.currentCruisingSpeed || 100;
            const dist = window.currentRouteDistance || 0;
            const depTime = window.currentDepartureTime || new Date();

            const signature = `${coords[0].lat.toFixed(3)}-${speed}-${dist}-${depTime.getTime()}`;
            if (signature === state.lastSignature) return;

            state.isSyncing = true;
            state.lastSignature = signature;
            document.getElementById('weong-loading-overlay').style.display = 'block';

            const usedNames = new Set();
            const partitions = [0.05, 0.25, 0.50, 0.75, 0.95];

            const waypoints = await Promise.all(partitions.map(async (pct) => {
                const p = coords[Math.floor((coords.length - 1) * pct)];
                const arrival = new Date(depTime.getTime() + ((pct * dist) / speed) * 3600000);

                let pool = [...state.hubs].sort((a, b) => Math.hypot(p.lat - a.lat, p.lng - a.lng) - Math.hypot(p.lat - b.lat, p.lng - b.lng));
                let choice = pool.find(h => !usedNames.has(h.name)) || pool[0];
                usedNames.add(choice.name);

                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,visibility&wind_speed_unit=kmh&timezone=auto`);
                    const data = await res.json();
                    const i = Math.max(0, data.hourly.time.indexOf(arrival.toISOString().split(':')[0] + ":00"));

                    const sky = getSkyData(data.hourly.weather_code[i]);

                    return {
                        name: choice.name, lat: p.lat, lng: p.lng,
                        temp: Math.round(data.hourly.temperature_2m[i]),
                        windSpd: Math.round(data.hourly.wind_speed_10m[i]),
                        windDir: getWindDir(data.hourly.wind_direction_10m[i]),
                        vis: Math.round(data.hourly.visibility[i] / 1000),
                        skyIcon: sky.icon,
                        skyTxt: sky.txt,
                        eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    };
                } catch (e) { return null; }
            }));

            render(waypoints.filter(w => w));
            document.getElementById('weong-loading-overlay').style.display = 'none';
            state.isSyncing = false;
        };

        const render = (data) => {
            state.layer.clearLayers();
            let html = "";
            data.forEach(d => {
                L.marker([d.lat, d.lng], {
                    icon: L.divIcon({
                        className: '',
                        html: `<div class="glass-node">
                                <span class="glass-sky-icon">${d.skyIcon}</span>
                                <span class="glass-temp-val">${d.temp}°</span>
                               </div>`,
                        iconSize: [80, 45], iconAnchor: [40, 22]
                    })
                }).addTo(state.layer);

                html += `<tr>
                    <td>${d.name}</td><td>${d.eta}</td>
                    <td style="color:#FFD700; font-weight:900;">${d.temp}°C</td>
                    <td>${d.windDir} ${d.windSpd} km/h</td><td>${d.vis} km</td>
                    <td>${d.skyIcon} ${d.skyTxt}</td>
                </tr>`;
            });
            document.getElementById('bulletin-rows').innerHTML = html;
        };

        return {
            init: () => {
                state.layer.addTo(window.map);
                document.body.insertAdjacentHTML('beforeend', `
                    <div id="weong-loading-overlay">SYNCING TEMPORAL DATA...</div>
                    <div id="bulletin-ui" style="position:fixed; bottom:20px; left:20px; z-index:100000; font-family:monospace;">
                        <div style="background:rgba(10,10,10,0.95); border:1px solid #FFD700; width:650px; padding:15px; border-radius:4px; box-shadow: 0 10px 40px #000;">
                            <div style="color:#FFD700; border-bottom:1px solid #FFD700; padding-bottom:5px; margin-bottom:10px; font-weight:bold; letter-spacing:1px; font-size:12px;">MISSION WEATHER MATRIX</div>
                            <table style="width:100%; color:#fff; font-size:11px; text-align:left; border-collapse:collapse;">
                                <thead><tr style="color:#FFD700; text-transform:uppercase; font-size:9px;">
                                    <th style="padding:5px;">Hub</th><th>ETA</th><th>Temp</th><th>Wind</th><th>Vis</th><th>Condition</th>
                                </tr></thead>
                                <tbody id="bulletin-rows"></tbody>
                            </table>
                        </div>
                    </div>
                `);
                setInterval(refresh, 2500);
            }
        };
    })();

    window.WeatherEngine = WeatherEngine;
    WeatherEngine.init();
})();
