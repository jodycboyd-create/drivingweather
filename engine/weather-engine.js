/** * Project: [weong-bulletin] | L3 STABILITY PATCH 015
 * Core Logic: Semi-Regular Route Sampling + Dynamic Community Snapping
 * Fix: Eliminates hub hierarchy; waypoints now snap to the absolute nearest community.
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(10, 10, 10, 0.95); backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 215, 0, 0.5); border-radius: 4px;
            display: flex; flex-direction: column; width: 85px; color: #fff;
            box-shadow: 0 6px 20px rgba(0,0,0,0.7);
        }
        .glass-header {
            background: #FFD700; color: #000; font-size: 8px; font-weight: 900;
            text-align: center; padding: 2px 4px; text-transform: uppercase;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .glass-body {
            display: flex; align-items: center; justify-content: space-evenly;
            padding: 5px 2px;
        }
        .glass-temp-val { font-size: 16px; font-weight: 900; color: #FFD700; }
    `;
    document.head.appendChild(style);

    const WeatherEngine = (function() {
        const state = {
            layer: L.layerGroup(),
            lastSignature: "",
            isSyncing: false,
            // Comprehensive NL Registry for snapping
            communities: [
                { name: "P.A.B", lat: 47.57, lng: -59.13 }, { name: "Channel", lat: 47.58, lng: -59.14 },
                { name: "Doyles", lat: 47.84, lng: -59.18 }, { name: "St. Fintan's", lat: 48.20, lng: -58.85 },
                { name: "Stephenville", lat: 48.55, lng: -58.57 }, { name: "Corner Brook", lat: 48.95, lng: -57.94 },
                { name: "Pasadena", lat: 49.01, lng: -57.60 }, { name: "Deer Lake", lat: 49.17, lng: -57.43 },
                { name: "Hampden Jct", lat: 49.25, lng: -57.10 }, { name: "Sheppardville", lat: 49.33, lng: -56.35 },
                { name: "South Brook", lat: 49.43, lng: -56.08 }, { name: "Badger", lat: 48.97, lng: -56.03 },
                { name: "Grand Falls", lat: 48.93, lng: -55.65 }, { name: "Bishop's Falls", lat: 49.01, lng: -55.48 },
                { name: "Norris Arm", lat: 49.08, lng: -55.05 }, { name: "Glenwood", lat: 48.99, lng: -54.87 },
                { name: "Gander", lat: 48.95, lng: -54.61 }, { name: "Gambon", lat: 48.78, lng: -54.21 },
                { name: "Terra Nova", lat: 48.45, lng: -54.01 }, { name: "Clarenville", lat: 48.16, lng: -53.96 },
                { name: "Goobies", lat: 47.94, lng: -53.95 }, { name: "Arnold's Cove", lat: 47.76, lng: -53.92 },
                { name: "Whitbourne", lat: 47.42, lng: -53.52 }, { name: "Holyrood", lat: 47.38, lng: -53.13 },
                { name: "St. John's", lat: 47.56, lng: -52.71 }, { name: "Mount Pearl", lat: 47.52, lng: -52.81 }
            ]
        };

        const getSkyIcon = (code) => {
            const map = { 0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 61:"🌧️", 71:"❄️" };
            return map[code] || "☁️";
        };

        const getSkyText = (code) => {
            const map = { 0:"CLEAR", 1:"P.CLOUDY", 2:"M.CLOUDY", 3:"OVC", 45:"FOG", 61:"RAIN", 71:"SNOW" };
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

            // Sample route at regular intervals (0, 25, 50, 75, 100%)
            const samples = [0, 0.25, 0.5, 0.75, 0.99]; 
            const usedNames = new Set();

            let waypoints = await Promise.all(samples.map(async (pct) => {
                const idx = Math.floor((coords.length - 1) * pct);
                const p = coords[idx];
                const arrival = new Date(depTime.getTime() + ((pct * dist) / speed) * 3600000);

                // Find absolute nearest community (no hierarchy)
                let nearest = state.communities
                    .map(c => ({ ...c, d: Math.hypot(p.lat - c.lat, p.lng - c.lng) }))
                    .sort((a,b) => a.d - b.d)
                    .find(c => !usedNames.has(c.name)) || { name: `WP-${Math.round(pct*100)}`, lat: p.lat, lng: p.lng };
                
                usedNames.add(nearest.name);

                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${nearest.lat}&longitude=${nearest.lng}&hourly=temperature_2m,weather_code,wind_speed_10m,visibility&wind_speed_unit=kmh&timezone=auto`);
                    const data = await res.json();
                    const i = Math.max(0, data.hourly.time.indexOf(arrival.toISOString().split(':')[0] + ":00"));
                    const code = data.hourly.weather_code[i];
                    
                    return {
                        name: nearest.name, lat: nearest.lat, lng: nearest.lng, order: idx,
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
                L.marker([d.lat, d.lng], {
                    icon: L.divIcon({
                        className: '',
                        html: `<div class="glass-node">
                                <div class="glass-header">${d.name}</div>
                                <div class="glass-body">
                                    <span style="font-size:14px;">${d.skyIcon}</span>
                                    <span class="glass-temp-val">${d.temp}°</span>
                                </div>
                               </div>`,
                        iconSize: [85, 45], iconAnchor: [42, 22]
                    })
                }).addTo(state.layer);

                rows += `<tr>
                    <td style="padding:6px; border-bottom:1px solid #222; font-weight:bold; color:#FFD700;">${d.name}</td>
                    <td style="border-bottom:1px solid #222;">${d.eta}Z</td>
                    <td style="border-bottom:1px solid #222;">${d.temp}°C</td>
                    <td style="border-bottom:1px solid #222;">${d.wind} KM/H</td>
                    <td style="border-bottom:1px solid #222;">${d.vis} KM</td>
                    <td style="border-bottom:1px solid #222; font-size:9px; letter-spacing:1px;">${d.skyText}</td>
                </tr>`;
            });
            document.getElementById('matrix-body').innerHTML = rows;
        };

        return {
            init: () => {
                state.layer.addTo(window.map);
                if(!document.getElementById('matrix-ui')) {
                    document.body.insertAdjacentHTML('beforeend', `
                        <div id="matrix-ui" style="position:fixed; bottom:20px; left:20px; z-index:10000; font-family:monospace; pointer-events:none;">
                            <div style="background:rgba(5,5,5,0.98); border-left:3px solid #FFD700; width:500px; padding:12px; pointer-events:auto;">
                                <div style="color:#FFD700; font-size:10px; font-weight:bold; margin-bottom:8px; letter-spacing:2px;">MISSION WEATHER MATRIX // TEXT ONLY</div>
                                <table style="width:100%; color:#fff; font-size:10px; text-align:left; border-collapse:collapse;">
                                    <thead><tr style="color:#555; text-transform:uppercase; font-size:8px;">
                                        <th>LOCATION</th><th>ETA</th><th>TEMP</th><th>WIND</th><th>VIS</th><th>SKY</th>
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
