/** * Project: [weong-bulletin] | L3 STABILITY PATCH 014
 * Core Logic: Explicit Origin/Destination Waypoints + Proximity-Weighted Hubs
 * Refinement: Streamlined Map Icons & Text-Only Tabular Forecast
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* Refined, smaller glass nodes */
        .glass-node {
            background: rgba(10, 10, 10, 0.92); backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 215, 0, 0.6); border-radius: 4px;
            display: flex; flex-direction: column; width: 85px; color: #fff;
            box-shadow: 0 4px 15px rgba(0,0,0,0.6);
            transition: all 0.3s ease;
        }
        .glass-header {
            background: #FFD700; color: #000; font-size: 8px; font-weight: 900;
            text-align: center; padding: 2px 0; text-transform: uppercase;
            letter-spacing: 0.5px; border-radius: 3px 3px 0 0;
        }
        .glass-body {
            display: flex; align-items: center; justify-content: space-evenly;
            padding: 4px 2px;
        }
        .glass-icon-svg { font-size: 14px; }
        .glass-temp-val { font-size: 15px; font-weight: 900; color: #FFD700; }
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
                { name: "Grand Falls", lat: 48.93, lng: -55.65 },
                { name: "Gander", lat: 48.95, lng: -54.61 },
                { name: "Clarenville", lat: 48.16, lng: -53.96 },
                { name: "Whitbourne", lat: 47.42, lng: -53.52 },
                { name: "St. John's", lat: 47.56, lng: -52.71 }
            ]
        };

        // UI-Only Icon Map (Map Visuals)
        const getSkyIcon = (code) => {
            const map = { 0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 61:"🌧️", 71:"❄️" };
            return map[code] || "☁️";
        };

        // Text-Only Logic (Tabular Product)
        const getSkyText = (code) => {
            const map = { 
                0: "CLEAR", 1: "PARTLY CLOUDY", 2: "MOSTLY CLOUDY", 
                3: "OVERCAST", 45: "FOG", 61: "RAIN", 71: "SNOW" 
            };
            return map[code] || "CLOUDY";
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

            const samples = [0, 0.25, 0.5, 0.75, 0.99]; 
            const usedNames = new Set();

            let waypoints = await Promise.all(samples.map(async (pct) => {
                const idx = Math.floor((coords.length - 1) * pct);
                const p = coords[idx];
                const arrival = new Date(depTime.getTime() + ((pct * dist) / speed) * 3600000);

                let closestHub = state.hubs
                    .map(h => ({ ...h, d: Math.hypot(p.lat - h.lat, p.lng - h.lng) }))
                    .sort((a,b) => a.d - b.d)
                    .find(h => !usedNames.has(h.name)) || { name: `WP-${Math.round(pct*100)}` };
                
                usedNames.add(closestHub.name);

                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=temperature_2m,weather_code,wind_speed_10m,visibility&wind_speed_unit=kmh&timezone=auto`);
                    const data = await res.json();
                    const i = Math.max(0, data.hourly.time.indexOf(arrival.toISOString().split(':')[0] + ":00"));
                    const code = data.hourly.weather_code[i];
                    
                    return {
                        name: closestHub.name, lat: p.lat, lng: p.lng, order: idx,
                        temp: Math.round(data.hourly.temperature_2m[i]),
                        wind: Math.round(data.hourly.wind_speed_10m[i]),
                        vis: Math.round(data.hourly.visibility[i] / 1000),
                        skyIcon: getSkyIcon(code),
                        skyText: getSkyText(code),
                        eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})
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
                // RENDER MINIMALIST MAP ICON
                L.marker([d.lat, d.lng], {
                    icon: L.divIcon({
                        className: '',
                        html: `<div class="glass-node">
                                <div class="glass-header">${d.name}</div>
                                <div class="glass-body">
                                    <span class="glass-icon-svg">${d.skyIcon}</span>
                                    <span class="glass-temp-val">${d.temp}°</span>
                                </div>
                               </div>`,
                        iconSize: [85, 45], iconAnchor: [42, 22]
                    })
                }).addTo(state.layer);

                // RENDER TEXT-ONLY TABLE ROW
                rows += `<tr>
                    <td style="padding:6px; border-bottom:1px solid #222; font-weight:bold;">${d.name}</td>
                    <td style="border-bottom:1px solid #222;">${d.eta}</td>
                    <td style="color:#FFD700; font-weight:bold; border-bottom:1px solid #222;">${d.temp}°C</td>
                    <td style="border-bottom:1px solid #222;">${d.wind} KM/H</td>
                    <td style="border-bottom:1px solid #222;">${d.vis} KM</td>
                    <td style="border-bottom:1px solid #222; font-size:9px; letter-spacing:1px; color:#aaa;">${d.skyText}</td>
                </tr>`;
            });
            document.getElementById('matrix-body').innerHTML = rows;
        };

        return {
            init: () => {
                state.layer.addTo(window.map);
                if(!document.getElementById('matrix-ui')) {
                    document.body.insertAdjacentHTML('beforeend', `
                        <div id="matrix-ui" style="position:fixed; bottom:20px; left:20px; z-index:10000; font-family:'Segoe UI', monospace; pointer-events:none;">
                            <div style="background:rgba(5,5,5,0.98); border-left:4px solid #FFD700; width:520px; padding:12px; box-shadow: 0 0 30px rgba(0,0,0,1); pointer-events:auto;">
                                <div style="color:#FFD700; font-size:10px; font-weight:bold; margin-bottom:8px; letter-spacing:3px;">SYSTEM WEATHER MATRIX // TEXT ONLY PRODUCT</div>
                                <table style="width:100%; color:#fff; font-size:10px; text-align:left; border-collapse:collapse;">
                                    <thead><tr style="color:#555; text-transform:uppercase; font-size:8px; border-bottom:1px solid #444;">
                                        <th style="padding-bottom:5px;">HUB</th><th>ETA (Z)</th><th>TEMP</th><th>WIND</th><th>VIS</th><th>CONDITION</th>
                                    </tr></thead>
                                    <tbody id="matrix-body"></tbody>
                                </table>
                            </div>
                        </div>
                    `);
                }
                setInterval(refresh, 3000);
            }
        };
    })();

    window.WeatherEngine = WeatherEngine;
    WeatherEngine.init();
})();
