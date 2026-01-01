/** * Project: [weong-bulletin] | L3 STABILITY PATCH 066
 * Mission: Final Logic Lock + Icon Fix + Strict JSON Matching
 * Logic: No Hallucinations. No Highway Labels. Communities ONLY.
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(10, 10, 10, 0.98); backdrop-filter: blur(10px);
            border: 2px solid #FFD700; border-radius: 4px;
            display: flex; flex-direction: column; width: 110px; color: #fff;
            box-shadow: 0 10px 40px rgba(0,0,0,0.9); z-index: 9999;
        }
        .glass-header {
            background: #FFD700; color: #000; font-size: 11px; font-weight: 900;
            text-align: center; padding: 5px 2px; text-transform: uppercase;
        }
        .glass-body { display: flex; align-items: center; justify-content: center; padding: 8px; gap: 10px; }
        .glass-temp-val { font-size: 22px; font-weight: 900; color: #FFD700; }
        #matrix-loader {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.98); border: 2px solid #FFD700; color: #FFD700;
            padding: 40px 80px; font-family: monospace; letter-spacing: 5px; z-index: 50000;
            display: none; font-weight: 900; box-shadow: 0 0 150px #000;
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

        window.copyMissionMatrix = () => {
            const body = document.getElementById('matrix-body');
            if (!body) return;
            let text = "MISSION WEATHER MATRIX\n";
            body.querySelectorAll('tr').forEach(tr => {
                text += Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim()).join(" | ") + "\n";
            });
            navigator.clipboard.writeText(text);
            alert("COPIED TO MISSION LOG");
        };

        const refresh = async () => {
            if (state.isSyncing || !window.map) return;
            const routeLayer = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
            if (!routeLayer) return;

            const coords = routeLayer.getLatLngs();
            const sig = `${coords.length}-${coords[0].lat}-${window.currentCruisingSpeed}`;
            if (sig === state.lastSignature) return;

            state.isSyncing = true;
            toggleLoader(true);
            state.lastSignature = sig;

            if (state.communities.length === 0) {
                try {
                    const res = await fetch('communities.json');
                    state.communities = await res.json();
                } catch(e) { console.error("JSON Fetch Failed"); }
            }

            const samples = [0, 0.25, 0.5, 0.75, 0.99];
            const speed = window.currentCruisingSpeed || 100;
            const dist = window.currentRouteDistance || 0;
            const depTime = window.currentDepartureTime || new Date();
            const used = new Set();

            let waypoints = await Promise.all(samples.map(async (pct) => {
                const idx = Math.floor((coords.length - 1) * pct);
                const p = coords[idx];
                
                // Find ONLY literal matches from the communities.json
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
                        iconSize: [110, 55], iconAnchor: [55, 160] // Float clear of pins
                    })
                }).addTo(state.layer);

                rows += `<tr>
                    <td style="padding:15px 12px; border-bottom:1px solid #333; color:#FFD700; font-weight:900; text-transform:uppercase;">${d.name}</td>
                    <td style="padding:15px 12px; border-bottom:1px solid #333; color:#fff;">${d.eta}</td>
                    <td style="padding:15px 12px; border-bottom:1px solid #333; color:#FFD700; font-weight:900;">${d.temp}°C</td>
                    <td style="padding:15px 12px; border-bottom:1px solid #333; text-align:right; font-size:22px;">${d.sky}</td>
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
                            <div style="background:rgba(10,10,10,0.98); border:2px solid #FFD700; width:550px; padding:25px; border-radius:4px; box-shadow: 0 0 100px #000;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid rgba(255,215,0,0.6); padding-bottom:15px;">
                                    <span style="color:#FFD700; font-weight:900; letter-spacing:5px; font-size:16px;">MISSION WEATHER MATRIX</span>
                                    <button onclick="window.copyMissionMatrix()" style="background:#FFD700; border:none; color:#000; font-size:12px; font-weight:900; cursor:pointer; padding:6px 20px; border-radius:2px;">COPY</button>
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
