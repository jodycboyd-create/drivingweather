/** * Project: [weong-bulletin] | L3 STABILITY PATCH 016
 * Core Logic: communities.json Integration + Overlap Prevention
 * UI: Glassmorphism Icons + Rounded Matrix + Wind Direction
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(15, 15, 15, 0.85); 
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 215, 0, 0.4); 
            border-radius: 6px;
            display: flex; flex-direction: column; width: 85px; color: #fff;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            overflow: hidden;
        }
        .glass-header {
            background: #FFD700; color: #000; font-size: 8px; font-weight: 900;
            text-align: center; padding: 2px 4px; text-transform: uppercase;
        }
        .glass-body {
            display: flex; align-items: center; justify-content: space-evenly;
            padding: 5px 2px;
        }
        .glass-temp-val { font-size: 16px; font-weight: 900; color: #FFD700; }
        
        #matrix-ui-container {
            position: fixed; bottom: 20px; left: 20px; z-index: 10000;
            background: rgba(5,5,5,0.95); backdrop-filter: blur(15px);
            border-left: 4px solid #FFD700; border-radius: 12px;
            width: 550px; padding: 15px; pointer-events: auto;
            box-shadow: 0 10px 40px rgba(0,0,0,0.8);
        }
        .copy-btn {
            background: #FFD700; color: #000; border: none; padding: 4px 8px;
            border-radius: 4px; font-size: 9px; font-weight: bold; cursor: pointer;
            float: right; text-transform: uppercase;
        }
        .copy-btn:hover { background: #fff; }
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
            const map = { 0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 61:"🌧️", 71:"❄️" };
            return map[code] || "☁️";
        };

        const getSkyText = (code) => {
            const map = { 0:"CLEAR", 1:"P.CLOUDY", 2:"M.CLOUDY", 3:"OVC", 45:"FOG", 61:"RAIN", 71:"SNOW" };
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
                    const res = await fetch('communities.json');
                    state.communityData = await res.json();
                } catch(e) { return; }
            }

            const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
            if (!route) return;

            const coords = route.getLatLngs();
            const speed = window.currentCruisingSpeed || 100;
            const dist = window.currentRouteDistance || 0;
            const depTime = window.currentDepartureTime || new Date();

            const signature = `${coords[0].lat}-${coords[coords.length-1].lat}-${speed}-${depTime.getTime()}`;
            if (signature === state.lastSignature) return;

            state.isSyncing = true;
            state.lastSignature = signature;

            const samples = [0, 0.2, 0.4, 0.6, 0.8, 0.99]; 
            const usedNames = new Set();
            const renderedPositions = [];

            let waypoints = await Promise.all(samples.map(async (pct) => {
                const idx = Math.floor((coords.length - 1) * pct);
                const p = coords[idx];
                const arrival = new Date(depTime.getTime() + ((pct * dist) / speed) * 3600000);

                let nearest = state.communityData
                    .map(c => ({ ...c, d: Math.hypot(p.lat - c.lat, p.lng - c.lng) }))
                    .sort((a,b) => a.d - b.d)
                    .find(c => !usedNames.has(c.name)) || { name: `WP-${Math.round(pct*100)}`, lat: p.lat, lng: p.lng };

                // OVERLAP PREVENTION: Check if point is too close to existing markers (simple pixel/coord threshold)
                const isTooClose = renderedPositions.some(pos => Math.hypot(nearest.lat - pos.lat, nearest.lng - pos.lng) < 0.15);
                if (isTooClose) return null;

                usedNames.add(nearest.name);
                renderedPositions.push({lat: nearest.lat, lng: nearest.lng});

                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${nearest.lat}&longitude=${nearest.lng}&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,visibility&wind_speed_unit=kmh&timezone=auto`);
                    const data = await res.json();
                    const i = Math.max(0, data.hourly.time.indexOf(arrival.toISOString().split(':')[0] + ":00"));
                    
                    return {
                        name: nearest.name, lat: nearest.lat, lng: nearest.lng,
                        temp: Math.round(data.hourly.temperature_2m[i]),
                        wind: Math.round(data.hourly.wind_speed_10m[i]),
                        windDir: getWindDir(data.hourly.wind_direction_10m[i]),
                        vis: Math.round(data.hourly.visibility[i] / 1000),
                        skyIcon: getSkyIcon(data.hourly.weather_code[i]),
                        skyText: getSkyText(data.hourly.weather_code[i]),
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
                                    <span style="font-size:14px;">${d.skyIcon}</span>
                                    <span class="glass-temp-val">${d.temp}°</span>
                                </div>
                               </div>`,
                        iconSize: [85, 45], iconAnchor: [42, 22]
                    })
                }).addTo(state.layer);

                rows += `<tr>
                    <td style="padding:6px; border-bottom:1px solid #333; font-weight:bold; color:#FFD700;">${d.name}</td>
                    <td style="border-bottom:1px solid #333;">${d.eta}Z</td>
                    <td style="border-bottom:1px solid #333;">${d.temp}°C</td>
                    <td style="border-bottom:1px solid #333;">${d.windDir} ${d.wind} KM/H</td>
                    <td style="border-bottom:1px solid #333;">${d.vis} KM</td>
                    <td style="border-bottom:1px solid #333; font-size:9px;">${d.skyText}</td>
                </tr>`;
            });
            document.getElementById('matrix-body').innerHTML = rows;
        };

        window.copyMatrix = () => {
            const text = Array.from(document.querySelectorAll('#matrix-body tr')).map(tr => 
                Array.from(tr.cells).map(td => td.innerText).join(' | ')
            ).join('\n');
            navigator.clipboard.writeText("MISSION WEATHER MATRIX\n" + text);
            alert("Matrix copied to clipboard.");
        };

        return {
            init: () => {
                state.layer.addTo(window.map);
                if(!document.getElementById('matrix-ui-container')) {
                    document.body.insertAdjacentHTML('beforeend', `
                        <div id="matrix-ui-container" style="pointer-events:none;">
                            <button class="copy-btn" onclick="copyMatrix()">Copy</button>
                            <div style="color:#FFD700; font-size:10px; font-weight:bold; margin-bottom:10px; letter-spacing:2px;">MISSION WEATHER MATRIX // TEXT ONLY</div>
                            <table style="width:100%; color:#fff; font-size:10px; text-align:left; border-collapse:collapse; pointer-events:auto;">
                                <thead><tr style="color:#666; text-transform:uppercase; font-size:8px; border-bottom:1px solid #444;">
                                    <th>LOCATION</th><th>ETA</th><th>TEMP</th><th>WIND</th><th>VIS</th><th>SKY</th>
                                </tr></thead>
                                <tbody id="matrix-body"></tbody>
                            </table>
                        </div>
                    `);
                }
                setInterval(refresh, 4000);
            }
        };
    })();

    window.WeatherEngine = WeatherEngine;
    WeatherEngine.init();
})();
