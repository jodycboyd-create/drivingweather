/** * Project: [weong-bulletin] | Route-Locked Precision Sync
 * Methodology: L3 Stealth-Sync Unified Engine
 * Status: Decoupled Marker Positioning + Night Logic [cite: 2025-12-31]
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
            { name: "Clarenville", lat: 48.16, lng: -53.96 },
            { name: "Stephenville", lat: 48.55, lng: -58.57 },
            { name: "Deer Lake", lat: 49.17, lng: -57.43 }
        ],
        nodes: [0.10, 0.30, 0.50, 0.70, 0.95]
    };

    const getSkyIcon = (code, hour) => {
        // NL Night Window (Sunset is early in Dec/Jan)
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

        // UI Feedback: Loading Spinner [cite: 2025-12-31]
        const btn = document.getElementById('btn-open-bulletin');
        if (btn) btn.innerHTML = 'SYNCING NL METEO <span class="loader-dot"></span>';

        const speed = window.currentCruisingSpeed || 100; 
        const depTime = window.currentDepartureTime || new Date();

        const waypoints = await Promise.all(state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx]; // Route Position
            
            const travelHours = (pct * 450) / speed; 
            const arrival = new Date(depTime.getTime() + (travelHours * 3600000));
            
            // Find nearest data point but KEEP the original route lat/lng for display
            const dataNode = state.communities.reduce((prev, curr) => 
                Math.hypot(lat - curr.lat, lng - curr.lng) < Math.hypot(lat - prev.lat, lng - prev.lng) ? curr : prev
            );

            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,wind_speed_10m,weather_code&wind_speed_unit=kmh&timezone=auto`;
                const res = await fetch(url);
                const json = await res.json();
                const target = arrival.toISOString().split(':')[0] + ":00";
                const i = Math.max(0, json.hourly.time.indexOf(target));
                const weather = getSkyIcon(json.hourly.weather_code[i], arrival.getHours());

                return { 
                    name: dataNode.name, 
                    displayLat: lat, 
                    displayLng: lng, 
                    eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    variant: {
                        temp: Math.round(json.hourly.temperature_2m[i]),
                        wind: Math.round(json.hourly.wind_speed_10m[i]),
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
            // FIX: Marker position is now exactly on the route [cite: 2025-12-31]
            L.marker([wp.displayLat, wp.displayLng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div style="background:rgba(0,0,0,0.95); border:1px solid #FFD700; color:#FFD700; width:65px; height:55px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 0 15px #000;">
                            <span style="font-size:7px; background:#FFD700; color:#000; width:100%; text-align:center;">${wp.name.toUpperCase()}</span>
                            <span style="font-size:18px; margin:2px 0;">${wp.variant.sky}</span>
                            <div style="font-size:10px; font-weight:bold;">${wp.variant.temp}° | ${wp.variant.wind}k</div>
                        </div>`,
                    iconSize: [65, 55]
                })
            }).addTo(state.layer);

            html += `<tr style="border-bottom:1px solid #222;">
                <td style="padding:8px 5px;">${wp.name}</td>
                <td style="padding:8px 5px;">${wp.eta}</td>
                <td style="padding:8px 5px; color:${wp.variant.temp <= 0 ? '#00d4ff' : '#ff4500'}">${wp.variant.temp}°C</td>
                <td style="padding:8px 5px;">${wp.variant.wind} km/h</td>
                <td style="padding:8px 5px;">LIVE</td>
                <td style="padding:8px 5px;">${wp.variant.sky} ${wp.variant.skyLabel}</td>
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
