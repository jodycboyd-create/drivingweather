/** * Project: [weong-bulletin]
 * Methodology: Velocity-Linked Dynamic Sync
 * Status: Day/Night Correction + Async Loading [cite: 2025-12-31]
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
        activeWaypoints: [],
        nodes: [0.15, 0.35, 0.55, 0.75, 0.95]
    };

    /**
     * DAY/NIGHT SENSITIVE MAPPING [cite: 2025-12-31]
     */
    const interpretCode = (code, hour) => {
        const isNight = hour >= 20 || hour <= 6; // NL Night Window
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
            const weather = interpretCode(json.hourly.weather_code[i], arrival.getHours());

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
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString" || (l._latlngs && l._latlngs.length > 0));
        if (!route) return;

        const coords = route.feature ? route.feature.geometry.coordinates : route.getLatLngs().map(p => [p.lng, p.lat]);
        const currentKey = `${coords[0][0].toFixed(3)}-${coords.length}`;
        if (currentKey === state.anchorKey) return;

        // Start Loading State [cite: 2025-12-31]
        state.isLocked = true;
        const rows = document.getElementById('bulletin-rows');
        if (rows) rows.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#FFD700; font-weight:bold;">LOADING LIVE NL MET DATA...</td></tr>';

        state.anchorKey = currentKey;
        
        // 2. LINKAGE: Use velocity-widget.js data if available
        const cruiseSpeed = window.currentCruisingSpeed || 100; 
        const depTime = window.currentDepartureTime || new Date();

        const rawWaypoints = state.nodes.map(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            // Simple travel time: (percentage of route / speed)
            const travelHours = (pct * 500) / cruiseSpeed; 
            const arrival = new Date(depTime.getTime() + (travelHours * 3600000));
            
            const community = state.communities.reduce((prev, curr) => {
                const dPrev = Math.hypot(lat - prev.lat, lng - prev.lng);
                const dCurr = Math.hypot(lat - curr.lat, lng - curr.lng);
                return dCurr < dPrev ? curr : prev;
            });
            return { ...community, arrival };
        });

        state.activeWaypoints = await Promise.all(rawWaypoints.map(async (wp) => {
            const variant = await fetchMeteo(wp.lat, wp.lng, wp.arrival);
            return { ...wp, eta: wp.arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), variant };
        }));

        render();
        state.isLocked = false;
    };

    const render = () => {
        state.layer.clearLayers();
        const container = document.getElementById('bulletin-rows');
        let html = "";

        state.activeWaypoints.forEach(wp => {
            if (!wp.variant) return;
            
            // Map Markers
            L.marker([wp.lat, wp.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div style="background:rgba(0,0,0,0.9); border:1px solid #FFD700; color:#FFD700; width:60px; height:50px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 0 10px #000;">
                            <span style="font-size:7px; background:#FFD700; color:#000; width:100%; text-align:center;">${wp.name}</span>
                            <span style="font-size:16px;">${wp.variant.sky}</span>
                            <span style="font-size:10px; font-weight:bold;">${wp.variant.temp}°</span>
                        </div>`,
                    iconSize: [60, 50]
                })
            }).addTo(state.layer);

            // Table Rows
            html += `<tr style="border-bottom:1px solid #222;">
                <td style="padding:8px 5px;">${wp.name}</td>
                <td style="padding:8px 5px;">${wp.eta}</td>
                <td style="padding:8px 5px; color:${wp.variant.temp <= 0 ? '#00d4ff' : '#ff4500'}">${wp.variant.temp}°C</td>
                <td style="padding:8px 5px;">${wp.variant.wind} km/h</td>
                <td style="padding:8px 5px;">LIVE</td>
                <td style="padding:8px 5px;">${wp.variant.skyLabel} ${wp.variant.sky}</td>
            </tr>`;
        });

        if (container) container.innerHTML = html;
    };

    return {
        init: () => {
            state.layer.addTo(window.map);
            setInterval(syncCycle, 3000); // 3s polling for mission changes
            syncCycle();
        }
    };
})();

WeatherEngine.init();
