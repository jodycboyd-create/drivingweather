/** * Project: [weong-bulletin] | Final Mission Baseline
 * Architecture: GFS/JMA Unified Sync
 * Status: L3 Deployment - NL COMPREHENSIVE [cite: 2025-12-31]
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        nodes: [0, 0.25, 0.5, 0.75, 1],
        // Target ID for the Newfoundland Mission Matrix
        targetID: 'weong-table-body' 
    };

    const fetchWeather = async (lat, lng, eta) => {
        try {
            const timeISO = eta.toISOString().split(':')[0];
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,wind_speed_10m,weather_code&wind_speed_unit=kmh&timezone=auto`;
            
            const res = await fetch(url);
            if (!res.ok) return null;
            const json = await res.json();
            
            const target = timeISO.substring(0, 14) + "00";
            const idx = json.hourly.time.indexOf(target);
            
            return idx !== -1 ? {
                t: Math.round(json.hourly.temperature_2m[idx]),
                w: Math.round(json.hourly.wind_speed_10m[idx]),
                c: json.hourly.weather_code[idx]
            } : null;
        } catch (e) { return null; }
    };

    const syncNewfoundland = async () => {
        // 1. Detect the route line from the map
        const route = Object.values(window.map._layers).find(l => 
            l._latlngs && l._latlngs.length > 0
        );
        
        if (!route) {
            console.warn("WEONG: Waiting for route detection...");
            return;
        }

        const coords = route.getLatLngs();
        const start = window.currentDepartureTime || new Date();
        const speed = window.currentCruisingSpeed || 100;

        const results = await Promise.all(state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const pos = coords[idx];
            // Calculate ETA based on percentage of route distance
            const eta = new Date(start.getTime() + (pct * 5 * 3600000)); 
            const weather = await fetchWeather(pos.lat, pos.lng, eta);
            return { pos, eta, weather };
        }));

        renderHUD(results);
    };

    const renderHUD = (data) => {
        state.layer.clearLayers();
        let rows = "";

        data.forEach((r, i) => {
            const w = r.weather;
            if (w) {
                // Persistent Map Markers for NL Nodes [cite: 2025-12-26]
                L.marker(r.pos, {
                    icon: L.divIcon({
                        className: 'w-marker',
                        html: `<div style="background:#000; border:2px solid #FFD700; color:#fff; border-radius:5px; padding:2px 5px; font-weight:bold; font-size:10px;">${w.t}°C</div>`
                    })
                }).addTo(state.layer);
            }

            rows += `<tr>
                <td>PT ${i+1}</td>
                <td style="opacity:0.6;">${r.eta.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                <td style="color:#FFD700; font-weight:bold;">${w ? w.t + '°' : '--'}</td>
                <td>${w ? w.w + ' km/h' : '--'}</td>
                <td style="font-size:9px; color:#FFD700;">${w ? 'GFS_SYNC' : 'PENDING'}</td>
            </tr>`;
        });

        const container = document.getElementById(state.targetID);
        if (container) {
            container.innerHTML = rows;
        } else {
            // DIAGNOSTIC FALLBACK: If the ID is missing, we find the first table body [cite: 2025-12-31]
            const fallback = document.querySelector('tbody');
            if (fallback) fallback.innerHTML = rows;
            console.error(`WEONG: Element #${state.targetID} not found. Injected into first <tbody>.`);
        }
    };

    return {
        init: function() {
            state.layer.addTo(window.map);
            window.map.on('moveend', syncNewfoundland);
            syncNewfoundland();
        }
    };
})();

WeatherEngine.init();
