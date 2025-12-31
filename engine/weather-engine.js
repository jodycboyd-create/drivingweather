/** * Project: [weong-bulletin]
 * Logic: CORS-Aware Temporal Sync
 * Strategy: Proxy-Fallback for local dev + Run-Discovery
 * Status: L3 Diagnostic Build
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        nodes: [0, 0.25, 0.5, 0.75, 1],
        // Use a CORS proxy if running locally to bypass browser blocks
        proxy: "https://cors-anywhere.herokuapp.com/", 
        apiBase: "https://api.weather.gc.ca/met/city/v1/coverage/hrdps/point"
    };

    /**
     * DISCOVERY FETCH
     * Attempts a direct fetch; if it fails with a CORS error or 404, it retries through the proxy.
     */
    const fetchWithRecovery = async (lat, lng, eta) => {
        const url = `${state.apiBase}?lat=${lat}&lon=${lng}&format=json`;
        
        const execute = async (targetUrl) => {
            const res = await fetch(targetUrl, {
                headers: { 'Accept': 'application/json' }
            });
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            return await res.json();
        };

        try {
            // Attempt 1: Direct Fetch
            let data = await execute(url);
            return parse(data, eta);
        } catch (e) {
            console.warn("Direct Fetch Failed. Attempting Proxy Recovery...");
            try {
                // Attempt 2: Proxy Fallback
                let data = await execute(state.proxy + url);
                return parse(data, eta);
            } catch (proxyErr) {
                console.error("Critical: All API paths blocked.", proxyErr);
                return null;
            }
        }
    };

    const parse = (json, eta) => {
        const targetHr = eta.getHours();
        // Find the forecast closest to the arrival time
        const f = json.forecasts.find(it => new Date(it.time).getHours() === targetHr) || json.forecasts[0];
        return {
            t: Math.round(f.temperature),
            w: Math.round(f.wind_speed),
            s: `https://weather.gc.ca/weathericons/${f.icon_code || '01'}.gif`,
            c: f.condition || "Synced"
        };
    };

    const updateMission = async () => {
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

        const results = await Promise.all(state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const pos = coords[idx];
            const lat = pos.lat || pos[0];
            const lng = pos.lng || pos[1];
            const eta = new Date(start.getTime() + ((totalKm * pct) / speed * 3600000));
            
            const weather = await fetchWithRecovery(lat, lng, eta);
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
                        html: `<div style="background:rgba(0,0,0,0.9); border:2px solid #FFD700; border-radius:10px; width:48px; height:48px; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                            <img src="${w.s}" style="width:22px; height:22px;">
                            <span style="color:#fff; font-size:11px; font-weight:bold;">${w.t}°</span>
                        </div>`
                    })
                }).addTo(state.layer);
            }
            rows += `<tr><td>${i+1}</td><td>${r.eta}</td><td style="color:${w ? '#FFD700' : '#ff4d4d'}">${w ? w.t+'°C' : 'OFFLINE'}</td><td>${w ? w.c : 'ERROR'}</td></tr>`;
        });
        document.getElementById('weong-table-body').innerHTML = rows;
    };

    return { init: () => { state.layer.addTo(window.map); window.map.on('moveend', updateMission); updateMission(); } };
})();

WeatherEngine.init();
