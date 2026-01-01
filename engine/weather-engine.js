/** * Project: [weong-bulletin] 
 * Logic: L3 Floating HUD - High-Vis Toggles
 * Fix: Explicit Polyline-Index Sorting & Hub Calibration
 * Status: UX Real-Estate Optimization [cite: 2025-12-31]
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(15, 15, 15, 0.85); backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 215, 0, 0.6); border-radius: 8px;
            display: flex; flex-direction: column; width: 100px; color: #fff;
            box-shadow: 0 8px 32px rgba(0,0,0,0.7); overflow: hidden;
        }
        .glass-header {
            background: rgba(255, 215, 0, 0.9); color: #000;
            font-size: 8px; font-weight: bold; text-align: center;
            padding: 2px 0; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .glass-body {
            display: flex; align-items: center; justify-content: space-around;
            padding: 4px; height: 35px;
        }
        .glass-sky-icon { font-size: 18px; }
        .glass-temp-val { font-size: 16px; font-weight: 900; color: #FFD700; }
    `;
    document.head.appendChild(style);

    const WeatherEngine = (function() {
        const state = {
            layer: L.layerGroup(),
            lastSignature: "",
            isSyncing: false,
            // Strict coordinates to prevent Atlantic drifting
            hubs: [
                { name: "Port aux Basques", lat: 47.57, lng: -59.13 },
                { name: "Corner Brook", lat: 48.95, lng: -57.94 },
                { name: "Grand Falls", lat: 48.93, lng: -55.65 },
                { name: "Gander", lat: 48.95, lng: -54.61 },
                { name: "Clarenville", lat: 48.16, lng: -53.96 },
                { name: "St. John's", lat: 47.56, lng: -52.71 }
            ]
        };

        const getSkyData = (code) => {
            const map = {
                0: { icon: "☀️", txt: "Clear" },
                1: { icon: "🌤️", txt: "Mainly Clear" },
                2: { icon: "⛅", txt: "Partly Cloudy" },
                3: { icon: "☁️", txt: "Overcast" },
                45: { icon: "🌫️", txt: "Fog" },
                61: { icon: "🌧️", txt: "Light Rain" },
                71: { icon: "❄️", txt: "Light Snow" }
            };
            return map[code] || { icon: "☁️", txt: "Cloudy" };
        };

        const getWindDir = (deg) => {
            const sectors = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
            return sectors[Math.round(deg / 45) % 8];
        };

        const refresh = async () => {
            if (state.isSyncing || !window.map) return;

            const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
            if (!route) return;

            const coords = route.getLatLngs();
            const speed = window.currentCruisingSpeed || 100;
            const dist = window.currentRouteDistance || 0;
            const depTime = window.currentDepartureTime || new Date();

            // Signature check includes time to ensure reactivity to the clock
            const signature = `${coords[0].lat.toFixed(3)}-${speed}-${dist}-${depTime.getTime()}`;
            if (signature === state.lastSignature) return;

            state.isSyncing = true;
            state.lastSignature = signature;

            const usedNames = new Set();
            const partitions = [0.05, 0.25, 0.50, 0.75, 0.95];

            let waypoints = await Promise.all(partitions.map(async (pct) => {
                const routeIndex = Math.floor((coords.length - 1) * pct);
                const p = coords[routeIndex];
                const travelTimeMs = ((pct * dist) / speed) * 3600000;
                const arrival = new Date(depTime.getTime() + travelTimeMs);

                // Spatial Lock: Find the closest HUB name for the label
                let pool = [...state.hubs].sort((a, b) => 
                    Math.hypot(p.lat - a.lat, p.lng - a.lng) - Math.hypot(p.lat - b.lat, p.lng - b.lng)
                );
                let choice = pool.find(h => !usedNames.has(h.name)) || pool[0];
                usedNames.add(choice.name);

                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,visibility&wind_speed_unit=kmh&timezone=auto`);
                    const data = await res.json();
                    const targetStr = arrival.toISOString().split(':')[0] + ":00";
                    const i = Math.max(0, data.hourly.time.indexOf(targetStr));
                    const sky = getSkyData(data.hourly.weather_code[i]);

                    return {
                        name: choice.name, lat: p.lat, lng: p.lng,
                        routeOrder: routeIndex, // Critical for chronological sorting
                        temp: Math.round(data.hourly.temperature_2m[i]),
                        windSpd: Math.round(data.hourly.wind_speed_10m[i]),
                        windDir: getWindDir(data.hourly.wind_direction_10m[i]),
                        vis: Math.round(data.hourly.visibility[i] / 1000),
                        skyIcon: sky.icon,
                        skyTxt: sky.txt,
                        eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    };
                } catch (e) { return null; }
            }));

            // FINAL SORT: Force chronological pathing
            waypoints = waypoints.filter(w => w).sort((a, b) => a.routeOrder - b.routeOrder);

            state.layer.clearLayers();
            let html = "";
            waypoints.forEach(d => {
                L.marker([d.lat, d.lng], {
                    icon: L.divIcon({
                        className: '',
                        html: `<div class="glass-node">
                                <div class="glass-header">${d.name}</div>
                                <div class="glass-body">
                                    <span class="glass-sky-icon">${d.skyIcon}</span>
                                    <span class="glass-temp-val">${d.temp}°</span>
                                </div>
                               </div>`,
                        iconSize: [100, 50], iconAnchor: [50, 25]
                    })
                }).addTo(state.layer);

                html += `<tr>
                    <td>${d.name}</td><td>${d.eta}</td>
                    <td style="color:#FFD700;">${d.temp}°C</td>
                    <td>${d.windDir} ${d.windSpd} km/h</td><td>${d.vis} km</td>
                    <td>${d.skyIcon} ${d.skyTxt}</td>
                </tr>`;
            });
            document.getElementById('bulletin-rows').innerHTML = html;
            state.isSyncing = false;
        };

        return {
            init: () => {
                state.layer.addTo(window.map);
                setInterval(refresh, 2500);
            }
        };
    })();

    window.WeatherEngine = WeatherEngine;
    WeatherEngine.init();
})();
