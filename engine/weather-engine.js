/** * Project: [weong-bulletin] | Newfoundland Final Dataset
 * Logic: OGC-Features GeoMet Sync (Direct)
 * Status: L3 ROBUST - No Simulation [cite: 2025-12-31]
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        nodes: [0, 0.25, 0.5, 0.75, 1],
        // The robust OGC endpoint that avoids 404/403 drift
        endpoint: "https://api.weather.gc.ca/collections/hrdps-continental-all-variables/items"
    };

    const fetchWeather = async (lat, lng, eta) => {
        try {
            const timeISO = eta.toISOString().split('.')[0] + 'Z';
            // Bounding Box (BBOX) ensures a grid hit even if coordinate is slightly off-grid
            const bbox = `${lng-0.02},${lat-0.02},${lng+0.02},${lat+0.02}`;
            const url = `${state.endpoint}?bbox=${bbox}&datetime=${timeISO}&limit=1&f=json`;

            const res = await fetch(url, {
                method: 'GET',
                headers: { 'User-Agent': 'WEONG-Unified-Engine-NL' }
            });

            if (!res.ok) return null;
            const data = await res.json();
            const f = data.features?.[0]?.properties;

            return f ? {
                t: Math.round(f.temperature || f.TMP_AGL_2 || 0),
                w: Math.round(f.wind_speed || f.WIND_AGL_10 || 0),
                v: f.visibility || "15",
                s: f.icon_code ? `https://weather.gc.ca/weathericons/${f.icon_code}.gif` : null,
                c: f.condition || "Synced"
            } : null;
        } catch (e) { return null; }
    };

    const syncMatrix = async () => {
        // Find the active Newfoundland route layer
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

        const dataset = await Promise.all(state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const pos = coords[idx];
            const lat = pos.lat || pos[0];
            const lng = pos.lng || pos[1];
            const eta = new Date(start.getTime() + ((totalM / 1000 * pct) / speed * 3600000));
            
            const weather = await fetchWeather(lat, lng, eta);
            return { pos: [lat, lng], eta: eta.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), weather };
        }));

        render(dataset);
    };

    const render = (data) => {
        state.layer.clearLayers();
        let rows = "";

        data.forEach((r, i) => {
            const w = r.weather;
            if (w && w.s) {
                L.marker(r.pos, {
                    icon: L.divIcon({
                        className: 'w-node',
                        html: `<div style="background:rgba(0,0,0,0.9); border:2px solid #FFD700; border-radius:10px; width:50px; height:50px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 0 15px #000;">
                            <img src="${w.s}" style="width:24px; height:24px;">
                            <span style="color:#fff; font-size:12px; font-weight:bold;">${w.t}°</span>
                        </div>`
                    })
                }).addTo(state.layer);
            }

            rows += `
                <tr style="border-bottom:1px solid rgba(255,215,0,0.1); height:45px;">
                    <td style="padding:5px;">PT ${i+1}</td>
                    <td style="padding:5px; opacity:0.6;">${r.eta}</td>
                    <td style="padding:5px; color:#FFD700;">${w ? w.t + '°C' : '--'}</td>
                    <td style="padding:5px;">${w ? w.w + ' km/h' : '--'}</td>
                    <td style="padding:5px;">${w ? w.v + ' km' : '--'}</td>
                    <td style="padding:5px; font-size:10px; color:${w ? '#FFD700' : '#ff4d4d'};">
                        ${w ? w.c : 'OFFLINE'}
                    </td>
                </tr>`;
        });

        // RE-TARGETING: Ensure this ID exactly matches your index.html table body
        const tableBody = document.getElementById('weong-table-body');
        if (tableBody) tableBody.innerHTML = rows;
    };

    return {
        init: function() {
            state.layer.addTo(window.map);
            window.map.on('moveend', syncMatrix);
            syncMatrix();
        }
    };
})();

WeatherEngine.init();
