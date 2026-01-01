/** * Project: [weong-bulletin] | L3 STABILITY PATCH 054
 * Core Logic: Percentage Samples + Fixed Geographic Anchors (Recovery Build)
 * Fix: Resolves 'TypeError' by using guaranteed anchors instead of dynamic registry.
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(10, 10, 10, 0.95); backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 215, 0, 0.8); border-radius: 6px;
            display: flex; flex-direction: column; width: 115px; color: #fff;
            box-shadow: 0 10px 40px rgba(0,0,0,0.9); z-index: 1000;
        }
        .glass-header {
            background: #FFD700; color: #000; font-size: 10px; font-weight: 900;
            text-align: center; padding: 4px 0; text-transform: uppercase;
        }
        .glass-body { display: flex; align-items: center; justify-content: center; padding: 6px; gap: 8px; }
        .glass-temp-val { font-size: 19px; font-weight: 900; color: #FFD700; }
        .glass-meta-sub { font-size: 9px; color: #ccc; text-align: center; padding-bottom: 5px; }
    `;
    document.head.appendChild(style);

    const WeatherEngine = (function() {
        const state = {
            layer: L.layerGroup(),
            lastSignature: "",
            isSyncing: false,
            // Guaranteed anchors to prevent 'undefined' crashes
            anchors: [
                { name: "P.A.B", lat: 47.57, lng: -59.13 },
                { name: "Stephenville", lat: 48.45, lng: -58.43 },
                { name: "Corner Brook", lat: 48.95, lng: -57.94 },
                { name: "Deer Lake", lat: 49.17, lng: -57.43 },
                { name: "South Brook", lat: 49.43, lng: -56.08 },
                { name: "Badger", lat: 48.97, lng: -56.03 },
                { name: "Grand Falls", lat: 48.93, lng: -55.65 },
                { name: "Gander", lat: 48.95, lng: -54.61 },
                { name: "Clarenville", lat: 48.16, lng: -53.96 },
                { name: "Whitbourne", lat: 47.42, lng: -53.52 },
                { name: "St. John's", lat: 47.56, lng: -52.71 }
            ]
        };

        const getSky = (code) => {
            const map = { 0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 61:"🌧️", 71:"❄️", 95:"⛈️" };
            return map[code] || "☁️";
        };

        const refresh = async () => {
            if (state.isSyncing || !window.map) return;
            const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
            if (!route) return;

            const coords = route.getLatLngs();
            const speed = window.currentCruisingSpeed || 100;
            const dist = window.currentRouteDistance || 0;
            const depTime = window.currentDepartureTime || new Date();

            const signature = `${coords[0].lat}-${coords.length}-${speed}-${depTime.getTime()}`;
            if (signature === state.lastSignature) return;

            state.isSyncing = true;
            state.lastSignature = signature;

            const samples = [0, 0.25, 0.5, 0.75, 0.99]; 
            const usedNames = new Set();

            let waypoints = await Promise.all(samples.map(async (pct) => {
                const idx = Math.floor((coords.length - 1) * pct);
                const p = coords[idx];
                const arrival = new Date(depTime.getTime() + ((pct * dist) / speed) * 3600000);

                // Robust Proximity Snap using guaranteed anchors
                let nearest = state.anchors
                    .map(a => ({ ...a, d: Math.hypot(p.lat - a.lat, p.lng - a.lng) }))
                    .filter(a => !usedNames.has(a.name))
                    .sort((a,b) => a.d - b.d)[0];
                
                const label = nearest ? nearest.name : `WAYPOINT ${Math.round(pct*100)}`;
                if (nearest) usedNames.add(nearest.name);

                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=temperature_2m,weather_code,wind_speed_10m,visibility&wind_speed_unit=kmh&timezone=auto`);
                    const data = await res.json();
                    const tStr = arrival.toISOString().split(':')[0] + ":00";
                    const i = Math.max(0, data.hourly.time.findIndex(t => t.startsWith(tStr.substring(0,13))));
                    
                    return {
                        name: label, lat: p.lat, lng: p.lng, order: idx,
                        temp: Math.round(data.hourly.temperature_2m[i]),
                        wind: Math.round(data.hourly.wind_speed_10m[i]),
                        vis: Math.round(data.hourly.visibility[i] / 1000),
                        sky: getSky(data.hourly.weather_code[i]),
                        eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    };
                } catch (e) { return null; }
            }));

            render(waypoints.filter(w => w).sort((a,b) => a.order - b.order));
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
                                <div class="glass-body"><span>${d.sky}</span><span class="glass-temp-val">${d.temp}°</span></div>
                                <div class="glass-meta-sub">${d.wind}KMH | ${d.vis}KM</div>
                               </div>`,
                        iconSize: [115, 70], iconAnchor: [57, 85]
                    })
                }).addTo(state.layer);

                rows += `<tr>
                    <td style="padding:10px 8px; border-bottom:1px solid #222; color:#FFD700; font-weight:bold;">${d.name}</td>
                    <td style="color:#fff;">${d.eta}</td>
                    <td style="color:#FFD700; font-weight:bold;">${d.temp}°C</td>
                    <td>${d.wind} KM/H</td>
                    <td>${d.vis} KM</td>
                    <td style="text-align:right;">${d.sky}</td>
                </tr>`;
            });
            const matrixBody = document.getElementById('matrix-body');
            if (matrixBody) matrixBody.innerHTML = rows;
        };

        return {
            init: () => {
                state.layer.addTo(window.map);
                if (!document.getElementById('matrix-ui')) {
                    document.body.insertAdjacentHTML('beforeend', `
                        <div id="matrix-ui" style="position:fixed; bottom:30px; left:30px; z-index:10000; font-family:monospace; pointer-events:none;">
                            <div style="background:rgba(10,10,10,0.96); border:1px solid #FFD700; width:650px; padding:20px; border-radius:4px; pointer-events:auto; box-shadow: 0 0 50px rgba(0,0,0,0.95);">
                                <div style="color:#FFD700; font-weight:900; margin-bottom:15px; letter-spacing:3px; border-bottom:1px solid rgba(255,215,0,0.4); padding-bottom:10px;">MISSION WEATHER MATRIX</div>
                                <table style="width:100%; color:#fff; font-size:11px; text-align:left; border-collapse:collapse;">
                                    <thead><tr style="color:#666; text-transform:uppercase; font-size:9px;">
                                        <th>Location</th><th>ETA</th><th>Temp</th><th>Wind</th><th>Vis</th><th style="text-align:right;">Sky</th>
                                    </tr></thead>
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
