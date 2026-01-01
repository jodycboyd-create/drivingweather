/** * Project: [weong-bulletin] | L3 STABILITY PATCH 025
 * Status: Full Restoration + Route-Centric Logic
 * Logic: Weather coordinates = Exact Route Coordinates. 2km Name Snap.
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(10, 10, 10, 0.8); backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 215, 0, 0.4); border-radius: 8px;
            display: flex; flex-direction: column; width: 110px; color: #fff;
            box-shadow: 0 8px 32px rgba(0,0,0,0.6); overflow: hidden;
        }
        .glass-header {
            background: #FFD700; color: #000; font-size: 9px; font-weight: 900;
            text-align: center; padding: 4px; text-transform: uppercase;
        }
        .glass-body { display: flex; align-items: center; justify-content: space-evenly; padding: 6px 2px; }
        .glass-temp-val { font-size: 18px; font-weight: 900; color: #FFD700; }
        .glass-sub { font-size: 8px; color: #aaa; text-align: center; padding-bottom: 5px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 3px; }
        
        #matrix-ui-container {
            position: fixed; bottom: 25px; left: 25px; z-index: 10000;
            background: rgba(10, 10, 10, 0.95); backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 215, 0, 0.5); border-radius: 12px;
            width: 620px; padding: 20px; pointer-events: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.9);
        }
        .matrix-table { width: 100%; color: #fff; font-size: 11px; text-align: left; border-collapse: collapse; }
        .matrix-table tr:nth-child(even) { background: rgba(255,255,255,0.05); }
        .copy-btn {
            background: #FFD700; color: #000; border: none; padding: 5px 12px;
            border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer; float: right;
        }
    `;
    document.head.appendChild(style);

    const WeatherEngine = (function() {
        const state = {
            layer: L.layerGroup(),
            lastSignature: "",
            isSyncing: false,
            communityData: []
        };

        const getSkyIcon = (code) => {
            const map = { 0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 51:"🌦️", 61:"🌧️", 71:"❄️", 95:"⛈️" };
            return map[code] || "☁️";
        };

        const getSkyText = (code) => {
            const map = { 0:"CLEAR", 1:"P.CLOUDY", 2:"M.CLOUDY", 3:"OVC", 45:"FOG", 61:"RAIN", 71:"SNOW", 95:"TSORM" };
            return map[code] || "CLOUDY";
        };

        const getWindDir = (deg) => {
            const dirs = ['N','NE','E','SE','S','SW','W','NW'];
            return dirs[Math.round(deg / 45) % 8];
        };

        const refresh = async () => {
            if (state.isSyncing || !window.map) return;

            if (state.communityData.length === 0) {
                try {
                    const res = await fetch('/data/nl/communities.json');
                    const raw = await res.json();
                    state.communityData = Array.isArray(raw) ? raw : (raw.communities || []);
                } catch(e) { console.warn("Registry fallback mode active."); }
            }

            const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
            if (!route) return;

            const coords = route.getLatLngs();
            const speed = window.currentCruisingSpeed || 100;
            const dist = window.currentRouteDistance || 0;
            const depTime = window.currentDepartureTime || new Date();
            const zoom = window.map.getZoom();

            const signature = `${coords[0].lat}-${coords.length}-${speed}-${zoom}`;
            if (signature === state.lastSignature) return;

            state.isSyncing = true;
            state.lastSignature = signature;

            const samples = [0.05, 0.25, 0.5, 0.75, 0.95]; 
            const usedNames = new Set();
            const SNAP_THRESHOLD = 0.02; // 2km limit

            let waypoints = await Promise.all(samples.map(async (pct) => {
                const idx = Math.floor((coords.length - 1) * pct);
                const roadPoint = coords[idx]; 
                const arrival = new Date(depTime.getTime() + ((pct * dist) / speed) * 3600000);

                let nearest = state.communityData
                    .map(c => ({ ...c, d: Math.hypot(roadPoint.lat - c.lat, roadPoint.lng - c.lng) }))
                    .sort((a,b) => a.d - b.d)[0];

                const pointName = (nearest && nearest.d < SNAP_THRESHOLD) ? nearest.name : `ROUTE PT ${Math.round(pct*100)}`;

                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${roadPoint.lat}&longitude=${roadPoint.lng}&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,visibility&wind_speed_unit=kmh&timezone=auto`);
                    const d = await res.json();
                    const i = Math.max(0, d.hourly.time.indexOf(arrival.toISOString().split(':')[0] + ":00"));
                    
                    return {
                        name: pointName, lat: roadPoint.lat, lng: roadPoint.lng,
                        temp: Math.round(d.hourly.temperature_2m[i]),
                        wind: Math.round(d.hourly.wind_speed_10m[i]),
                        windDir: getWindDir(d.hourly.wind_direction_10m[i]),
                        vis: Math.round(d.hourly.visibility[i] / 1000),
                        skyIcon: getSkyIcon(d.hourly.weather_code[i]),
                        skyText: getSkyText(d.hourly.weather_code[i]),
                        eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})
                    };
                } catch (e) { return null; }
            }));

            render(waypoints.filter(w => w));
            state.isSyncing = false;
        };

        const render = (data) => {
            state.layer.clearLayers();
            let rows = "";
            data.forEach(d => {
                L.marker([d.lat, d.lng], {
                    icon: L.divIcon({
                        className: '',
                        html: `<div class="glass-node">
                                <div class="glass-header">${d.name}</div>
                                <div class="glass-body">
                                    <span>${d.skyIcon}</span>
                                    <span class="glass-temp-val">${d.temp}°</span>
                                </div>
                                <div class="glass-sub">${d.windDir} ${d.wind}kmh | ${d.vis}km</div>
                               </div>`,
                        iconSize: [110, 65], iconAnchor: [55, 32]
                    })
                }).addTo(state.layer);

                rows += `<tr>
                    <td style="padding:10px 5px; border-bottom:1px solid #222; font-weight:bold; color:#FFD700;">${d.name}</td>
                    <td style="border-bottom:1px solid #222;">${d.eta}Z</td>
                    <td style="border-bottom:1px solid #222; color:#FFD700;">${d.temp}°C</td>
                    <td style="border-bottom:1px solid #222;">${d.windDir} ${d.wind} KM/H</td>
                    <td style="border-bottom:1px solid #222;">${d.vis} KM</td>
                    <td style="border-bottom:1px solid #222; font-size:9px;">${d.skyText}</td>
                </tr>`;
            });
            document.getElementById('matrix-body').innerHTML = rows;
        };

        window.copyMatrix = () => {
            const rows = Array.from(document.querySelectorAll('#matrix-body tr')).map(tr => 
                Array.from(tr.cells).map(td => td.innerText).join(' | ')
            ).join('\n');
            navigator.clipboard.writeText("MISSION WEATHER MATRIX\n" + rows);
        };

        return {
            init: () => {
                state.layer.addTo(window.map);
                if(!document.getElementById('matrix-ui-container')) {
                    document.body.insertAdjacentHTML('beforeend', `
                        <div id="matrix-ui-container">
                            <button class="copy-btn" onclick="copyMatrix()">Copy</button>
                            <div style="color:#FFD700; font-size:11px; font-weight:900; margin-bottom:15px; letter-spacing:2px; text-transform:uppercase;">Mission Weather Matrix</div>
                            <table class="matrix-table">
                                <thead><tr style="color:#666; text-transform:uppercase; font-size:9px; border-bottom:1px solid #444;">
                                    <th style="padding-bottom:10px;">Location</th><th>ETA</th><th>Temp</th><th>Wind</th><th>Vis</th><th>Sky</th>
                                </tr></thead>
                                <tbody id="matrix-body"></tbody>
                            </table>
                        </div>
                    `);
                }
                setInterval(refresh, 5000);
            }
        };
    })();

    window.WeatherEngine = WeatherEngine;
    WeatherEngine.init();
})();
