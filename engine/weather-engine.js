/** * Project: [weong-bulletin] | L3 STABILITY PATCH 020
 * Status: Full Restoration + Registry Error Fix
 * Core: communities.json integration via /data/nl/
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* Glassmorph Effect for Map Nodes */
        .glass-node {
            background: rgba(10, 10, 10, 0.7); 
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 215, 0, 0.3); 
            border-radius: 6px;
            display: flex; flex-direction: column; width: 90px; color: #fff;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
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
        
        /* Rounded Matrix UI */
        #matrix-ui-container {
            position: fixed; bottom: 25px; left: 25px; z-index: 10000;
            background: rgba(5, 5, 5, 0.9); backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 215, 0, 0.4); border-radius: 12px;
            width: 580px; padding: 15px; pointer-events: auto;
            box-shadow: 0 10px 40px rgba(0,0,0,0.8);
        }
        .copy-btn {
            background: #FFD700; color: #000; border: none; padding: 4px 10px;
            border-radius: 4px; font-size: 9px; font-weight: bold; cursor: pointer;
            float: right; text-transform: uppercase; transition: 0.3s;
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
            const map = { 
                0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 48: "🌫️", 
                51: "🌦️", 61: "🌧️", 63: "🌧️", 71: "❄️", 73: "❄️", 95: "⛈️" 
            };
            return map[code] || "☁️";
        };

        const getSkyText = (code) => {
            const map = { 
                0: "CLEAR", 1: "P.CLOUDY", 2: "M.CLOUDY", 3: "OVC", 45: "FOG", 
                61: "L.RAIN", 63: "RAIN", 71: "L.SNOW", 73: "SNOW", 95: "TSORM" 
            };
            return map[code] || "CLOUDY";
        };

        const getWindDir = (deg) => {
            const dirs = ['N','NE','E','SE','S','SW','W','NW'];
            return dirs[Math.round(deg / 45) % 8];
        };

        const refresh = async () => {
            if (state.isSyncing || !window.map) return;

            // Load registry from correct path
            if (state.communityData.length === 0) {
                try {
                    const res = await fetch('/data/nl/communities.json');
                    const data = await res.json();
                    state.communityData = Array.isArray(data) ? data : (data.communities || []);
                } catch(e) { return; }
            }

            const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
            if (!route) return;

            const coords = route.getLatLngs();
            const speed = window.currentCruisingSpeed || 100;
            const dist = window.currentRouteDistance || 0;
            const depTime = window.currentDepartureTime || new Date();
            const zoom = window.map.getZoom();

            const signature = `${coords[0].lat}-${speed}-${depTime.getTime()}-${zoom}`;
            if (signature === state.lastSignature) return;

            state.isSyncing = true;
            state.lastSignature = signature;

            const samples = [0, 0.2, 0.4, 0.6, 0.8, 0.99]; 
            const usedNames = new Set();
            const renderedPositions = [];
            
            // Overlap threshold scales with zoom level
            const overlapThreshold = Math.max(0.05, 2.0 / Math.pow(2, zoom - 5));

            let waypoints = await Promise.all(samples.map(async (pct) => {
                const idx = Math.floor((coords.length - 1) * pct);
                const p = coords[idx];
                const arrival = new Date(depTime.getTime() + ((pct * dist) / speed) * 3600000);

                let nearest = state.communityData
                    .map(c => ({ ...c, d: Math.hypot(p.lat - c.lat, p.lng - c.lng) }))
                    .sort((a,b) => a.d - b.d)
                    .find(c => !usedNames.has(c.name)) || { name: `WP-${Math.round(pct*100)}`, lat: p.lat, lng: p.lng };

                // Collision Avoidance
                if (renderedPositions.some(pos => Math.hypot(nearest.lat - pos.lat, nearest.lng - pos.lng) < overlapThreshold)) return null;

                usedNames.add(nearest.name);
                renderedPositions.push({lat: nearest.lat, lng: nearest.lng});

                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${nearest.lat}&longitude=${nearest.lng}&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,visibility&wind_speed_unit=kmh&timezone=auto`);
                    const d = await res.json();
                    const i = Math.max(0, d.hourly.time.indexOf(arrival.toISOString().split(':')[0] + ":00"));
                    
                    return {
                        name: nearest.name, lat: nearest.lat, lng: nearest.lng,
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
                                    <span style="font-size:16px;">${d.skyIcon}</span>
                                    <span class="glass-temp-val">${d.temp}°</span>
                                </div>
                               </div>`,
                        iconSize: [90, 48], iconAnchor: [45, 24]
                    })
                }).addTo(state.layer);

                rows += `<tr>
                    <td style="padding:8px 5px; border-bottom:1px solid #222; font-weight:bold; color:#FFD700;">${d.name}</td>
                    <td style="border-bottom:1px solid #222;">${d.eta}Z</td>
                    <td style="border-bottom:1px solid #222;">${d.temp}°C</td>
                    <td style="border-bottom:1px solid #222;">${d.windDir} ${d.wind} KM/H</td>
                    <td style="border-bottom:1px solid #222;">${d.vis} KM</td>
                    <td style="border-bottom:1px solid #222; font-size:9px;">${d.skyText}</td>
                </tr>`;
            });
            document.getElementById('matrix-body').innerHTML = rows;
        };

        window.copyMatrix = () => {
            const text = Array.from(document.querySelectorAll('#matrix-body tr')).map(tr => 
                Array.from(tr.cells).map(td => td.innerText).join(' | ')
            ).join('\n');
            navigator.clipboard.writeText("WEATHER MATRIX\n" + text);
            alert("Copied.");
        };

        return {
            init: () => {
                state.layer.addTo(window.map);
                if(!document.getElementById('matrix-ui-container')) {
                    document.body.insertAdjacentHTML('beforeend', `
                        <div id="matrix-ui-container">
                            <button class="copy-btn" onclick="copyMatrix()">Copy</button>
                            <div style="color:#FFD700; font-size:10px; font-weight:bold; margin-bottom:10px; letter-spacing:1px;">MISSION WEATHER MATRIX</div>
                            <table style="width:100%; color:#fff; font-size:10px; text-align:left; border-collapse:collapse;">
                                <thead><tr style="color:#555; text-transform:uppercase; font-size:8px; border-bottom:1px solid #333;">
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
