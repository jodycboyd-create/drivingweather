/** * Project: [weong-bulletin] | L3 HYPER-SYNC PATCH 006
 * Fix: Final Hub Exclusion (No Double Clarenville) + Center Loading
 * Date: 2025-12-31
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(10, 10, 10, 0.95); backdrop-filter: blur(8px);
            border: 1px solid #FFD700; border-radius: 4px;
            display: flex; flex-direction: column; width: 100px; color: #fff;
            box-shadow: 0 4px 20px rgba(0,0,0,0.8);
        }
        .glass-label { 
            font-size: 8px; background: #FFD700; color: #000; 
            text-align: center; font-weight: bold; padding: 3px 0;
            text-transform: uppercase; letter-spacing: 1px;
        }
        .glass-body { padding: 6px; text-align: center; }
        .glass-temp { font-size: 16px; font-weight: 900; color: #FFD700; }
        .glass-meta { font-size: 9px; color: #ccc; margin-top: 2px; font-family: monospace; }
        
        #weong-loading-overlay {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95); color: #FFD700;
            padding: 30px 60px; border: 2px solid #FFD700;
            font-family: monospace; z-index: 200000; font-weight: bold;
            display: none; font-size: 16px; letter-spacing: 4px;
            box-shadow: 0 0 100px rgba(255, 215, 0, 0.4); text-align: center;
        }
    `;
    document.head.appendChild(style);

    const WeatherEngine = (function() {
        const state = {
            layer: L.layerGroup(),
            lastSignature: "",
            isSyncing: false,
            // Expanded community list to provide alternatives when "Clarenville" is taken
            hubs: [
                { name: "Port aux Basques", lat: 47.57, lng: -59.13 },
                { name: "Stephenville", lat: 48.45, lng: -58.43 },
                { name: "Corner Brook", lat: 48.95, lng: -57.94 },
                { name: "Deer Lake", lat: 49.17, lng: -57.43 },
                { name: "Grand Falls", lat: 48.93, lng: -55.65 },
                { name: "Gander", lat: 48.95, lng: -54.61 },
                { name: "Clarenville", lat: 48.16, lng: -53.96 },
                { name: "Goobies", lat: 47.93, lng: -53.93 },
                { name: "Whitbourne", lat: 47.42, lng: -53.52 },
                { name: "Holyrood", lat: 47.38, lng: -53.12 },
                { name: "St. John's", lat: 47.56, lng: -52.71 }
            ]
        };

        const getVisibilityMetric = (visKm, temp) => {
            if (visKm <= 1) return temp <= 0 ? "Freezing Fog" : "Dense Fog";
            if (visKm <= 3) return "Mist/Haze";
            return "Clear";
        };

        const refresh = async () => {
            if (state.isSyncing || !window.map) return;

            const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
            if (!route) return;

            const coords = route.getLatLngs();
            const speed = window.currentCruisingSpeed || 100;
            const dist = window.currentRouteDistance || 0;
            
            const signature = `${coords[0].lat}-${coords[coords.length-1].lat}-${speed}-${dist}`;
            if (signature === state.lastSignature) return;

            state.isSyncing = true;
            state.lastSignature = signature;
            document.getElementById('weong-loading-overlay').style.display = 'block';

            // Reset Velocity Widget DOM
            const durHours = dist / (speed || 1);
            const durVal = document.querySelector('.mission-dur-value');
            if (durVal) durVal.innerText = `${Math.floor(durHours)}H ${Math.round((durHours % 1) * 60)}M`;

            const usedHubNames = new Set();
            const partitions = [0.05, 0.28, 0.52, 0.78, 0.95];

            const waypoints = await Promise.all(partitions.map(async (pct) => {
                const p = coords[Math.floor((coords.length - 1) * pct)];
                const arrival = new Date((window.currentDepartureTime || new Date()).getTime() + ((pct * dist) / speed) * 3600000);

                // HUB EXCLUSION LOGIC: Find nearest hub that HASN'T been used yet
                let sortedHubs = [...state.hubs].sort((a, b) => 
                    Math.hypot(p.lat - a.lat, p.lng - a.lng) - Math.hypot(p.lat - b.lat, p.lng - b.lng)
                );
                
                let selectedHub = sortedHubs.find(h => !usedHubNames.has(h.name)) || sortedHubs[0];
                usedHubNames.add(selectedHub.name);

                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=temperature_2m,weather_code,wind_speed_10m,visibility&wind_speed_unit=kmh&timezone=auto`);
                    const data = await res.json();
                    const i = Math.max(0, data.hourly.time.indexOf(arrival.toISOString().split(':')[0] + ":00"));

                    return {
                        name: selectedHub.name, lat: p.lat, lng: p.lng,
                        temp: Math.round(data.hourly.temperature_2m[i]),
                        wind: Math.round(data.hourly.wind_speed_10m[i]),
                        vis: Math.round(data.hourly.visibility[i] / 1000),
                        condition: getVisibilityMetric(Math.round(data.hourly.visibility[i] / 1000), data.hourly.temperature_2m[i]),
                        eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    };
                } catch (e) { return null; }
            }));

            render(waypoints.filter(w => w));
            document.getElementById('weong-loading-overlay').style.display = 'none';
            state.isSyncing = false;
        };

        const render = (data) => {
            state.layer.clearLayers();
            let html = "";
            data.forEach(d => {
                L.marker([d.lat, d.lng], {
                    icon: L.divIcon({
                        className: '',
                        html: `<div class="glass-node">
                                <div class="glass-label">${d.name}</div>
                                <div class="glass-body">
                                    <div class="glass-temp">${d.temp}°C</div>
                                    <div class="glass-meta">${d.wind}kmh | ${d.vis}km</div>
                                </div>
                               </div>`,
                        iconSize: [100, 60]
                    })
                }).addTo(state.layer);

                html += `<tr><td>${d.name}</td><td>${d.eta}</td><td style="color:#FFD700;">${d.temp}°C</td><td>${d.wind}k</td><td>${d.vis}km</td><td>${d.condition}</td></tr>`;
            });
            document.getElementById('bulletin-rows').innerHTML = html;
        };

        return {
            init: () => {
                state.layer.addTo(window.map);
                document.body.insertAdjacentHTML('beforeend', `
                    <div id="weong-loading-overlay">SYNCING MISSION DATA...</div>
                    <div id="bulletin-ui" style="position:fixed; bottom:20px; left:20px; z-index:100000; font-family:monospace;">
                        <div style="background:rgba(0,0,0,0.9); border:1px solid #FFD700; width:550px; padding:15px;">
                            <table style="width:100%; color:#fff; font-size:11px; text-align:left;">
                                <thead><tr style="color:#FFD700;"><th>HUB</th><th>ETA</th><th>TEMP</th><th>WIND</th><th>VIS</th><th>CONDITION</th></tr></thead>
                                <tbody id="bulletin-rows"></tbody>
                            </table>
                        </div>
                    </div>
                `);
                setInterval(refresh, 2000);
            }
        };
    })();

    window.WeatherEngine = WeatherEngine;
    WeatherEngine.init();
})();
