/** * Project: [weong-bulletin] | L3 STABILITY PATCH 063
 * Mission: Restore Table UI + Kill K-POS Labels + Fix Pin Overlap
 * Core Logic: Direct communities.json intersection (No Re-Engineering)
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(10, 10, 10, 0.98); backdrop-filter: blur(10px);
            border: 1px solid #FFD700; border-radius: 4px;
            display: flex; flex-direction: column; width: 95px; color: #fff;
            box-shadow: 0 10px 40px rgba(0,0,0,0.95); z-index: 1000;
        }
        .glass-header {
            background: #FFD700; color: #000; font-size: 10px; font-weight: 900;
            text-align: center; padding: 4px 0; text-transform: uppercase;
        }
        .glass-body { display: flex; align-items: center; justify-content: center; padding: 6px; gap: 8px; }
        .glass-temp-val { font-size: 19px; font-weight: 900; color: #FFD700; }
        #matrix-loader {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.98); border: 2px solid #FFD700; color: #FFD700;
            padding: 35px 50px; font-family: monospace; letter-spacing: 4px; z-index: 30000;
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

        window.copyMatrixData = () => {
            const body = document.getElementById('matrix-body');
            if (!body) return;
            let output = "MISSION WEATHER MATRIX\n----------------------\n";
            body.querySelectorAll('tr').forEach(tr => {
                const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
                output += cells.join(" | ") + "\n";
            });
            navigator.clipboard.writeText(output);
            alert("MATRIX COPIED TO CLIPBOARD");
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
                } catch(e) { console.error("Data Load Failed"); }
            }

            const samples = [0, 0.25, 0.5, 0.75, 0.99];
            const used = new Set();
            const speed = window.currentCruisingSpeed || 100;
            const dist = window.currentRouteDistance || 0;
            const depTime = window.currentDepartureTime || new Date();

            let waypoints = await Promise.all(samples.map(async (pct) => {
                const idx = Math.floor((coords.length - 1) * pct);
                const p = coords[idx];
                const arrival = new Date(depTime.getTime() + ((pct * dist) / speed) * 3600000);

                // Find community along the route (5km corridor)
                let nearest = state.communities
                    .map(c => ({ ...c, d: window.map.distance([p.lat, p.lng], [c.lat, c.lng]) }))
                    .filter(c => c.d < 5000 && !used.has(c.name))
                    .sort((a,b) => a.d - b.d)[0];
                
                const label = nearest ? nearest.name : `Highway km ${Math.round(pct * dist)}`;
                if (nearest) used.add(nearest.name);

                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=temperature_2m,weather_code&timezone=auto`);
                    const data = await res.json();
                    const tStr = arrival.toISOString().split(':')[0] + ":00";
                    const i = Math.max(0, data.hourly.time.findIndex(t => t.startsWith(tStr.substring(0,13))));
                    const m = { 0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 61:"🌧️", 71:"❄️", 95:"⛈️" };
                    
                    return {
                        name: label, lat: p.lat, lng: p.lng,
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
                        iconSize: [95, 45], iconAnchor: [47, 140] // Clear the pins
                    })
                }).addTo(state.layer);

                rows += `<tr>
                    <td style="padding:12px 8px; border-bottom:1px solid #222; color:#FFD700; font-weight:bold; font-size:11px; text-transform:uppercase;">${d.name}</td>
                    <td style="padding:12px 8px; border-bottom:1px solid #222; color:#fff; font-size:11px;">${d.eta}</td>
                    <td style="padding:12px 8px; border-bottom:1px solid #222; color:#FFD700; font-weight:bold; font-size:11px;">${d.temp}°C</td>
                    <td style="padding:12px 8px; border-bottom:1px solid #222; text-align:right; font-size:14px;">${d.sky}</td>
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
                            <div style="background:rgba(10,10,10,0.98); border:1px solid #FFD700; width:550px; padding:20px; border-radius:4px; box-shadow: 0 0 50px #000;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid rgba(255,215,0,0.4); padding-bottom:10px;">
                                    <span style="color:#FFD700; font-weight:900; letter-spacing:3px;">MISSION WEATHER MATRIX</span>
                                    <button onclick="window.copyMatrixData()" style="background:#FFD700; border:none; color:#000; font-size:10px; font-weight:900; cursor:pointer; padding:4px 12px; border-radius:2px;">COPY</button>
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
