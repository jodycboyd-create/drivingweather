/** * Project: [weong-bulletin]
 * Architecture: Temporal-Spatial HRDPS Registry
 * Strategy: Buffer Lead-Times per Geographic Node
 * Status: Robust Base Build [cite: 2025-12-31]
 */

const WeatherRegistry = (function() {
    // Cache for Canada-wide point data { "lat_lng": { "hour": { data } } }
    const cache = new Map();

    return {
        fetchPoint: async function(lat, lng) {
            const key = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
            if (cache.has(key)) return cache.get(key);

            try {
                // Precision Point Fetch for HRDPS [cite: 2025-12-31]
                const url = `https://api.weather.gc.ca/met/city/v1/coverage/hrdps/point?lat=${lat}&lon=${lng}&format=json`;
                const response = await fetch(url);
                const raw = await response.json();

                const temporalData = {};
                raw.forecasts.forEach(f => {
                    const date = new Date(f.time);
                    temporalData[date.getHours()] = {
                        temp: Math.round(f.temperature),
                        wind: Math.round(f.wind_speed),
                        vis:  f.visibility,
                        sky:  `https://weather.gc.ca/weathericons/${f.icon_code}.gif`,
                        cond: f.condition
                    };
                });

                cache.set(key, temporalData);
                return temporalData;
            } catch (e) {
                console.error("WEONG Registry: Fetch Error", e);
                return null;
            }
        },
        clear: () => cache.clear()
    };
})();

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        nodes: [0, 0.25, 0.5, 0.75, 1.0] // 5-Point Diagnostic Matrix
    };

    const sync = async () => {
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString" || l._latlngs);
        if (!route || !window.map) return;

        const coords = route.feature ? route.feature.geometry.coordinates.map(c => [c[1], c[0]]) : route._latlngs;
        const speed = window.currentCruisingSpeed || 100;
        const start = window.currentDepartureTime || new Date();

        let totalDist = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            totalDist += L.latLng(coords[i]).distanceTo(L.latLng(coords[i+1]));
        }
        const totalKm = totalDist / 1000;

        // Map waypoints to their specific arrival times
        const waypointTasks = state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const pos = coords[idx];
            const lat = pos.lat || pos[0];
            const lng = pos.lng || pos[1];
            
            const hoursIn = (totalKm * pct) / speed;
            const arrivalTime = new Date(start.getTime() + (hoursIn * 3600000));
            const targetHour = arrivalTime.getHours();

            const fullForecast = await WeatherRegistry.fetchPoint(lat, lng);
            const data = fullForecast ? fullForecast[targetHour] : null;

            return {
                pos: [lat, lng],
                eta: arrivalTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                weather: data || { temp: "--", wind: "--", vis: "--", sky: "", cond: "FETCHING..." }
            };
        });

        const results = await Promise.all(waypointTasks);
        render(results);
    };

    const render = (wps) => {
        state.layer.clearLayers();
        let html = "";

        wps.forEach((wp, i) => {
            // Map Node Rendering
            L.marker(wp.pos, {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div style="background:rgba(0,0,0,0.8); border:1px solid #FFD700; border-radius:8px; width:50px; height:50px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff;">
                        <img src="${wp.weather.sky}" style="width:18px; height:18px;" onerror="this.style.opacity=0">
                        <b style="font-size:11px;">${wp.weather.temp}°</b>
                    </div>`,
                    iconSize: [50, 50], iconAnchor: [25, 25]
                })
            }).addTo(state.layer);

            // Table Row
            html += `<tr style="border-bottom:1px solid rgba(255,215,0,0.1);">
                <td style="padding:8px 0;">PT ${i+1}</td>
                <td style="opacity:0.6;">${wp.eta}</td>
                <td style="color:#FFD700; font-weight:bold;">${wp.weather.temp}°C</td>
                <td>${wp.weather.wind} km/h</td>
                <td>${wp.weather.vis} km</td>
                <td>${wp.weather.cond}</td>
            </tr>`;
        });

        const table = document.getElementById('weong-table-body');
        if (table) table.innerHTML = html;
    };

    return {
        init: function() {
            state.layer.addTo(window.map);
            setInterval(sync, 5000); // 5s Refresh Cycle
        }
    };
})();

WeatherEngine.init();
