/** * Project: [weong-bulletin] | L3 STABILITY PATCH 050
 * Core Logic: Explicit Percentage Samples + Proximity-Weighted Hubs (Patch 013 Restoration)
 * Fix: Restores data flow by using guaranteed geographic anchors.
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(15, 15, 15, 0.9); backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 215, 0, 0.7); border-radius: 6px;
            display: flex; flex-direction: column; width: 110px; color: #fff;
            box-shadow: 0 10px 40px rgba(0,0,0,0.8);
        }
        .glass-header {
            background: #FFD700; color: #000; font-size: 9px; font-weight: 900;
            text-align: center; padding: 3px 0; text-transform: uppercase;
        }
        .glass-body { display: flex; align-items: center; justify-content: center; padding: 6px; gap: 8px; }
        .glass-temp-val { font-size: 18px; font-weight: 900; color: #FFD700; }
        .glass-meta-sub { font-size: 9px; color: #ccc; text-align: center; padding-bottom: 4px; }
    `;
    document.head.appendChild(style);

    const WeatherEngine = (function() {
        const state = {
            layer: L.layerGroup(),
            lastSignature: "",
            isSyncing: false,
            hubs: [
                { name: "P.A.B", lat: 47.57, lng: -59.13 },
                { name: "Stephenville", lat: 48.45, lng: -58.43 },
                { name: "Corner Brook", lat: 48.95, lng: -57.94 },
                { name: "Deer Lake", lat: 49.17, lng: -57.43 },
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

            const signature = `${coords[0].lat}-${coords[coords.length-1].lat}-${speed}-${depTime.getTime()}`;
            if (signature === state.lastSignature) return;

            state.isSyncing = true;
            state.lastSignature = signature;

            // WEONG-ROUTE METHODOLOGY: Percentage-based sampling
            const samples = [0, 0.25, 0.5, 0.75, 0.99]; 
            const usedNames = new Set();

            let waypoints = await Promise.all(samples.map(async (pct) => {
                const idx = Math.floor((coords.length - 1) * pct);
                const p = coords[idx];
                const arrival = new Date(depTime.getTime() + ((pct * dist) / speed) * 3600000);

                // Proximity-Weighted Hub Selection
                let closestHub = state.hubs
                    .map(h => ({ ...h, d: Math.hypot(p.lat - h.lat, p.lng - h.lng) }))
                    .sort((a,b) => a.d - b.d)
                    .find(h => !usedNames.has(h.name)) || { name: `WP-${Math.round(pct*100)}` };
                
                usedNames.add(closestHub.name);

                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=temperature_2m,weather_code,wind_speed_10m,visibility&wind_speed_unit=kmh&timezone=auto`);
                    const data = await res.json();
                    const timeStr = arrival.toISOString().split(':')[0] + ":00";
                    const i = Math.max(0, data.hourly.time.findIndex(t => t.startsWith(timeStr.substring(0,13))));
                    
                    return {
                        name: closestHub.name, lat: p.lat, lng: p.lng, order: idx,
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
                                <div class="glass-body">
                                    <span>${d.sky}</span>
                                    <span class="glass-temp-val">${d.temp}°</span>
                                </div>
                                <div class="glass-meta-sub">${d.wind}kmh | ${d.vis}km</div>
                               </div>`,
                        iconSize: [110, 60], iconAnchor: [55, 30]
                    })
                }).addTo(state.layer);

                rows += `<tr>
                    <td style="padding:8px; border-bottom:1px solid #333; color:#FFD700; font-weight:bold;">${d.name}</td>
                    <td style="color:#fff;">${d.eta}</td>
                    <td style="color:#FFD700; font-weight:bold;">${d.temp}°C</td>
                    <td>${d.wind} km/h</td>
                    <td>${d.vis} km</td>
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
                            <div style="background:rgba(10,10,10,0.95); border:1px solid #FFD700; width:620px; padding:15px; border-radius:4px; pointer-events:auto;">
                                <div style="color:#FFD700; font-weight:bold; margin-bottom:10px; letter-spacing:2px; border-bottom:1px solid #FFD700;">MISSION WEATHER MATRIX</div>
                                <table style="width:100%; color:#fff; font-size:11px; text-align:left;">
                                    <thead><tr style="color:#888; text-transform:uppercase; font-size:9px;">
                                        <th>Hub</th><th>ETA</th><th>Temp</th><th>Wind</th><th>Vis</th><th style="text-align:right;">Sky</th>
                                    </tr></thead>
                                    <tbody id="matrix-body"></tbody>
                                </table>
                            </div>
                        </div>
                    `);
                }
                setInterval(refresh, 3000);
                refresh();
            }
        };
    })();

    window.WeatherEngine = WeatherEngine;
    WeatherEngine.init();
})();
