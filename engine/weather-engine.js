/** * Project: [weong-bulletin] | L3 STABILITY PATCH 045
 * Integration: Patch 013 UI + Recent 100km Interval Logic
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
        .glass-body {
            display: flex; align-items: center; justify-content: center;
            padding: 6px; gap: 8px;
        }
        .glass-temp-val { font-size: 18px; font-weight: 900; color: #FFD700; }
        .glass-meta-sub { font-size: 9px; color: #ccc; text-align: center; padding-bottom: 4px; }
    `;
    document.head.appendChild(style);

    const WeatherEngine = (function() {
        const state = {
            layer: L.layerGroup(),
            lastSignature: "",
            isSyncing: false,
            communityData: [] // To be filled from your registry
        };

        const getSky = (code) => {
            const map = { 0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 61:"🌧️", 71:"❄️", 95:"⛈️" };
            return map[code] || "☁️";
        };

        const refresh = async () => {
            if (state.isSyncing || !window.map) return;

            // Load community registry if missing
            if (state.communityData.length === 0) {
                try {
                    const res = await fetch('/data/nl/communities.json');
                    const raw = await res.json();
                    state.communityData = Array.isArray(raw) ? raw : (raw.communities || []);
                } catch(e) { return; }
            }

            const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
            if (!route || state.communityData.length === 0) return;

            const coords = route.getLatLngs();
            const signature = `${coords[0].lat}-${coords.length}`;
            if (signature === state.lastSignature) return;

            state.isSyncing = true;
            state.lastSignature = signature;

            // 1. NEW 100KM INTERVAL LOGIC
            let cumulativeDist = 0;
            let distMap = coords.map((p, i) => {
                if (i === 0) return 0;
                cumulativeDist += window.map.distance(coords[i-1], p);
                return cumulativeDist;
            });

            const intervalM = 100000; // 100km
            let targetPoints = [];
            for (let d = 0; d <= cumulativeDist; d += intervalM) {
                let closestIdx = distMap.findIndex(m => m >= d);
                if (closestIdx !== -1) targetPoints.push({ pt: coords[closestIdx], dist: d });
            }
            // Ensure end of route is always included
            if (cumulativeDist % intervalM > 20000) targetPoints.push({ pt: coords[coords.length-1], dist: cumulativeDist });

            // 2. REGISTRY SNAPPING
            let waypoints = await Promise.all(targetPoints.map(async (target) => {
                let nearest = state.communityData
                    .map(c => ({ ...c, d: window.map.distance([target.pt.lat, target.pt.lng], [c.lat, c.lng]) }))
                    .sort((a, b) => a.d - b.d)[0];
                
                if (!nearest) return null;

                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${nearest.lat}&longitude=${nearest.lng}&hourly=temperature_2m,weather_code,wind_speed_10m,visibility&wind_speed_unit=kmh&timezone=auto`);
                    const d = await res.json();
                    
                    return {
                        name: nearest.name, lat: nearest.lat, lng: nearest.lng,
                        temp: Math.round(d.hourly.temperature_2m[0]),
                        wind: Math.round(d.hourly.wind_speed_10m[0]),
                        vis: Math.round(d.hourly.visibility[0] / 1000),
                        sky: getSky(d.hourly.weather_code[0])
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
                                    <span>${d.sky}</span>
                                    <span class="glass-temp-val">${d.temp}°</span>
                                </div>
                                <div class="glass-meta-sub">${d.wind}kmh | ${d.vis}km</div>
                               </div>`,
                        iconSize: [110, 60], iconAnchor: [55, 30]
                    })
                }).addTo(state.layer);

                rows += `<tr>
                    <td style="padding:8px; border-bottom:1px solid #333; font-weight:bold; color:#FFD700;">${d.name}</td>
                    <td style="color:#FFD700; font-weight:bold;">${d.temp}°C</td>
                    <td>${d.wind} km/h</td>
                    <td>${d.vis} km</td>
                    <td style="text-align:right;">${d.sky}</td>
                </tr>`;
            });
            document.getElementById('matrix-body').innerHTML = rows;
        };

        return {
            init: () => {
                state.layer.addTo(window.map);
                document.body.insertAdjacentHTML('beforeend', `
                    <div id="matrix-ui" style="position:fixed; bottom:30px; left:30px; z-index:10000; font-family:monospace; pointer-events:none;">
                        <div style="background:rgba(10,10,10,0.95); border:1px solid #FFD700; width:600px; padding:15px; border-radius:4px; pointer-events:auto;">
                            <div style="color:#FFD700; font-weight:bold; margin-bottom:10px; letter-spacing:2px; border-bottom:1px solid #FFD700;">MISSION WEATHER MATRIX</div>
                            <table style="width:100%; color:#fff; font-size:11px; text-align:left;">
                                <thead><tr style="color:#888; text-transform:uppercase; font-size:9px;">
                                    <th>Hub</th><th>Temp</th><th>Wind</th><th>Vis</th><th style="text-align:right;">Sky</th>
                                </tr></thead>
                                <tbody id="matrix-body"></tbody>
                            </table>
                        </div>
                    </div>
                `);
                setInterval(refresh, 5000);
            }
        };
    })();

    window.WeatherEngine = WeatherEngine;
    WeatherEngine.init();
})();
