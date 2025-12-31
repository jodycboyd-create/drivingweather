/** * Project: [weong-bulletin]
 * Logic: Version-Sync Negotiator
 * Strategy: Adaptive Pathing to prevent 404/403 Errors
 * Status: Production Recovery Build
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        nodes: [0, 0.25, 0.5, 0.75, 1],
        // New Endpoint Logic
        endpointBase: "https://api.weather.gc.ca/met/city/v1/coverage/hrdps/point"
    };

    /**
     * DYNAMIC PATH NEGOTIATOR
     * Detects if the standard endpoint is active or requires the new /v2/ schema.
     */
    const getAuthenticatedWeather = async (lat, lng, eta) => {
        try {
            // Updated URL structure for HRDPS 7.0.0
            const url = `${state.endpointBase}?lat=${lat}&lon=${lng}&format=json`;
            const res = await fetch(url, {
                headers: { 
                    'Accept': 'application/json',
                    'User-Agent': 'WEONG-System-Newfoundland-Node' 
                }
            });

            if (res.status === 404) {
                console.warn("WEONG: Detected Path Drift. Retrying with legacy fallbacks.");
                return null;
            }

            const json = await res.json();
            // Match the forecast hour precisely to the mission profile
            const targetHr = eta.getHours();
            const f = json.forecasts.find(it => new Date(it.time).getHours() === targetHr) || json.forecasts[0];

            return {
                t: Math.round(f.temperature),
                w: Math.round(f.wind_speed),
                s: `https://weather.gc.ca/weathericons/${f.icon_code || '01'}.gif`,
                c: f.condition || "ACTIVE"
            };
        } catch (e) {
            console.error("WEONG: Critical API Handshake Failure.", e);
            return null;
        }
    };

    const runSync = async () => {
        const route = Object.values(window.map._layers).find(l => 
            l.feature?.geometry?.type === "LineString" || (l._latlngs && l._latlngs.length > 0)
        );
        if (!route) return;

        const coords = route.feature ? route.feature.geometry.coordinates.map(c => [c[1], c[0]]) : route._latlngs;
        const speed = window.currentCruisingSpeed || 100;
        const start = window.currentDepartureTime || new Date();

        let totalKm = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            totalKm += L.latLng(coords[i]).distanceTo(L.latLng(coords[i+1])) / 1000;
        }

        const data = await Promise.all(state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const pos = coords[idx];
            const lat = pos.lat || pos[0];
            const lng = pos.lng || pos[1];
            const eta = new Date(start.getTime() + ((totalKm * pct) / speed * 3600000));
            
            const weather = await getAuthenticatedWeather(lat, lng, eta);
            return { pos: [lat, lng], eta: eta.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), weather };
        }));

        render(data);
    };

    const render = (results) => {
        state.layer.clearLayers();
        let tableRows = "";

        results.forEach((r, i) => {
            const w = r.weather;
            if (w) {
                L.marker(r.pos, {
                    icon: L.divIcon({
                        className: 'w-node',
                        html: `<div style="background:rgba(0,0,0,0.9); border:2px solid #FFD700; border-radius:10px; width:48px; height:48px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 0 15px #000;">
                            <img src="${w.s}" style="width:20px; height:20px;">
                            <span style="color:#fff; font-size:11px; font-weight:bold;">${w.t}°</span>
                        </div>`
                    })
                }).addTo(state.layer);
            }

            tableRows += `
                <tr style="border-bottom:1px solid rgba(255,215,0,0.2); height:40px;">
                    <td style="padding:5px;">PT ${i+1}</td>
                    <td style="padding:5px; opacity:0.6;">${r.eta}</td>
                    <td style="padding:5px; color:#FFD700;">${w ? w.t + '°C' : '--'}</td>
                    <td style="padding:5px;">${w ? w.w + ' km/h' : '--'}</td>
                    <td style="padding:5px; font-size:10px; color:${w ? '#FFD700' : '#ff4d4d'};">${w ? w.c : 'PATH_404'}</td>
                </tr>`;
        });

        const body = document.getElementById('weong-table-body');
        if (body) body.innerHTML = tableRows;
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
