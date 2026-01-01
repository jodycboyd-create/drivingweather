/** * Project: [weong-bulletin] | Precision Route Lock
 * Methodology: L3 Unique-Node Identification
 * Status: Drift Fix + Duplicate Resolution [cite: 2025-12-31]
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        nodes: [0.12, 0.32, 0.52, 0.72, 0.92] // Offset nodes to avoid exact town-center overlaps
    };

    // Refined NL Community Sectors for smarter labeling
    const getRegionName = (lat, lng) => {
        if (lng < -57.5) return "West Coast / CB";
        if (lng < -55.5) return "Central / GF-W";
        if (lng < -54.3) return "Gander Region";
        if (lng < -53.5) return "Clarenville Area";
        return "Avalon Peninsula";
    };

    const getSkyIcon = (code, hour) => {
        const isNight = hour >= 18 || hour <= 7; 
        if (code <= 1) return isNight ? { sky: "🌙", label: "Clear" } : { sky: "☀️", label: "Clear" };
        if (code <= 3) return isNight ? { sky: "☁️", label: "P.Cloudy" } : { sky: "🌤️", label: "P.Cloudy" };
        if (code <= 65) return { sky: "🌧️", label: "Rain" };
        if (code <= 75) return { sky: "❄️", label: "Snow" };
        return { sky: "☁️", label: "Overcast" };
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
        state.anchorKey = currentKey;

        // Visual Feedback: Loading State [cite: 2025-12-31]
        const btn = document.getElementById('btn-open-bulletin');
        if (btn) btn.innerHTML = 'SYNCING LIVE NL DATA <span class="loader-dot"></span>';

        const speed = window.currentCruisingSpeed || 100; 
        const depTime = window.currentDepartureTime || new Date();

        const waypoints = await Promise.all(state.nodes.map(async (pct, idx) => {
            const coordIdx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[coordIdx]; 
            
            const travelHours = (pct * 480) / speed; 
            const arrival = new Date(depTime.getTime() + (travelHours * 3600000));
            
            // Unique identification to prevent "Two Clarenvilles" [cite: 2025-12-31]
            const region = getRegionName(lat, lng);
            const waypointID = `Sector ${idx + 1}: ${region}`;

            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,wind_speed_10m,weather_code&wind_speed_unit=kmh&timezone=auto`;
                const res = await fetch(url);
                const json = await res.json();
                const target = arrival.toISOString().split(':')[0] + ":00";
                const hIndex = Math.max(0, json.hourly.time.indexOf(target));
                const weather = getSkyIcon(json.hourly.weather_code[hIndex], arrival.getHours());

                return { 
                    name: waypointID, 
                    lat, lng, 
                    eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    variant: {
                        temp: Math.round(json.hourly.temperature_2m[hIndex]),
                        wind: Math.round(json.hourly.wind_speed_10m[hIndex]),
                        sky: weather.sky,
                        skyLabel: weather.label
                    }
                };
            } catch (e) { return null; }
        }));

        render(waypoints.filter(w => w !== null), btn);
        state.isLocked = false;
    };

    const render = (data, btn) => {
        state.layer.clearLayers();
        if (btn) btn.innerHTML = 'DETAILED TABULAR FORECAST';
        
        let html = "";
        data.forEach(wp => {
            // FIX: Marker position is strictly locked to route coordinate [cite: 2025-12-31]
            L.marker([wp.lat, wp.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div style="background:rgba(0,0,0,0.95); border:1px solid #FFD700; color:#FFD700; width:70px; height:55px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 0 15px #000;">
                            <span style="font-size:6px; background:#FFD700; color:#000; width:100%; text-align:center; white-space:nowrap; overflow:hidden; font-weight:bold;">${wp.name}</span>
                            <span style="font-size:18px;">${wp.variant.sky}</span>
                            <div style="font-size:10px; font-weight:bold;">${wp.variant.temp}° | ${wp.variant.wind}k</div>
                        </div>`,
                    iconSize: [70, 55]
                })
            }).addTo(state.layer);

            html += `<tr>
                <td>${wp.name}</td><td>${wp.eta}</td>
                <td style="color:${wp.variant.temp <= 0 ? '#00d4ff' : '#ff4500'}">${wp.variant.temp}°C</td>
                <td>${wp.variant.wind} km/h</td><td>LIVE</td>
                <td>${wp.variant.sky} ${wp.variant.skyLabel}</td>
            </tr>`;
        });

        const rows = document.getElementById('bulletin-rows');
        if (rows) rows.innerHTML = html;
    };

    return { init: () => { state.layer.addTo(window.map); setInterval(syncCycle, 3000); syncCycle(); } };
})();

WeatherEngine.init();
