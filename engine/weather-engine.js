/** * Project: [weong-bulletin] | Meteorological Rebuild
 * Strategy: Open-Meteo High-Resolution Ingest (Non-ECCC)
 * Functionality: Dynamic Timeline Sync + Table Population
 * Status: L3 Deployment [cite: 2025-12-31]
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        nodes: [0, 0.25, 0.5, 0.75, 1], // Start, 25%, 50%, 75%, End
        activeSignal: new AbortController()
    };

    /**
     * HIGH-RES DATA FETCH
     * Uses GFS/HRRR models via Open-Meteo to bypass government 404s.
     */
    const fetchMeteo = async (lat, lng, eta) => {
        try {
            const timeISO = eta.toISOString().split(':')[0]; // YYYY-MM-DDTHH:MM
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,wind_speed_10m,weather_code,visibility&wind_speed_unit=kmh&timezone=auto`;

            const res = await fetch(url, { signal: state.activeSignal.signal });
            if (!res.ok) return null;
            
            const json = await res.json();
            const targetTime = timeISO.substring(0, 14) + "00"; 
            const idx = json.hourly.time.indexOf(targetTime);

            if (idx === -1) return null;

            return {
                t: Math.round(json.hourly.temperature_2m[idx]),
                w: Math.round(json.hourly.wind_speed_10m[idx]),
                v: (json.hourly.visibility[idx] / 1000).toFixed(1), 
                code: json.hourly.weather_code[idx]
            };
        } catch (e) { return null; }
    };

    const syncMission = async () => {
        state.activeSignal.abort();
        state.activeSignal = new AbortController();

        // Detect active Newfoundland route layer
        const route = Object.values(window.map._layers).find(l => 
            l.feature?.geometry?.type === "LineString" || (l._latlngs && l._latlngs.length > 0)
        );
        if (!route) return;

        const coords = route.feature ? route.feature.geometry.coordinates.map(c => [c[1], c[0]]) : route._latlngs;
        const speed = window.currentCruisingSpeed || 100;
        const start = window.currentDepartureTime || new Date();

        let totalM = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            totalM += L.latLng(coords[i]).distanceTo(L.latLng(coords[i+1]));
        }
        const totalKm = totalM / 1000;

        const results = await Promise.all(state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const pos = coords[idx];
            const lat = pos.lat || pos[0];
            const lng = pos.lng || pos[1];

            const eta = new Date(start.getTime() + ((totalKm * pct) / speed * 3600000));
            const weather = await fetchMeteo(lat, lng, eta);

            return { pos: [lat, lng], eta: eta.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), weather };
        }));

        render(results);
    };

    const render = (data) => {
        state.layer.clearLayers();
        let rows = "";

        data.forEach((r, i) => {
            const w = r.weather;
            if (w) {
                L.marker(r.pos, {
                    icon: L.divIcon({
                        className: 'w-node',
                        html: `<div style="background:rgba(0,0,0,0.9); border:2px solid #FFD700; border-radius:10px; width:45px; height:45px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff;">
                            <span style="font-size:14px; font-weight:bold;">${w.t}°</span>
                            <span style="font-size:9px; opacity:0.8;">${w.w}k</span>
                        </div>`
                    })
                }).addTo(state.layer);
            }

            rows += `
                <tr style="border-bottom:1px solid rgba(255,215,0,0.1); height:40px;">
                    <td style="padding:5px; font-weight:bold;">PT ${i+1}</td>
                    <td style="padding:5px; opacity:0.6;">${r.eta}</td>
                    <td style="padding:5px; color:#FFD700; font-weight:bold;">${w ? w.t + '°C' : '--'}</td>
                    <td style="padding:5px;">${w ? w.w + ' km/h' : '--'}</td>
                    <td style="padding:5px;">${w ? w.v + ' km' : '--'}</td>
                    <td style="padding:5px; font-size:10px; color:#FFD700;">${w ? 'RES_OK' : 'FETCH_ERR'}</td>
                </tr>`;
        });

        const tableBody = document.getElementById('weong-table-body');
        if (tableBody) tableBody.innerHTML = rows;
    };

    return {
        init: function() {
            state.layer.addTo(window.map);
            window.map.on('moveend dragend', syncMission);
            syncMission();
        }
    };
})();

WeatherEngine.init();
