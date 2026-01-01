/** * Project: [weong-bulletin] | L3 STABILITY PATCH 047
 * Logic: Simplified Index-Based Sampling (Direct from Route)
 * UI: Patch 013 Restoration
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
            communityData: []
        };

        const getSky = (code) => {
            const map = { 0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 61:"🌧️", 71:"❄️", 95:"⛈️" };
            return map[code] || "☁️";
        };

        const refresh = async () => {
            if (state.isSyncing || !window.map) return;

            // Load Registry once
            if (state.communityData.length === 0) {
                try {
                    const res = await fetch('/data/nl/communities.json');
                    const raw = await res.json();
                    state.communityData = Array.isArray(raw) ? raw : (raw.communities || []);
                } catch(e) { return; }
            }

            const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
            if (!route) return;

            const coords = route.getLatLngs();
            const signature = `${coords[0].lat}-${coords.length}`;
            if (signature === state.lastSignature) return;

            state.isSyncing = true;
            state.lastSignature = signature;

            // 1. SIMPLE INDEX SAMPLING (EVENLY SPACED ALONG THE ARRAY)
            // We take 6 representative points from the route array
            const sampleIndices = [
                0, 
                Math.floor(coords.length * 0.2), 
                Math.floor(coords.length * 0.4), 
                Math.floor(coords.length * 0.6), 
                Math.floor(coords.length * 0.8), 
                coords.length - 1
            ];

            let waypoints = await Promise.all(sampleIndices.map(async (idx) => {
                const pt = coords[idx];
                // Find nearest named town for the label
                let nearest = state.communityData
                    .map(c => ({ ...c, d: window.map.distance([pt.lat, pt.lng], [c.lat, c.lng]) }))
                    .sort((a, b) => a.d - b.d)[0];
                
                const label = nearest ? nearest.name : `WP-${idx}`;

                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pt.lat}&longitude=${pt.lng}&hourly=temperature_2m,weather_code,wind_speed_10m,visibility&wind_speed_unit=kmh&timezone=auto`);
                    const d = await res.json();
                    
                    return {
                        name: label, lat: pt.lat, lng: pt.lng,
                        temp: Math.round(d.hourly.temperature_2m[0]),
                        wind: Math.round(d.hourly.wind_speed_10m[0]),
                        vis: Math.round(d.hourly.visibility[0] / 1000),
                        sky: getSky(d.hourly.weather_code[0])
                    };
                } catch (e) { return null; }
            }));

            // 2. RENDER
            state.layer.clearLayers();
            let rows = "";
            waypoints.filter(w => w).forEach(d => {
                // Map Icons
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

                // Table Rows
                rows += `<tr>
                    <td style="padding:8px; border-bottom:1px solid #333; font-weight:bold; color:#FFD700;">${d.name}</td>
                    <td style="color:#FFD700; font-weight:bold;">${d.temp}°C</td>
                    <td>${d.wind} km/h</td>
                    <td>${d.vis} km</td>
                    <td style="text-align:right;">${d.sky}</td>
                </tr>`;
            });

            const matrixBody = document.getElementById('matrix-body');
            if (matrixBody) matrixBody.innerHTML = rows;
            
            state.isSyncing = false;
        };

        return {
            init: () => {
                state.layer.addTo(window.map);
                if (!document.getElementById('matrix-ui')) {
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
                }
                setInterval(refresh, 5000);
                refresh();
            }
        };
    })();

    window.WeatherEngine = WeatherEngine;
    WeatherEngine.init();
})();
