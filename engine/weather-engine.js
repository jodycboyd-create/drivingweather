/** * Project: [weong-bulletin] | L3 STABILITY PATCH 064
 * Mission: Community Names ONLY + High-Clearance Icons + Full Table UI
 * Logic: Strict communities.json intersection. No highway fallbacks.
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(10, 10, 10, 0.98); backdrop-filter: blur(10px);
            border: 1px solid #FFD700; border-radius: 4px;
            display: flex; flex-direction: column; width: 100px; color: #fff;
            box-shadow: 0 10px 40px rgba(0,0,0,0.9); z-index: 1000;
        }
        .glass-header {
            background: #FFD700; color: #000; font-size: 10px; font-weight: 900;
            text-align: center; padding: 4px 2px; text-transform: uppercase;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .glass-body { display: flex; align-items: center; justify-content: center; padding: 6px; gap: 8px; }
        .glass-temp-val { font-size: 20px; font-weight: 900; color: #FFD700; }
        #matrix-loader {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.98); border: 2px solid #FFD700; color: #FFD700;
            padding: 30px 60px; font-family: monospace; letter-spacing: 4px; z-index: 40000;
            display: none; font-weight: 900; box-shadow: 0 0 100px #000;
        }
    `;
    document.head.appendChild(style);

    const WeatherEngine = (function() {
        const state = {
            layer: L.layerGroup(),
            lastSignature: "",
            isSyncing: false,
            communities: []
        };

        const toggleLoader = (show) => {
            const loader = document.getElementById('matrix-loader');
            if (loader) loader.style.display = show ? 'block' : 'none';
        };

        window.copyMatrixAction = () => {
            const body = document.getElementById('matrix-body');
            if (!body) return;
            let text = "MISSION WEATHER MATRIX\n";
            body.querySelectorAll('tr').forEach(tr => {
                text += Array.from(tr.querySelectorAll('td')).map(td => td.innerText).join(" | ") + "\n";
            });
            navigator.clipboard.writeText(text);
            alert("MATRIX COPIED");
        };

        const refresh = async () => {
            if (state.isSyncing || !window.map) return;
            const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
            if (!route) return;

            const coords = route.getLatLngs();
            const sig = `${coords.length}-${coords[0].lat}-${window.currentCruisingSpeed}`;
            if (sig === state.lastSignature) return;

            state.isSyncing = true;
            toggleLoader(true);
            state.lastSignature = sig;

            if (state.communities.length === 0) {
                try {
                    const res = await fetch('communities.json');
                    state.communities = await res.json();
                } catch(e) { console.error("Data Load Error"); }
            }

            const samples = [0, 0.25, 0.5, 0.75, 0.99];
            const speed = window.currentCruisingSpeed || 100;
            const dist = window.currentRouteDistance || 0;
            const depTime = window.currentDepartureTime || new Date();
            const used = new Set();

            let waypoints = await Promise.all(samples.map(async (pct) => {
                const idx = Math.floor((coords.length - 1) * pct);
                const p = coords[idx];
                
                // Find ONLY a literal community match within 15km of the sample point
                let match = state.communities
                    .map(c => ({ ...c, d: window.map.distance([p.lat, p.lng], [c.lat, c.lng]) }))
                    .filter(c => c.d < 15000 && !used.has(c.name))
                    .sort((a,b) => a.d - b.d)[0];

                if (!match) return null;
                used.add(match.name);

                const arrival = new Date(depTime.getTime() + ((pct * dist) / speed) * 3600000);

                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${match.lat}&longitude=${match.lng}&hourly=temperature_2m,weather_code&timezone=auto`);
                    const data = await res.json();
                    const tStr = arrival.toISOString().split(':')[0] + ":00";
                    const i = Math.max(0, data.hourly.time.findIndex(t => t.startsWith(tStr.substring(0,13))));
                    const m = { 0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 61:"🌧️", 71:"❄️", 95:"⛈️" };
                    
                    return {
                        name: match.name, lat: match.lat, lng: match.lng,
                        temp: Math.round(data.hourly.temperature_2m[i]),
                        sky: m[data.hourly.weather_code[i]] || "☁️",
                        eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    };
                } catch(e) { return null; }
            }));

            render(waypoints.filter(w => w));
            state.isSyncing = false;
            toggleLoader(false);
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
                                <div class="glass-body"><span>${d.sky}</span><span class="glass-temp-val">${d.temp}°</span></div>
                               </div>`,
                        iconSize: [100, 48], iconAnchor: [50, 150] // Highest clearance
                    })
                }).addTo(state.layer);

                rows += `<tr style="border-bottom: 1px solid #222;">
                    <td style="padding:15px 10px; color:#FFD700; font-weight:900; font-size:12px; text-transform:uppercase;">${d.name}</td>
                    <td style="padding:15px 10px; color:#fff; font-size:11px;">${d.eta}</td>
                    <td style="padding:15px 10px; color:#FFD700; font-weight:900; font-size:12px;">${d.temp}°C</td>
                    <td style="padding:15px 10px; text-align:right; font-size:18px;">${d.sky}</td>
                </tr>`;
            });
            const matrixBody = document.getElementById('matrix-body');
            if (matrixBody) matrixBody.innerHTML = rows;
        };

        return {
            init: () => {
                state.layer.addTo(window.map);
                if (!document.getElementById('matrix-loader')) {
                    document.body.insertAdjacentHTML('beforeend', `<div id="matrix-loader">INITIALIZING MISSION DATA...</div>`);
                }
                if (!document.getElementById('matrix-ui')) {
                    document.body.insertAdjacentHTML('beforeend', `
                        <div id="matrix-ui" style="position:fixed; bottom:30px; left:30px; z-index:10000; font-family:monospace; pointer-events:auto;">
                            <div style="background:rgba(10,10,10,0.98); border:1px solid #FFD700; width:550px; padding:20px; border-radius:4px; box-shadow: 0 0 80px #000;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid rgba(255,215,0,0.5); padding-bottom:12px;">
                                    <span style="color:#FFD700; font-weight:900; letter-spacing:4px; font-size:14px;">MISSION WEATHER MATRIX</span>
                                    <button onclick="window.copyMatrixAction()" style="background:#FFD700; border:none; color:#000; font-size:11px; font-weight:900; cursor:pointer; padding:5px 15px; border-radius:2px;">COPY</button>
                                </div>
                                <table style="width:100%; color:#fff; border-collapse:collapse;">
                                    <tbody id="matrix-body"></tbody>
                                </table>
                            </div>
                        </div>
                    `);
                }
                setInterval(refresh, 5000);
                refresh();
            }
        };
    })();

    window.WeatherEngine = WeatherEngine;
    WeatherEngine.init();
})();
