/** * Project: [weong-bulletin] | L3 FINAL INTEGRATED BUILD
 * Fixes: Marker Duplication, Visibility Restrictors, Global Velocity Sync
 * Date: 2025-12-31
 */

(function() {
    // 1. INJECT STYLES (Refined for visibility and scale)
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(10, 10, 10, 0.9);
            backdrop-filter: blur(10px);
            border: 1px solid #FFD700; border-radius: 6px;
            display: flex; flex-direction: column; width: 85px; color: #fff;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }
        .glass-label { 
            font-size: 8px; background: #FFD700; color: #000; 
            text-align: center; font-weight: bold; padding: 2px 0;
        }
        .glass-content { padding: 5px; text-align: center; }
        .glass-temp { font-size: 14px; font-weight: 900; color: #FFD700; }
        .glass-sub { font-size: 9px; opacity: 0.8; }
        
        #weong-status-bar {
            position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%);
            background: #000; color: #FFD700; padding: 8px 20px;
            border: 1px solid #FFD700; font-family: monospace; z-index: 100000;
            display: none; font-size: 10px;
        }
    `;
    document.head.appendChild(style);

    const WeatherEngine = (function() {
        const state = {
            layer: L.layerGroup(),
            anchorKey: null,
            isLocked: false,
            // Core NL Hubs for naming
            hubs: [
                { name: "Port aux Basques", lat: 47.57, lng: -59.13 },
                { name: "Corner Brook", lat: 48.95, lng: -57.94 },
                { name: "Grand Falls", lat: 48.93, lng: -55.65 },
                { name: "Gander", lat: 48.95, lng: -54.61 },
                { name: "Clarenville", lat: 48.16, lng: -53.96 },
                { name: "Whitbourne", lat: 47.42, lng: -53.52 },
                { name: "St. John's", lat: 47.56, lng: -52.71 }
            ],
            partitions: [0.05, 0.28, 0.50, 0.72, 0.95]
        };

        const getVisibilityRestrictor = (visKm, temp) => {
            if (visKm > 5) return "Clear";
            if (visKm <= 1 && temp <= 0) return "Freezing Fog";
            if (visKm <= 1) return "Dense Fog";
            if (visKm <= 3) return "Mist";
            return "Haze";
        };

        const syncCycle = async () => {
            if (state.isLocked || !window.map) return;
            
            // 1. ATTACH TO VELOCITY WIDGET & ROUTE ENGINE
            const routeLayer = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 0);
            if (!routeLayer) return;

            const speed = window.currentCruisingSpeed || 100;
            const dist = window.currentRouteDistance || 0;
            const depTime = window.currentDepartureTime || new Date();
            
            // 2. UPDATE VELOCITY WIDGET METRICS MANUALLY IF STUCK
            const durHours = dist / (speed || 1);
            const totalMin = durHours * 60;
            const h = Math.floor(totalMin / 60);
            const m = Math.round(totalMin % 60);
            
            const durEl = document.querySelector('.mission-dur-value'); // Adjust selector to your widget
            if (durEl) durEl.innerText = `${h}H ${m}M`;

            const currentKey = `${dist}-${speed}-${depTime.getHours()}`;
            if (currentKey === state.anchorKey) return;
            state.anchorKey = currentKey;

            const status = document.getElementById('weong-status-bar');
            if (status) status.style.display = 'block';

            const coords = routeLayer.getLatLngs();
            const usedNames = new Set();

            const waypoints = await Promise.all(state.partitions.map(async (pct) => {
                const idx = Math.floor((coords.length - 1) * pct);
                const p = coords[idx];
                
                // Naming with De-duplication
                let hub = state.hubs.reduce((prev, curr) => 
                    Math.hypot(p.lat - curr.lat, p.lng - curr.lng) < Math.hypot(p.lat - prev.lat, p.lng - prev.lng) ? curr : prev
                );
                
                let displayName = hub.name;
                if (usedNames.has(displayName)) displayName += " (Sec)";
                usedNames.add(displayName);

                try {
                    const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=temperature_2m,weather_code,wind_speed_10m,visibility&wind_speed_unit=kmh&timezone=auto`;
                    const res = await fetch(url);
                    const json = await res.json();
                    
                    const arrival = new Date(depTime.getTime() + ((pct * dist) / speed) * 3600000);
                    const target = arrival.toISOString().split(':')[0] + ":00";
                    const i = Math.max(0, json.hourly.time.indexOf(target));

                    const temp = Math.round(json.hourly.temperature_2m[i]);
                    const vis = Math.round(json.hourly.visibility[i] / 1000);

                    return {
                        name: displayName, lat: p.lat, lng: p.lng,
                        temp, vis,
                        wind: Math.round(json.hourly.wind_speed_10m[i]),
                        restrictor: getVisibilityRestrictor(vis, temp),
                        eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    };
                } catch (e) { return null; }
            }));

            render(waypoints.filter(w => w !== null));
            if (status) status.style.display = 'none';
        };

        const render = (data) => {
            state.layer.clearLayers();
            let html = "";
            data.forEach(wp => {
                L.marker([wp.lat, wp.lng], {
                    icon: L.divIcon({
                        className: '',
                        html: `<div class="glass-node">
                                <div class="glass-label">${wp.name}</div>
                                <div class="glass-content">
                                    <div class="glass-temp">${wp.temp}°C</div>
                                    <div class="glass-sub">${wp.wind}kmh | ${wp.vis}km</div>
                                </div>
                               </div>`,
                        iconSize: [85, 55]
                    })
                }).addTo(state.layer);

                html += `<tr>
                    <td>${wp.name}</td><td>${wp.eta}</td>
                    <td style="color:#FFD700;">${wp.temp}°C</td>
                    <td>${wp.wind} km/h</td><td>${wp.vis} km</td>
                    <td>${wp.restrictor}</td>
                </tr>`;
            });
            const rows = document.getElementById('bulletin-rows');
            if (rows) rows.innerHTML = html;
        };

        return { 
            init: () => { 
                state.layer.addTo(window.map);
                initUI();
                setInterval(syncCycle, 3000); 
            }
        };

        function initUI() {
            const ui = `
                <div id="weong-status-bar">REFRESHING L3 MISSION...</div>
                <div id="bulletin-ui" style="position:fixed; bottom:20px; left:20px; z-index:99999; font-family:monospace;">
                    <div id="bulletin-modal" style="background:rgba(0,0,0,0.9); border:1px solid #FFD700; width:600px; padding:15px;">
                        <div style="color:#FFD700; border-bottom:1px solid #FFD700; margin-bottom:10px; font-weight:bold;">NL MISSION MATRIX</div>
                        <table style="width:100%; color:#fff; font-size:11px; text-align:left;">
                            <thead><tr style="color:#FFD700;"><th>HUB</th><th>ETA</th><th>TEMP</th><th>WIND</th><th>VIS</th><th>CONDITION</th></tr></thead>
                            <tbody id="bulletin-rows"></tbody>
                        </table>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', ui);
        }
    })();

    window.WeatherEngine = WeatherEngine;
    WeatherEngine.init();
})();
