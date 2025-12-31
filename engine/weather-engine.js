/** * Project: [weong-bulletin]
 * Architecture: Proxy-Bridge Handshake
 * Strategy: CORS Bypass for L3 Regional Sync
 * Status: Final Recovery Build
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        nodes: [0, 0.25, 0.5, 0.75, 1],
        // CORS Bridge ensures the handshake is never blocked
        bridge: "https://api.allorigins.win/raw?url=",
        apiBase: "https://api.weather.gc.ca/met/city/v1/coverage/hrdps/point"
    };

    /**
     * SECURE HANDSHAKE
     * Wraps the HRDPS request in a CORS-bridge to prevent handshake rejection.
     */
    const fetchWeatherSecure = async (lat, lng, eta) => {
        try {
            const queryUrl = `${state.apiBase}?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&format=json`;
            const secureUrl = state.bridge + encodeURIComponent(queryUrl);

            const res = await fetch(secureUrl);
            if (!res.ok) throw new Error("REJECTED");

            const json = await res.json();
            const targetHr = eta.getHours();
            
            // Temporal alignment with the HRDPS 48-hour model run
            const f = json.forecasts.find(it => new Date(it.time).getHours() === targetHr) || json.forecasts[0];

            return {
                t: Math.round(f.temperature),
                w: Math.round(f.wind_speed),
                s: f.icon_code ? `https://weather.gc.ca/weathericons/${f.icon_code}.gif` : null,
                c: f.condition || "Synced"
            };
        } catch (e) {
            console.error("Handshake Still Failing:", e.message);
            return null;
        }
    };

    const updateMatrix = async () => {
        const route = Object.values(window.map._layers).find(l => 
            l.feature?.geometry?.type === "LineString" || (l._latlngs && l._latlngs.length > 0)
        );
        if (!route) return;

        const coords = route.feature ? route.feature.geometry.coordinates.map(c => [c[1], c[0]]) : route._latlngs;
        const speed = window.currentCruisingSpeed || 100;
        const start = window.currentDepartureTime || new Date();

        let m = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            m += L.latLng(coords[i]).distanceTo(L.latLng(coords[i+1]));
        }
        const totalKm = m / 1000;

        const results = await Promise.all(state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const pos = coords[idx];
            const lat = pos.lat || pos[0];
            const lng = pos.lng || pos[1];
            const eta = new Date(start.getTime() + ((totalKm * pct) / speed * 3600000));
            
            const weather = await fetchWeatherSecure(lat, lng, eta);
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
                        html: `<div style="background:rgba(0,0,0,0.9); border:2px solid #FFD700; border-radius:10px; width:48px; height:48px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 0 15px #000;">
                            <img src="${w.s}" style="width:22px; height:22px;">
                            <span style="color:#fff; font-size:11px; font-weight:bold;">${w.t}°</span>
                        </div>`
                    })
                }).addTo(state.layer);
            }
            rows += `<tr><td>${i+1}</td><td>${r.eta}</td><td style="color:#FFD700">${w ? w.t+'°C' : 'HANDSHAKE_FAIL'}</td><td>${w ? w.c : 'SEC_REJECT'}</td></tr>`;
        });
        document.getElementById('weong-table-body').innerHTML = rows;
    };

    return { init: () => { state.layer.addTo(window.map); window.map.on('moveend', updateMatrix); updateMatrix(); } };
})();

WeatherEngine.init();
