/** * Project: [weong-bulletin] | L3 STABILITY PATCH 035
 * Fix: Equal Spacing + 10km Strict Snap + TCH Milestone Fallback
 * Logic: Name = Nearest Road-Neighbor | No Major Center Preference
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
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

        .glass-node {
            background: rgba(10, 10, 10, 0.9); backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 215, 0, 0.7); border-radius: 10px;
            display: flex; flex-direction: column; width: 125px; color: #fff;
            box-shadow: 0 15px 45px rgba(0,0,0,0.85); overflow: hidden;
        }
        .glass-header {
            background: #FFD700; color: #000; font-size: 10px; font-weight: 900;
            text-align: center; padding: 7px; text-transform: uppercase;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .glass-body { display: flex; align-items: center; justify-content: space-evenly; padding: 12px 6px; }
        .glass-temp-val { font-size: 24px; font-weight: 900; color: #FFD700; }
        
        #matrix-ui-container {
            position: fixed; bottom: 25px; left: 25px; z-index: 10000;
            background: rgba(10, 10, 10, 0.95); backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 215, 0, 0.5); border-radius: 12px;
            width: 640px; padding: 20px; pointer-events: auto;
        }
        .matrix-table { width: 100%; color: #fff; font-size: 11px; text-align: left; border-collapse: collapse; }
        .matrix-table tr { border-bottom: 1px solid rgba(255,255,255,0.05); }
        .matrix-table tr:nth-child(even) { background: rgba(255,255,255,0.03); }
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
            communityData: []
        };

        const updateSyncUI = (pct, show) => {
            const overlay = document.getElementById('central-sync-overlay');
            const bar = document.getElementById('sync-progress-bar');
            if (overlay) overlay.style.display = show ? 'block' : 'none';
            if (bar) bar.style.width = pct + "%";
        };

        const refresh = async (force = false) => {
            if (state.isSyncing || !window.map) return;

            // Load Registry if missing
            if (state.communityData.length === 0) {
                try {
                    const res = await fetch('/data/nl/communities.json');
                    const raw = await res.json();
                    state.communityData = Array.isArray(raw) ? raw : (raw.communities || []);
                } catch(e) { console.warn("Registry 404 - Please verify file path."); }
            }

            const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
            if (!route) return;

            const coords = route.getLatLngs();
            const signature = `${coords[0].lat}-${coords.length}`;
            if (!force && signature === state.lastSignature) return;

            state.isSyncing = true;
            state.lastSignature = signature;
            updateSyncUI(10, true);

            // EQUAL SPACING: 5 Points distributed evenly along the road
            const samples = [0.05, 0.25, 0.50, 0.75, 0.95]; 
            const usedNames = new Set();
            let completed = 0;

            let waypoints = await Promise.all(samples.map(async (pct) => {
                const idx = Math.floor((coords.length - 1) * pct);
                const roadPoint = coords[idx]; 

                // STRICT SNAP LOGIC (10km threshold)
                let nearest = state.communityData
                    .map(c => ({ ...c, d: window.map.distance([roadPoint.lat, roadPoint.lng], [c.lat, c.lng]) }))
                    .sort((a,b) => a.d - b.d)[0];
                
                let displayName = "TCH Milestone";
                if (nearest && nearest.d < 10000) { // Only snap if within 10km
                    displayName = nearest.name;
                } else {
                    displayName = `ROUTE PT ${Math.round(pct * 100)}`;
                }

                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${roadPoint.lat}&longitude=${roadPoint.lng}&hourly=temperature_2m,weather_code,wind_speed_10m,visibility&wind_speed_unit=kmh&timezone=auto`);
                    const d = await res.json();
                    
                    completed++;
                    updateSyncUI(10 + (completed / samples.length) * 90, true);

                    return {
                        name: displayName, lat: roadPoint.lat, lng: roadPoint.lng,
                        temp: Math.round(d.hourly.temperature_2m[0]),
                        wind: Math.round(d.hourly.wind_speed_10m[0]),
                        vis: Math.round(d.hourly.visibility[0] / 1000),
                        skyIcon: (c => {
                            const m = { 0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 61:"🌧️", 71:"❄️", 95:"⛈️" };
                            return m[c] || "☁️";
                        })(d.hourly.weather_code[0])
                    };
                } catch (e) { return null; }
            }));

            state.layer.clearLayers();
            let rows = "";
            waypoints.filter(w => w).forEach(d => {
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
                        iconSize: [125, 68], iconAnchor: [62, 34]
                    })
                }).addTo(state.layer);

                rows += `<tr>
                    <td style="padding:15px 5px; font-weight:bold; color:#FFD700;">${d.name}</td>
                    <td style="color:#FFD700; font-weight:900;">${d.temp}°C</td>
                    <td>${d.wind} KM/H</td>
                    <td>${d.vis} KM</td>
                </tr>`;
            });
            document.getElementById('matrix-body').innerHTML = rows;
            setTimeout(() => updateSyncUI(0, false), 800);
            state.isSyncing = false;
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
                                    <th style="padding-bottom:12px;">Location</th><th>Temp</th><th>Wind</th><th>Vis</th>
                                </tr></thead>
                                <tbody id="matrix-body"></tbody>
                            </table>
                        </div>
                    `);
                }
                window.map.on('dragstart', () => updateSyncUI(10, true));
                window.map.on('moveend', () => refresh(true));
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
