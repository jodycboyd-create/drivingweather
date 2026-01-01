/** * Project: [weong-bulletin] | Icon Restoration & GFS Sync
 * Methodology: L3 High-Speed Linked Sync
 * Status: Day/Night Correction + Marker Fix [cite: 2025-12-31]
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        isOpen: false,
        communities: [
            { name: "Gander", lat: 48.9578, lng: -54.6122 },
            { name: "St. John's", lat: 47.5615, lng: -52.7126 },
            { name: "Corner Brook", lat: 48.9515, lng: -57.9482 },
            { name: "Grand Falls", lat: 48.93, lng: -55.65 },
            { name: "Clarenville", lat: 48.16, lng: -53.96 }
        ],
        nodes: [0.15, 0.35, 0.55, 0.75, 0.95]
    };

    const getSkyIcon = (code, hour) => {
        const isNight = hour >= 20 || hour <= 6;
        if (code <= 1) return isNight ? { sky: "🌙", label: "Clear" } : { sky: "☀️", label: "Clear" };
        if (code <= 3) return isNight ? { sky: "☁️", label: "P.Cloudy" } : { sky: "🌤️", label: "P.Cloudy" };
        if (code <= 65) return { sky: "🌧️", label: "Rain" };
        if (code <= 75) return { sky: "❄️", label: "Snow" };
        return { sky: "☁️", label: "Overcast" };
    };

    const fetchMeteo = async (lat, lng, arrival) => {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,wind_speed_10m,weather_code&wind_speed_unit=kmh&timezone=auto`;
            const res = await fetch(url);
            const json = await res.json();
            const target = arrival.toISOString().split(':')[0] + ":00";
            const i = Math.max(0, json.hourly.time.indexOf(target));
            const weather = getSkyIcon(json.hourly.weather_code[i], arrival.getHours());

            return {
                temp: Math.round(json.hourly.temperature_2m[i]),
                wind: Math.round(json.hourly.wind_speed_10m[i]),
                sky: weather.sky,
                skyLabel: weather.label
            };
        } catch (e) { return null; }
    };

    const syncCycle = async () => {
        if (state.isLocked || !window.map) return;
        const route = Object.values(window.map._layers).find(l => 
            l.feature?.geometry?.type === "LineString" || (l._latlngs && l._latlngs.length > 0)
        );
        if (!route) return;

        const coords = route.feature ? route.feature.geometry.coordinates : route.getLatLngs().map(p => [p.lng, p.lat]);
        const currentKey = `${coords[0][0].toFixed(3)}-${coords.length}-${window.currentCruisingSpeed}`;
        if (currentKey === state.anchorKey) return;

        state.isLocked = true;
        const btn = document.getElementById('btn-open-bulletin');
        const rows = document.getElementById('bulletin-rows');
        if (btn) btn.innerHTML = 'SYNCING METEO <span class="loader-dot"></span>';
        
        state.anchorKey = currentKey;
        const speed = window.currentCruisingSpeed || 100; 
        const depTime = window.currentDepartureTime || new Date();

        const waypoints = await Promise.all(state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            const travelHours = (pct * 400) / speed; // Distance factor for NL
            const arrival = new Date(depTime.getTime() + (travelHours * 3600000));
            
            const nearest = state.communities.reduce((prev, curr) => 
                Math.hypot(lat - curr.lat, lng - curr.lng) < Math.hypot(lat - prev.lat, lng - prev.lng) ? curr : prev
            );

            const weather = await fetchMeteo(lat, lng, arrival);
            return { ...nearest, lat, lng, arrival, variant: weather, eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
        }));

        render(waypoints, btn);
        state.isLocked = false;
    };

    const render = (data, btn) => {
        state.layer.clearLayers();
        if (btn) btn.innerHTML = 'DETAILED TABULAR FORECAST';
        
        let html = "";
        data.forEach(wp => {
            const v = wp.variant || { temp: '?', wind: '?', sky: '⚠️', skyLabel: 'OFFLINE' };
            
            // Marker Injection - Forced Render
            L.marker([wp.lat, wp.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div style="background:rgba(0,0,0,0.9); border:2px solid #FFD700; color:#FFD700; width:65px; height:55px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 0 10px #000;">
                            <span style="font-size:7px; background:#FFD700; color:#000; width:100%; text-align:center; white-space:nowrap; overflow:hidden;">${wp.name}</span>
                            <span style="font-size:18px;">${v.sky}</span>
                            <span style="font-size:11px; font-weight:bold;">${v.temp}°</span>
                        </div>`,
                    iconSize: [65, 55]
                })
            }).addTo(state.layer);

            // Row Injection
            html += `<tr style="border-bottom:1px solid #222;">
                <td>${wp.name}</td><td>${wp.eta}</td>
                <td style="color:${v.temp <= 0 ? '#00d4ff' : '#ff4500'}">${v.temp}°C</td>
                <td>${v.wind} km/h</td><td>LIVE</td>
                <td>${v.skyLabel} ${v.sky}</td>
            </tr>`;
        });

        const rows = document.getElementById('bulletin-rows');
        if (rows) rows.innerHTML = html;
    };

    return {
        init: () => {
            state.layer.addTo(window.map);
            setInterval(syncCycle, 3000);
            syncCycle();
        }
    };
})();

WeatherEngine.init();
