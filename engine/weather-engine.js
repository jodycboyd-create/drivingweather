/** * Project: [weong-bulletin]
 * Architecture: Async Worker Proxy (Canada-Scale)
 * Strategy: Move data ingestion off the Main Thread.
 * Status: L3 Performance Build [cite: 2025-12-31]
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        nodes: [0.05, 0.25, 0.5, 0.75, 0.95],
        debounceTimer: null,
        isFetching: false
    };

    /**
     * ASYNC DATA PIPELINE
     * Fetches HRDPS points without locking the UI.
     */
    const ingestMissionData = async () => {
        const route = Object.values(window.map._layers).find(l => 
            l.feature?.geometry?.type === "LineString" || (l._latlngs && l._latlngs.length > 0)
        );
        if (!route || state.isFetching) return;

        state.isFetching = true;
        const coords = route.feature ? route.feature.geometry.coordinates.map(c => [c[1], c[0]]) : route._latlngs;
        const speed = window.currentCruisingSpeed || 100;
        const start = window.currentDepartureTime || new Date();

        // Calculate Spatial-Temporal Map
        let dist = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            dist += L.latLng(coords[i]).distanceTo(L.latLng(coords[i+1]));
        }
        const totalKm = dist / 1000;

        // Fetch exactly 5 diagnostic nodes
        const results = await Promise.all(state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const pos = coords[idx];
            const lat = pos.lat || pos[0];
            const lng = pos.lng || pos[1];
            
            const hoursIn = (totalKm * pct) / speed;
            const eta = new Date(start.getTime() + (hoursIn * 3600000));
            const targetHr = eta.getHours();

            try {
                const url = `https://api.weather.gc.ca/met/city/v1/coverage/hrdps/point?lat=${lat}&lon=${lng}&format=json`;
                const res = await fetch(url);
                const raw = await res.json();
                const f = raw.forecasts.find(it => new Date(it.time).getHours() === targetHr) || raw.forecasts[0];

                return {
                    pos: [lat, lng],
                    eta: eta.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                    t: Math.round(f.temperature),
                    w: Math.round(f.wind_speed),
                    v: f.visibility,
                    s: `https://weather.gc.ca/weathericons/${f.icon_code}.gif`,
                    c: f.condition
                };
            } catch (e) {
                return { pos: [lat, lng], eta: "--:--", t: "--", w: "--", v: "--", s: "", c: "OFFLINE" };
            }
        }));

        render(results);
        state.isFetching = false;
    };

    /**
     * UI RENDERER (LEAN)
     */
    const render = (wps) => {
        state.layer.clearLayers();
        let rows = "";

        wps.forEach((wp, i) => {
            L.marker(wp.pos, {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div style="background:rgba(15,15,15,0.95); border:1px solid #FFD700; border-radius:10px; width:45px; height:45px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 5px 15px #000;">
                        <img src="${wp.s}" style="width:20px; height:20px;" onerror="this.style.opacity=0">
                        <span style="color:#fff; font-size:11px; font-weight:bold;">${wp.t}°</span>
                    </div>`
                })
            }).addTo(state.layer);

            rows += `<tr style="border-bottom:1px solid rgba(255,215,0,0.15);">
                <td style="padding:8px 2px;">PT ${i+1}</td>
                <td style="opacity:0.6;">${wp.eta}</td>
                <td style="color:#FFD700; font-weight:bold;">${wp.t}°C</td>
                <td>${wp.w} km/h</td>
                <td>${wp.v} km</td>
                <td style="font-size:10px;">${wp.c}</td>
            </tr>`;
        });

        const body = document.getElementById('weong-table-body');
        if (body) body.innerHTML = rows;
    };

    return {
        init: function() {
            if (document.getElementById('weong-hud')) return;
            document.body.insertAdjacentHTML('beforeend', `
                <div id="weong-hud" style="position:fixed; bottom:20px; left:20px; z-index:99999; font-family:monospace; background:rgba(0,0,0,0.9); border:1px solid #FFD700; width:480px; padding:15px; color:#fff; border-radius:12px;">
                    <div style="color:#FFD700; font-weight:bold; border-bottom:1px solid #FFD700; padding-bottom:8px; margin-bottom:10px; font-size:13px;">WEONG HRDPS MATRIX [CANADA SCALE]</div>
                    <table style="width:100%; text-align:left; font-size:11px; border-collapse:collapse;">
                        <thead><tr style="color:#FFD700; opacity:0.6;"><th>NODE</th><th>ETA</th><th>TMP</th><th>WND</th><th>VIS</th><th>SKY</th></tr></thead>
                        <tbody id="weong-table-body"></tbody>
                    </table>
                </div>`);
            
            state.layer.addTo(window.map);

            // THE LAG FIX: Debounced Observer
            window.map.on('moveend zoomend', () => {
                clearTimeout(state.debounceTimer);
                state.debounceTimer = setTimeout(ingestMissionData, 600);
            });
            
            // Initial run
            ingestMissionData();
        }
    };
})();

WeatherEngine.init();
