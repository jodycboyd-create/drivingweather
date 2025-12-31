/** * Project: [weong-bulletin]
 * Architecture: Regional Mosaic Ingestor
 * Strategy: Bounding-Box fallback to prevent 404s
 * Status: L3 Diagnostic Build [cite: 2025-12-31]
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        nodes: [0, 0.25, 0.5, 0.75, 1],
        activeRequests: new AbortController()
    };

    /**
     * REGIONAL FALLBACK FETCH
     * If the high-precision point fails, it broadens the search slightly to find the nearest valid grid.
     */
    const fetchWithFallback = async (lat, lng, eta) => {
        const precisionCoords = `lat=${lat.toFixed(3)}&lon=${lng.toFixed(3)}`;
        const fallbackCoords = `lat=${lat.toFixed(1)}&lon=${lng.toFixed(1)}`; // Broaden search
        
        const tryFetch = async (coords) => {
            const url = `https://api.weather.gc.ca/met/city/v1/coverage/hrdps/point?${coords}&format=json`;
            const res = await fetch(url, { signal: state.activeRequests.signal });
            return res.ok ? await res.json() : null;
        };

        try {
            // Attempt 1: High Precision [cite: 2025-12-31]
            let json = await tryFetch(precisionCoords);
            // Attempt 2: Regional Grid Fallback if 404
            if (!json) json = await tryFetch(fallbackCoords);
            
            if (!json) return null;

            const targetHr = eta.getHours();
            const f = json.forecasts.find(it => new Date(it.time).getHours() === targetHr) || json.forecasts[0];

            return {
                t: Math.round(f.temperature),
                w: Math.round(f.wind_speed),
                v: f.visibility || "--",
                s: f.icon_code ? `https://weather.gc.ca/weathericons/${f.icon_code}.gif` : null,
                c: f.condition || "Clear"
            };
        } catch (e) { return null; }
    };

    const runSync = async () => {
        state.activeRequests.abort();
        state.activeRequests = new AbortController();

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
            const weather = await fetchWithFallback(lat, lng, eta);

            return { pos: [lat, lng], eta: eta.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), weather };
        }));

        render(results);
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
                            <img src="${w.s}" style="width:22px; height:22px;">
                            <span style="color:#fff; font-size:11px; font-weight:bold;">${w.t}°</span>
                        </div>`
                    })
                }).addTo(state.layer);
            }

            rows += `
                <tr style="border-bottom:1px solid rgba(255,215,0,0.1); height:40px;">
                    <td style="padding:5px; font-weight:bold;">PT ${i+1}</td>
                    <td style="padding:5px; opacity:0.6;">${r.eta}</td>
                    <td style="padding:5px; color:#FFD700; font-weight:bold;">${w ? w.t + '°' : '--'}</td>
                    <td style="padding:5px;">${w ? w.w + ' km/h' : '--'}</td>
                    <td style="padding:5px;">${w ? w.v + ' km' : '--'}</td>
                    <td style="padding:5px; font-size:9px; color:${w ? '#FFD700' : '#ff4444'};">${w ? w.c : 'API_TIMEOUT'}</td>
                </tr>`;
        });

        const body = document.getElementById('weong-table-body');
        if (body) body.innerHTML = rows;
    };

    return {
        init: function() {
            state.layer.addTo(window.map);
            window.map.on('moveend dragend', runSync);
            runSync();
        }
    };
})();

WeatherEngine.init();
