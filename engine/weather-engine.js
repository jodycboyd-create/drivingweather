/** * Project: [weong-bulletin] | L3 HYPER-SYNC PATCH 005
 * Focus: Center-Screen Loading UI + Aggressive Velocity Sync
 * Date: 2025-12-31
 */

(function() {
    // 1. INJECT REFINED STYLES
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(10, 10, 10, 0.95);
            backdrop-filter: blur(8px);
            border: 1px solid #FFD700; border-radius: 4px;
            display: flex; flex-direction: column; width: 95px; color: #fff;
            box-shadow: 0 4px 20px rgba(0,0,0,0.8);
        }
        .glass-label { 
            font-size: 8px; background: #FFD700; color: #000; 
            text-align: center; font-weight: bold; padding: 3px 0;
            white-space: nowrap; overflow: hidden; text-transform: uppercase;
        }
        .glass-body { padding: 6px; text-align: center; line-height: 1.2; }
        .glass-temp { font-size: 16px; font-weight: 900; color: #FFD700; }
        .glass-meta { font-size: 9px; color: #ccc; margin-top: 2px; }
        
        /* PROMINENT CENTER LOADING INDICATOR */
        #weong-loading-overlay {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9); color: #FFD700;
            padding: 20px 40px; border: 2px solid #FFD700;
            font-family: monospace; z-index: 200000; font-weight: bold;
            display: none; font-size: 14px; letter-spacing: 3px;
            box-shadow: 0 0 50px rgba(255, 215, 0, 0.3);
            pointer-events: none; text-align: center;
        }
        .loading-dots:after { content: '...'; animation: dots 1.5s steps(3, end) infinite; }
        @keyframes dots { 0%, 20% { content: '.'; } 40% { content: '..'; } 60% { content: '...'; } }
    `;
    document.head.appendChild(style);

    const WeatherEngine = (function() {
        const state = {
            layer: L.layerGroup(),
            lastSignature: "",
            isSyncing: false,
            hubs: [
                { name: "P.A.B", lat: 47.57, lng: -59.13 },
                { name: "Corner Brook", lat: 48.95, lng: -57.94 },
                { name: "Grand Falls", lat: 48.93, lng: -55.65 },
                { name: "Gander", lat: 48.95, lng: -54.61 },
                { name: "Clarenville", lat: 48.16, lng: -53.96 },
                { name: "Whitbourne", lat: 47.42, lng: -53.52 },
                { name: "St. John's", lat: 47.56, lng: -52.71 }
            ]
        };

        const getVisibilityNote = (visKm, code) => {
            if (visKm <= 1) return "Dense Fog"; // Specifically for St. John's error
            if (visKm <= 3) return "Mist/Haze";
            if (code >= 70) return "Snowing";
            if (code >= 60) return "Raining";
            return "Clear Skies";
        };

        const syncVelocityMetrics = (dist, speed) => {
            const durHours = dist / (speed || 1);
            const h = Math.floor(durHours);
            const m = Math.round((durHours - h) * 60);
            
            // Aggressive DOM find for Velocity Widget
            const durVal = document.querySelector('.mission-dur-value');
            const distVal = document.querySelector('.mission-dist-value'); // Assuming common class pattern
            
            if (durVal) durVal.innerText = `${h}H ${m}M`;
            if (distVal) distVal.innerText = `${dist.toFixed(1)} KM`;
        };

        const refresh = async () => {
            if (state.isSyncing || !window.map) return;

            const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 5);
            if (!route) return;

            const coords = route.getLatLngs();
            const start = coords[0];
            const end = coords[coords.length - 1];
            const speed = window.currentCruisingSpeed || 100;
            const dist = window.currentRouteDistance || 0;

            // signature ensures icons move when pins move
            const currentSignature = `${start.lat.toFixed(4)}-${end.lat.toFixed(4)}-${speed}-${dist}`;
            if (currentSignature === state.lastSignature) return;

            state.isSyncing = true;
            state.lastSignature = currentSignature;
            
            const loader = document.getElementById('weong-loading-overlay');
            if (loader) loader.style.display = 'block';

            syncVelocityMetrics(dist, speed);

            const intervals = [0.05, 0.25, 0.5, 0.75, 0.95];
            const usedHubs = new Set();

            const waypoints = await Promise.all(intervals.map(async (pct) => {
                const idx = Math.floor((coords.length - 1) * pct);
                const p = coords[idx];
                const arrival = new Date((window.currentDepartureTime || new Date()).getTime() + ((pct * dist) / speed) * 3600000);

                let closest = state.hubs.reduce((prev, curr) => 
                    Math.hypot(p.lat - curr.lat, p.lng - curr.lng) < Math.hypot(p.lat - prev.lat, p.lng - prev.lng) ? curr : prev
                );

                let label = closest.name;
                if (usedHubs.has(label)) label += " (SEC)"; // Prevent double labeling
                usedHubs.add(label);

                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=temperature_2m,weather_code,wind_speed_10m,visibility&wind_speed_unit=kmh&timezone=auto`);
                    const data = await res.json();
                    const i = Math.max(0, data.hourly.time.indexOf(arrival.toISOString().split(':')[0] + ":00"));

                    return {
                        label, lat: p.lat, lng: p.lng,
                        temp: Math.round(data.hourly.temperature_2m[i]),
                        wind: Math.round(data.hourly.wind_speed_10m[i]),
                        vis: Math.round(data.hourly.visibility[i] / 1000),
                        code: data.hourly.weather_code[i],
                        eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    };
                } catch (e) { return null; }
            }));

            render(waypoints.filter(w => w));
            if (loader) loader.style.display = 'none';
            state.isSyncing = false;
        };

        const render = (data) => {
            state.layer.clearLayers();
            let html = "";
            data.forEach(d => {
                const condition = getVisibilityNote(d.vis, d.code);
                
                L.marker([d.lat, d.lng], {
                    icon: L.divIcon({
                        className: '',
                        html: `<div class="glass-node">
                                <div class="glass-label">${d.label}</div>
                                <div class="glass-body">
                                    <div class="glass-temp">${d.temp}°C</div>
                                    <div class="glass-meta">${d.wind}kmh | ${d.vis}km</div>
                                </div>
                               </div>`,
                        iconSize: [95, 60]
                    })
                }).addTo(state.layer);

                html += `<tr>
                    <td>${d.label}</td><td>${d.eta}</td>
                    <td style="color:#FFD700; font-weight:bold;">${d.temp}°C</td>
                    <td>${d.wind} km/h</td><td>${d.vis} km</td>
                    <td>${condition}</td>
                </tr>`;
            });
            document.getElementById('bulletin-rows').innerHTML = html;
        };

        return {
            init: () => {
                state.layer.addTo(window.map);
                document.body.insertAdjacentHTML('beforeend', `
                    <div id="weong-loading-overlay">INITIALIZING MISSION METRICS<span class="loading-dots"></span></div>
                    <div id="bulletin-ui" style="position:fixed; bottom:20px; left:20px; z-index:100000; font-family:monospace;">
                        <div id="bulletin-modal" style="background:rgba(0,0,0,0.95); border:1px solid #FFD700; width:600px; padding:15px; box-shadow: 0 0 30px #000;">
                            <div style="color:#FFD700; border-bottom:1px solid #FFD700; margin-bottom:10px; font-weight:bold; letter-spacing:2px; font-size:12px;">NL ROUTE WEATHER MATRIX</div>
                            <table style="width:100%; color:#fff; font-size:11px; text-align:left;">
                                <thead><tr style="color:#FFD700;"><th>HUB</th><th>ETA</th><th>TEMP</th><th>WIND</th><th>VIS</th><th>CONDITION</th></tr></thead>
                                <tbody id="bulletin-rows"></tbody>
                            </table>
                        </div>
                    </div>
                `);
                setInterval(refresh, 2500);
            }
        };
    })();

    window.WeatherEngine = WeatherEngine;
    WeatherEngine.init();
})();
