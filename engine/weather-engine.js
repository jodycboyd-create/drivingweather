/** * Project: [weong-bulletin] | L3 STABILITY PATCH 033
 * Fix: 404 Fault-Tolerance + Internal Emergency Registry
 * Feature: Centralized Loader + Full Mission Matrix
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* Central Sync HUD */
        #central-sync-overlay {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 99999; background: rgba(0,0,0,0.95); padding: 30px;
            border: 2px solid #FFD700; border-radius: 12px; width: 340px;
            text-align: center; display: none; pointer-events: none;
            box-shadow: 0 0 80px rgba(0,0,0,1);
        }
        .sync-text { color: #FFD700; font-size: 12px; font-weight: 900; letter-spacing: 4px; margin-bottom: 15px; }
        .sync-bar-full { width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
        #sync-progress-bar { width: 0%; height: 100%; background: #FFD700; transition: width 0.1s ease; }

        /* Map Weather Nodes */
        .glass-node {
            background: rgba(10, 10, 10, 0.9); backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 215, 0, 0.6); border-radius: 8px;
            display: flex; flex-direction: column; width: 110px; color: #fff;
            box-shadow: 0 10px 40px rgba(0,0,0,0.8); overflow: hidden;
        }
        .glass-header {
            background: #FFD700; color: #000; font-size: 10px; font-weight: 900;
            text-align: center; padding: 6px; text-transform: uppercase;
        }
        .glass-body { display: flex; align-items: center; justify-content: space-evenly; padding: 10px 5px; }
        .glass-temp-val { font-size: 22px; font-weight: 900; color: #FFD700; }
        
        /* Mission Weather Matrix */
        #matrix-ui-container {
            position: fixed; bottom: 25px; left: 25px; z-index: 10000;
            background: rgba(10, 10, 10, 0.95); backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 215, 0, 0.5); border-radius: 12px;
            width: 620px; padding: 20px; pointer-events: auto;
        }
        .matrix-table { width: 100%; color: #fff; font-size: 11px; text-align: left; border-collapse: collapse; }
        .matrix-table tr:nth-child(even) { background: rgba(255,255,255,0.05); }
        .copy-btn {
            background: #FFD700; color: #000; border: none; padding: 6px 14px;
            border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer; float: right;
        }
    `;
    document.head.appendChild(style);

    const WeatherEngine = (function() {
        const state = {
            layer: L.layerGroup(),
            lastSignature: "",
            isSyncing: false,
            // EMERGENCY REGISTRY: Prevents crash if json is 404
            communityData: [
                {name: "St. John's", lat: 47.5615, lng: -52.7126},
                {name: "Gander", lat: 48.9578, lng: -54.6084},
                {name: "Corner Brook", lat: 48.9500, lng: -57.9500},
                {name: "Grand Falls", lat: 48.9333, lng: -55.6500},
                {name: "Clarenville", lat: 48.1667, lng: -53.9667},
                {name: "Deer Lake", lat: 49.1667, lng: -57.4333},
                {name: "Stephenville", lat: 48.5500, lng: -58.5833},
                {name: "Port aux Basques", lat: 47.5728, lng: -59.1356},
                {name: "Lewisporte", lat: 49.2489, lng: -55.0558},
                {name: "Bonavista", lat: 48.6500, lng: -53.1167}
            ]
        };

        const getSkyIcon = (code) => {
            const map = { 0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 61:"🌧️", 71:"❄️", 95:"⛈️" };
            return map[code] || "☁️";
        };

        const getSkyText = (code) => {
            const map = { 0:"CLEAR", 1:"P.CLOUDY", 2:"M.CLOUDY", 3:"OVC", 45:"FOG", 61:"RAIN", 71:"SNOW", 95:"T-STORM" };
            return map[code] || "CLOUDY";
        };

        const getWindDir = (deg) => {
            const dirs = ['N','NE','E','SE','S','SW','W','NW'];
            return dirs[Math.round(deg / 45) % 8];
        };

        const updateSyncUI = (pct, show) => {
            const overlay = document.getElementById('central-sync-overlay');
            const bar = document.getElementById('sync-progress-bar');
            if (overlay) overlay.style.display = show ? 'block' : 'none';
            if (bar) bar.style.width = pct + "%";
        };

        const refresh = async (force = false) => {
            if (state.isSyncing || !window.map) return;

            // Attempt to load external registry once
            if (state.communityData.length <= 10) {
                try {
                    const res = await fetch('/data/nl/communities.json');
                    if (res.ok) {
                        const raw = await res.json();
                        state.communityData = Array.isArray(raw) ? raw : (raw.communities || state.communityData);
                    }
                } catch(e) { console.warn("Using Emergency Hub Registry."); }
            }

            const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
            if (!route) return;

            const coords = route.getLatLngs();
            const speed = window.currentCruisingSpeed || 100;
            const dist = window.currentRouteDistance || 0;
            const depTime = window.currentDepartureTime || new Date();
            const signature = `${coords[0].lat}-${coords.length}-${speed}`;

            if (!force && signature === state.lastSignature) return;

            state.isSyncing = true;
            state.lastSignature = signature;
            updateSyncUI(10, true);

            const samples = [0.05, 0.25, 0.5, 0.75, 0.95]; 
            const usedNames = new Set();
            let completed = 0;

            let waypoints = await Promise.all(samples.map(async (pct) => {
                const idx = Math.floor((coords.length - 1) * pct);
                const roadPoint = coords[idx]; 
                const arrival = new Date(depTime.getTime() + ((pct * dist) / speed) * 3600000);

                // FAULT-TOLERANT NAME SNAPPING
                let sorted = [...state.communityData]
                    .map(c => ({ ...c, d: Math.hypot(roadPoint.lat - c.lat, roadPoint.lng - c.lng) }))
                    .sort((a,b) => a.d - b.d);
                
                let nearest = sorted.find(c => !usedNames.has(c.name)) || sorted[0];
                if (nearest) usedNames.add(nearest.name);

                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${roadPoint.lat}&longitude=${roadPoint.lng}&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,visibility&wind_speed_unit=kmh&timezone=auto`);
                    const d = await res.json();
                    const i = Math.max(0, d.hourly.time.indexOf(arrival.toISOString().split(':')[0] + ":00"));
                    
                    completed++;
                    updateSyncUI(10 + (completed / samples.length) * 90, true);

                    return {
                        name: nearest.name, lat: roadPoint.lat, lng: roadPoint.lng,
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
            setTimeout(() => updateSyncUI(0, false), 800);
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
                               </div>`,
                        iconSize: [110, 56], iconAnchor: [55, 28]
                    })
                }).addTo(state.layer);

                rows += `<tr>
                    <td style="padding:12px 5px; border-bottom:1px solid #222; font-weight:bold; color:#FFD700;">${d.name}</td>
                    <td style="border-bottom:1px solid #222;">${d.eta}Z</td>
                    <td style="border-bottom:1px solid #222; color:#FFD700;">${d.temp}°C</td>
                    <td style="border-bottom:1px solid #222;">${d.windDir} ${d.wind} KM/H</td>
                    <td style="border-bottom:1px solid #222;">${d.vis} KM</td>
                    <td style="border-bottom:1px solid #222; font-size:9px;">${d.skyText}</td>
                </tr>`;
            });
            document.getElementById('matrix-body').innerHTML = rows;
        };

        return {
            init: () => {
                state.layer.addTo(window.map);
                if(!document.getElementById('central-sync-overlay')) {
                    document.body.insertAdjacentHTML('beforeend', `
                        <div id="central-sync-overlay">
                            <div class="sync-text">SYNCING MISSION DATA</div>
                            <div class="sync-bar-full"><div id="sync-progress-bar"></div></div>
                        </div>
                        <div id="matrix-ui-container">
                            <button class="copy-btn" onclick="WeatherEngine.copy()">Copy</button>
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
                
                window.map.on('dragstart', () => updateSyncUI(10, true));
                window.map.on('moveend', () => refresh(true));
                
                setInterval(refresh, 5000);
                refresh();
            },
            copy: () => {
                const rows = Array.from(document.querySelectorAll('#matrix-body tr')).map(tr => 
                    Array.from(tr.cells).map(td => td.innerText).join(' | ')
                ).join('\n');
                navigator.clipboard.writeText("MISSION WEATHER MATRIX\n" + rows);
            }
        };
    })();

    window.WeatherEngine = WeatherEngine;
    WeatherEngine.init();
})();
