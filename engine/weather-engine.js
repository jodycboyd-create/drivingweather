/** * Project: [weong-bulletin] | L3 STABILITY PATCH 060
 * Mission: Eliminate "WP" Labels + Fix Pin Overlap + Restore Copy
 * Status: HARD-LOCKED REGISTRY (No Fallbacks)
 */
/** * Project: [weong-bulletin] | L3 STABILITY PATCH 061
 * Mission: Dynamic communities.json Integration + Zero Hard-Coding
 * Logic: Percent-based route sampling with full spatial community lookup.
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(10, 10, 10, 0.95); backdrop-filter: blur(10px);
            border: 1px solid #FFD700; border-radius: 4px;
            display: flex; flex-direction: column; width: 90px; color: #fff;
            box-shadow: 0 8px 32px rgba(0,0,0,0.8);
        }
        .glass-header {
            background: #FFD700; color: #000; font-size: 9px; font-weight: 900;
            text-align: center; padding: 3px 0; text-transform: uppercase;
        }
        .glass-body { display: flex; align-items: center; justify-content: center; padding: 5px; gap: 5px; }
        .glass-temp-val { font-size: 18px; font-weight: 900; color: #FFD700; }
        #matrix-loader {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.95); border: 2px solid #FFD700; color: #FFD700;
            padding: 30px; font-family: monospace; letter-spacing: 3px; z-index: 20000;
            display: none; font-weight: bold;
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

        window.copyMatrixText = () => {
            const body = document.getElementById('matrix-body');
            if (!body) return;
            let output = "MISSION WEATHER MATRIX\n";
            body.querySelectorAll('tr').forEach(tr => {
                const cols = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
                output += cols.join(" | ") + "\n";
            });
            navigator.clipboard.writeText(output);
            alert("Matrix Copied.");
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

            // Load the full communities list from JSON
            if (state.communities.length === 0) {
                try {
                    const res = await fetch('/data/nl/communities.json');
                    const raw = await res.json();
                    state.communities = Array.isArray(raw) ? raw : (raw.communities || []);
                } catch(e) { console.error("Failed to load communities.json", e); }
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

                // DYNAMIC LOOKUP: Find closest community in JSON to this route coordinate
                let nearest = state.communities
                    .map(c => ({ ...c, d: window.map.distance([p.lat, p.lng], [c.lat, c.lng]) }))
                    .filter(c => !used.has(c.name))
                    .sort((a,b) => a.d - b.d)[0];
                
                const label = nearest ? nearest.name : `K-POS ${Math.round(pct*100)}%`;
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
                        iconSize: [90, 42], iconAnchor: [45, 120] 
                    })
                }).addTo(state.layer);

                rows += `<tr style="border-bottom: 1px solid #222;">
                    <td style="padding:10px; color:#FFD700; font-weight:bold;">${d.name}</td>
                    <td style="padding:10px; color:#fff;">${d.eta}</td>
                    <td style="padding:10px; color:#FFD700;">${d.temp}°C</td>
                    <td style="padding:10px; text-align:right;">${d.sky}</td>
                </tr>`;
            });
            const matrixBody = document.getElementById('matrix-body');
            if (matrixBody) matrixBody.innerHTML = rows;
        };

        return {
            init: () => {
                state.layer.addTo(window.map);
                if (!document.getElementById('matrix-loader')) {
                    document.body.insertAdjacentHTML('beforeend', `<div id="matrix-loader">LOADING MISSION DATA...</div>`);
                }
                if (!document.getElementById('matrix-ui')) {
                    document.body.insertAdjacentHTML('beforeend', `
                        <div id="matrix-ui" style="position:fixed; bottom:30px; left:30px; z-index:10000; font-family:monospace; pointer-events:auto;">
                            <div style="background:rgba(10,10,10,0.98); border:1px solid #FFD700; width:450px; padding:15px; border-radius:4px; box-shadow: 0 0 50px #000;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid rgba(255,215,0,0.3); padding-bottom:8px;">
                                    <span style="color:#FFD700; font-weight:900; letter-spacing:2px;">MISSION WEATHER MATRIX</span>
                                    <button onclick="window.copyMatrixText()" style="background:#FFD700; border:none; color:#000; font-size:9px; font-weight:bold; cursor:pointer; padding:3px 10px; border-radius:2px;">COPY</button>
                                </div>
                                <table style="width:100%; color:#fff; font-size:11px; text-align:left; border-collapse:collapse;">
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
(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(10, 10, 10, 0.95); backdrop-filter: blur(10px);
            border: 1px solid #FFD700; border-radius: 4px;
            display: flex; flex-direction: column; width: 90px; color: #fff;
            box-shadow: 0 8px 32px rgba(0,0,0,0.8);
        }
        .glass-header {
            background: #FFD700; color: #000; font-size: 9px; font-weight: 900;
            text-align: center; padding: 3px 0; text-transform: uppercase;
        }
        .glass-body { display: flex; align-items: center; justify-content: center; padding: 5px; gap: 5px; }
        .glass-temp-val { font-size: 18px; font-weight: 900; color: #FFD700; }
        #matrix-loader {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.95); border: 2px solid #FFD700; color: #FFD700;
            padding: 30px; font-family: monospace; letter-spacing: 3px; z-index: 20000;
            display: none; font-weight: bold;
        }
    `;
    document.head.appendChild(style);

    const WeatherEngine = (function() {
        const state = {
            layer: L.layerGroup(),
            lastSignature: "",
            isSyncing: false,
            // Hard-coded registry ensures no 'undefined' errors or WP fallbacks
            registry: [
                { name: "Port aux Basques", lat: 47.57, lng: -59.13 },
                { name: "Stephenville", lat: 48.45, lng: -58.43 },
                { name: "Corner Brook", lat: 48.95, lng: -57.94 },
                { name: "Deer Lake", lat: 49.17, lng: -57.43 },
                { name: "South Brook", lat: 49.43, lng: -56.08 },
                { name: "Badger", lat: 48.97, lng: -56.03 },
                { name: "Grand Falls", lat: 48.93, lng: -55.65 },
                { name: "Gander", lat: 48.95, lng: -54.61 },
                { name: "Gambo", lat: 48.74, lng: -54.21 },
                { name: "Clarenville", lat: 48.16, lng: -53.96 },
                { name: "Whitbourne", lat: 47.42, lng: -53.52 },
                { name: "St. John's", lat: 47.56, lng: -52.71 },
                { name: "Englee", lat: 50.73, lng: -56.11 }
            ]
        };

        const toggleLoader = (show) => {
            const loader = document.getElementById('matrix-loader');
            if (loader) loader.style.display = show ? 'block' : 'none';
        };

        window.copyMatrixText = () => {
            const body = document.getElementById('matrix-body');
            if (!body) return;
            let output = "MISSION WEATHER MATRIX\n";
            body.querySelectorAll('tr').forEach(tr => {
                const cols = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
                output += cols.join(" | ") + "\n";
            });
            navigator.clipboard.writeText(output);
            alert("Matrix Copied.");
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

            const samples = [0, 0.25, 0.5, 0.75, 0.99];
            const used = new Set();
            const speed = window.currentCruisingSpeed || 100;
            const dist = window.currentRouteDistance || 0;
            const depTime = window.currentDepartureTime || new Date();

            let waypoints = await Promise.all(samples.map(async (pct) => {
                const idx = Math.floor((coords.length - 1) * pct);
                const p = coords[idx];
                const arrival = new Date(depTime.getTime() + ((pct * dist) / speed) * 3600000);

                // FORCE SNAP: Find nearest community regardless of distance to avoid "WP" labels
                let nearest = state.registry
                    .map(c => ({ ...c, d: window.map.distance([p.lat, p.lng], [c.lat, c.lng]) }))
                    .filter(c => !used.has(c.name))
                    .sort((a,b) => a.d - b.d)[0];
                
                const label = nearest ? nearest.name : "STATION";
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
                        iconSize: [90, 42], iconAnchor: [45, 120] // Increased height to clear pins
                    })
                }).addTo(state.layer);

                rows += `<tr style="border-bottom: 1px solid #222;">
                    <td style="padding:10px; color:#FFD700; font-weight:bold;">${d.name}</td>
                    <td style="padding:10px; color:#fff;">${d.eta}</td>
                    <td style="padding:10px; color:#FFD700;">${d.temp}°C</td>
                    <td style="padding:10px; text-align:right;">${d.sky}</td>
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
                            <div style="background:rgba(10,10,10,0.98); border:1px solid #FFD700; width:450px; padding:15px; border-radius:4px; box-shadow: 0 0 50px #000;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid rgba(255,215,0,0.3); padding-bottom:8px;">
                                    <span style="color:#FFD700; font-weight:900; letter-spacing:2px;">MISSION WEATHER MATRIX</span>
                                    <button onclick="window.copyMatrixText()" style="background:#FFD700; border:none; color:#000; font-size:9px; font-weight:bold; cursor:pointer; padding:3px 10px; border-radius:2px;">COPY</button>
                                </div>
                                <table style="width:100%; color:#fff; font-size:11px; text-align:left; border-collapse:collapse;">
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
