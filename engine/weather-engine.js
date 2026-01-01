/** * Project: [weong-bulletin] | L3 FINAL INTEGRATED BUILD
 * Fixes: Marker Drift, Double Hubs, Velocity Linkage, Glassmorph UI
 * Date: 2025-12-31
 */

(function() {
    // 1. INJECT REFINED STYLES
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(15, 15, 15, 0.85);
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 215, 0, 0.4); border-radius: 10px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.9);
            display: flex; flex-direction: column; align-items: center;
            width: 75px; min-height: 65px; color: #fff; overflow: hidden;
        }
        .glass-label { 
            font-size: 8px; background: #FFD700; color: #000; 
            width: 100%; text-align: center; font-weight: bold; 
            padding: 3px 0; text-transform: uppercase;
        }
        .glass-main { display: flex; align-items: center; justify-content: space-around; width: 100%; padding: 5px 0; }
        .glass-sky { font-size: 24px; }
        .glass-temp { font-size: 14px; font-weight: 900; color: #fff; }
        
        #weong-status-bar {
            position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%);
            background: rgba(0,0,0,0.95); color: #FFD700; padding: 10px 25px;
            border: 1px solid #FFD700; border-radius: 4px; font-family: monospace;
            z-index: 100000; display: none; font-size: 11px; letter-spacing: 2px;
            box-shadow: 0 0 20px rgba(255,215,0,0.2);
        }
    `;
    document.head.appendChild(style);

    const WeatherEngine = (function() {
        const state = {
            layer: L.layerGroup(),
            anchorKey: null,
            isLocked: false,
            isOpen: false,
            // Strategic Hubs for Naming Only (Markers stay on road)
            hubs: [
                { name: "Port aux Basques", lat: 47.57, lng: -59.13 },
                { name: "Corner Brook", lat: 48.95, lng: -57.94 },
                { name: "Grand Falls-Windsor", lat: 48.93, lng: -55.65 },
                { name: "Gander", lat: 48.95, lng: -54.61 },
                { name: "Clarenville", lat: 48.16, lng: -53.96 },
                { name: "Whitbourne", lat: 47.42, lng: -53.52 },
                { name: "St. John's Metro", lat: 47.56, lng: -52.71 }
            ],
            partitions: [0.05, 0.25, 0.50, 0.75, 0.95]
        };

        const getSkyDetails = (code, hour) => {
            const isNight = hour >= 18 || hour <= 7;
            const map = {
                0: { txt: "Clear", icon: isNight ? "🌙" : "☀️" },
                1: { txt: "Mainly Clear", icon: isNight ? "🌙" : "🌤️" },
                2: { txt: "Partly Cloudy", icon: isNight ? "☁️" : "⛅" },
                3: { txt: "Overcast", icon: "☁️" },
                61: { txt: "Light Rain", icon: "🌧️" },
                71: { txt: "Light Snow", icon: "❄️" }
            };
            return map[code] || { txt: "Cloudy", icon: "☁️" };
        };

        const syncCycle = async () => {
            if (state.isLocked || !window.map) return;
            
            // Link to Route Data
            const route = Object.values(window.map._layers).find(l => 
                l.feature?.geometry?.type === "LineString" || (l._latlngs && l._latlngs.length > 0)
            );
            if (!route) return;

            const coords = route.feature ? route.feature.geometry.coordinates : route.getLatLngs().map(p => [p.lng, p.lat]);
            const speed = window.currentCruisingSpeed || 100;
            const depTime = window.currentDepartureTime || new Date();
            const totalDist = window.currentRouteDistance || 0;
            
            // KEY FIX: Include distance in key to trigger update on pin moves
            const currentKey = `${coords.length}-${totalDist}-${speed}-${depTime.getHours()}`;
            if (currentKey === state.anchorKey) return;

            state.isLocked = true;
            state.anchorKey = currentKey;

            const status = document.getElementById('weong-status-bar');
            if (status) status.style.display = 'block';

            const waypoints = await Promise.all(state.partitions.map(async (pct) => {
                const coordIdx = Math.floor((coords.length - 1) * pct);
                const [lng, lat] = coords[coordIdx];
                
                const travelHours = (pct * totalDist) / speed; 
                const arrival = new Date(depTime.getTime() + (travelHours * 3600000));
                
                // Naming logic: find closest hub name for the current route point
                const hub = state.hubs.reduce((prev, curr) => 
                    Math.hypot(lat - curr.lat, lng - curr.lng) < Math.hypot(lat - prev.lat, lng - prev.lng) ? curr : prev
                );

                try {
                    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,weather_code,wind_speed_10m,visibility&wind_speed_unit=kmh&timezone=auto`;
                    const res = await fetch(url);
                    const json = await res.json();
                    const target = arrival.toISOString().split(':')[0] + ":00";
                    const i = Math.max(0, json.hourly.time.indexOf(target));

                    const sky = getSkyDetails(json.hourly.weather_code[i], arrival.getHours());

                    return {
                        name: hub.name, lat, lng,
                        temp: Math.round(json.hourly.temperature_2m[i]),
                        wind: Math.round(json.hourly.wind_speed_10m[i]),
                        vis: Math.round(json.hourly.visibility[i] / 1000), // Convert to KM
                        sky: sky.icon,
                        skyTxt: sky.txt,
                        eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    };
                } catch (e) { return null; }
            }));

            render(waypoints.filter(w => w !== null));
            if (status) status.style.display = 'none';
            state.isLocked = false;
        };

        const render = (data) => {
            state.layer.clearLayers();
            let html = "";
            data.forEach(wp => {
                // FIXED MARKER: strictly follows route lat/lng
                L.marker([wp.lat, wp.lng], {
                    icon: L.divIcon({
                        className: 'glass-container',
                        html: `<div class="glass-node">
                                <div class="glass-label">${wp.name}</div>
                                <div class="glass-main">
                                    <span class="glass-sky">${wp.sky}</span>
                                    <span class="glass-temp">${wp.temp}°</span>
                                </div>
                               </div>`,
                        iconSize: [75, 65]
                    })
                }).addTo(state.layer);

                html += `<tr>
                    <td>${wp.name}</td><td>${wp.eta}</td>
                    <td style="color:#FFD700; font-weight:bold;">${wp.temp}°C</td>
                    <td>${wp.wind} km/h</td><td>${wp.vis} km</td>
                    <td>${wp.sky} ${wp.skyTxt}</td>
                </tr>`;
            });
            document.getElementById('bulletin-rows').innerHTML = html;
        };

        return { 
            init: () => { 
                state.layer.addTo(window.map);
                initUI();
                setInterval(syncCycle, 2000); 
            },
            toggleModal: () => {
                state.isOpen = !state.isOpen;
                document.getElementById('bulletin-modal').style.display = state.isOpen ? 'block' : 'none';
            }
        };

        function initUI() {
            const ui = `
                <div id="weong-status-bar">CALCULATING L3 MISSION METRICS...</div>
                <div id="bulletin-ui" style="position:fixed; bottom:20px; left:20px; z-index:99999; font-family:monospace;">
                    <button onclick="WeatherEngine.toggleModal()" style="background:#000; color:#FFD700; border:1px solid #FFD700; padding:12px 25px; cursor:pointer; font-weight:bold; box-shadow: 0 0 15px rgba(0,0,0,0.5);">DETAILED TABULAR FORECAST</button>
                    <div id="bulletin-modal" style="display:none; margin-top:15px; background:rgba(10,10,10,0.98); border:1px solid #FFD700; width:650px; padding:20px; box-shadow: 0 0 30px #000;">
                        <div style="font-size:14px; font-weight:bold; color:#FFD700; border-bottom:1px solid #FFD700; padding-bottom:10px; margin-bottom:15px; letter-spacing:1px;">NL ROUTE WEATHER MATRIX</div>
                        <table style="width:100%; color:#fff; font-size:11px; text-align:left; border-collapse:collapse;">
                            <thead><tr style="color:#FFD700; text-transform:uppercase; font-size:9px;">
                                <th style="padding-bottom:10px;">Community</th><th style="padding-bottom:10px;">ETA</th>
                                <th style="padding-bottom:10px;">Temp</th><th style="padding-bottom:10px;">Wind</th>
                                <th style="padding-bottom:10px;">Vis</th><th style="padding-bottom:10px;">Sky</th>
                            </tr></thead>
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
