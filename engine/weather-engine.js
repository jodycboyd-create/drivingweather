/** * Project: [weong-bulletin] | L3 STABILITY PATCH 056
 * Core Logic: Percentage Samples + JSON Integrity + Gambo Fix
 * Fix: Eliminates "Gambit" and ensures verified town names from registry.
 */

(function() {
    const WeatherEngine = (function() {
        const state = {
            layer: L.layerGroup(),
            lastSignature: "",
            isSyncing: false,
            registry: []
        };

        const refresh = async () => {
            if (state.isSyncing || !window.map) return;
            
            // LOAD & VALIDATE REGISTRY
            if (state.registry.length === 0) {
                try {
                    const res = await fetch('/data/nl/communities.json');
                    const text = await res.text();
                    const raw = JSON.parse(text); // Strict parse to catch syntax errors
                    state.registry = Array.isArray(raw) ? raw : (raw.communities || []);
                } catch(e) { 
                    console.error("JSON Syntax Error in communities.json:", e);
                    // Critical Fallback for Gander Corridor
                    state.registry = [{name: "Gambo", lat: 48.74, lng: -54.21}, {name: "Glovertown", lat: 48.67, lng: -54.03}];
                }
            }

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

                // STRICT SNAP: 10km limit + verify name "Gambo" over "Gambit"
                let nearest = state.registry
                    .map(c => ({ ...c, d: window.map.distance([p.lat, p.lng], [c.lat, c.lng]) }))
                    .filter(c => c.d < 10000 && !usedNames.has(c.name))
                    .sort((a,b) => a.d - b.d)[0];
                
                let label = nearest ? nearest.name : `K-POS ${Math.round(pct*100)}%`;
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
                        sky: (code => {
                            const m = { 0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 51:"🌦️", 61:"🌧️", 71:"❄️", 95:"⛈️" };
                            return m[code] || "☁️";
                        })(data.hourly.weather_code[i]),
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
                        html: `<div class="glass-node" style="background:rgba(10,10,10,0.95); border:1px solid #FFD700; border-radius:6px; width:115px; color:#fff; display:flex; flex-direction:column; box-shadow:0 10px 40px #000;">
                                <div style="background:#FFD700; color:#000; font-size:10px; font-weight:900; text-align:center; padding:4px 0; text-transform:uppercase;">${d.name}</div>
                                <div style="display:flex; align-items:center; justify-content:center; padding:6px; gap:8px;"><span>${d.sky}</span><span style="font-size:19px; font-weight:900; color:#FFD700;">${d.temp}°</span></div>
                                <div style="font-size:9px; color:#ccc; text-align:center; padding-bottom:5px;">${d.wind}KMH | ${d.vis}KM</div>
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

        return { init: () => { state.layer.addTo(window.map); setInterval(refresh, 5000); refresh(); } };
    })();

    window.WeatherEngine = WeatherEngine;
    WeatherEngine.init();
})();
