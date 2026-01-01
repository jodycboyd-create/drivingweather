/** * Project: [weong-bulletin] | L3 STABILITY PATCH 049
 * Logic: ~100km Community-Only Snapping (No Generic WPs)
 * UI: Restored Patch 013 Glass Nodes
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(15, 15, 15, 0.92); backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 215, 0, 0.7); border-radius: 6px;
            display: flex; flex-direction: column; width: 115px; color: #fff;
            box-shadow: 0 10px 40px rgba(0,0,0,0.8);
        }
        .glass-header {
            background: #FFD700; color: #000; font-size: 9px; font-weight: 900;
            text-align: center; padding: 4px 0; text-transform: uppercase;
        }
        .glass-body { display: flex; align-items: center; justify-content: center; padding: 6px; gap: 8px; }
        .glass-temp-val { font-size: 18px; font-weight: 900; color: #FFD700; }
        .glass-meta-sub { font-size: 9px; color: #ccc; text-align: center; padding-bottom: 5px; }
    `;
    document.head.appendChild(style);

    const WeatherEngine = (function() {
        const state = {
            layer: L.layerGroup(),
            lastSignature: "",
            isSyncing: false,
            registry: []
        };

        const getSky = (code) => {
            const m = { 0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 61:"🌧️", 71:"❄️", 95:"⛈️" };
            return m[code] || "☁️";
        };

        const refresh = async () => {
            if (state.isSyncing || !window.map) return;

            if (state.registry.length === 0) {
                try {
                    const res = await fetch('/data/nl/communities.json');
                    const raw = await res.json();
                    state.registry = Array.isArray(raw) ? raw : (raw.communities || []);
                } catch(e) { return; }
            }

            const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
            if (!route || state.registry.length === 0) return;

            const coords = route.getLatLngs();
            const signature = `${coords[0].lat}-${coords.length}`;
            if (signature === state.lastSignature) return;

            state.isSyncing = true;
            state.lastSignature = signature;

            // 1. Establish 100km Target Points
            let totalDist = 0;
            let distMap = coords.map((p, i) => {
                if (i === 0) return 0;
                totalDist += window.map.distance(coords[i-1], p);
                return totalDist;
            });

            const intervalM = 100000; // ~100km
            let selectedCommunities = [];
            const usedNames = new Set();

            for (let d = 0; d <= totalDist; d += intervalM) {
                let idx = distMap.findIndex(m => m >= d);
                if (idx === -1) idx = coords.length - 1;
                
                let p = coords[idx];
                
                // Snap to nearest REAL community
                let near = state.registry
                    .map(c => ({ ...c, d: window.map.distance([p.lat, p.lng], [c.lat, c.lng]) }))
                    .filter(c => !usedNames.has(c.name))
                    .sort((a,b) => a.d - b.d)[0];

                if (near) {
                    selectedCommunities.push(near);
                    usedNames.add(near.name);
                }
            }

            // 2. Fetch Mission Data
            let waypoints = await Promise.all(selectedCommunities.map(async (town) => {
                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${town.lat}&longitude=${town.lng}&hourly=temperature_2m,weather_code,wind_speed_10m,visibility&wind_speed_unit=kmh&timezone=auto`);
                    const d = await res.json();
                    return {
                        name: town.name, lat: town.lat, lng: town.lng,
                        temp: Math.round(d.hourly.temperature_2m[0]),
                        wind: Math.round(d.hourly.wind_speed_10m[0]),
                        vis: Math.round(d.hourly.visibility[0] / 1000),
                        sky: getSky(d.hourly.weather_code[0])
                    };
                } catch(e) { return null; }
            }));

            // 3. Render Non-Overlapping Icons
            state.layer.clearLayers();
            let rows = "";
            waypoints.filter(w => w).forEach(d => {
                L.marker([d.lat, d.lng], {
                    icon: L.divIcon({
                        className: '',
                        html: `<div class="glass-node">
                                <div class="glass-header">${d.name}</div>
                                <div class="glass-body"><span>${d.sky}</span><span class="glass-temp-val">${d.temp}°</span></div>
                                <div class="glass-meta-sub">${d.wind}kmh | ${d.vis}km</div>
                               </div>`,
                        iconSize: [115, 65], iconAnchor: [57, 32]
                    })
                }).addTo(state.layer);

                rows += `<tr>
                    <td style="padding:10px 8px; border-bottom:1px solid #222; font-weight:bold; color:#FFD700;">${d.name}</td>
                    <td style="color:#FFD700; font-weight:bold;">${d.temp}°C</td>
                    <td>${d.wind} KM/H</td>
                    <td>${d.vis} KM</td>
                    <td style="text-align:right;">${d.sky}</td>
                </tr>`;
            });

            const body = document.getElementById('matrix-body');
            if (body) body.innerHTML = rows;
            state.isSyncing = false;
        };

        return {
            init: () => {
                state.layer.addTo(window.map);
                if (!document.getElementById('matrix-ui')) {
                    document.body.insertAdjacentHTML('beforeend', `
                        <div id="matrix-ui" style="position:fixed; bottom:30px; left:30px; z-index:10000; font-family:monospace; pointer-events:none;">
                            <div style="background:rgba(10,10,10,0.96); border:1px solid #FFD700; width:620px; padding:20px; border-radius:4px; pointer-events:auto; box-shadow: 0 0 50px rgba(0,0,0,0.9);">
                                <div style="color:#FFD700; font-weight:900; margin-bottom:15px; letter-spacing:3px; border-bottom:1px solid rgba(255,215,0,0.3); padding-bottom:10px;">MISSION WEATHER MATRIX</div>
                                <table style="width:100%; color:#fff; font-size:11px; text-align:left; border-collapse: collapse;">
                                    <thead><tr style="color:#666; text-transform:uppercase; font-size:9px;">
                                        <th>Location</th><th>Temp</th><th>Wind</th><th>Vis</th><th style="text-align:right;">Sky</th>
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
