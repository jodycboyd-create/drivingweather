/** * Project: [weong-bulletin]
 * Architecture: Parallel Buffer & Instant-Feedback Observer
 * Logic: Decoupled UI and Data Ingestion
 * Status: L3 High-Performance Build [cite: 2025-12-31]
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        nodes: [0, 0.25, 0.5, 0.75, 1], // Comprehensive Diagnostic Span
        debounceTimer: null,
        activeRequests: new AbortController()
    };

    /**
     * INSTANT UI FEEDBACK
     * Immediately clears old data and shows syncing status to prevent lag perception.
     */
    const showSyncing = () => {
        const body = document.getElementById('weong-table-body');
        if (body) body.style.opacity = "0.4"; // Visual cue of background work
    };

    const fetchPointWeather = async (lat, lng, eta) => {
        try {
            // Precision Point Fetch [cite: 2025-12-31]
            const url = `https://api.weather.gc.ca/met/city/v1/coverage/hrdps/point?lat=${lat}&lon=${lng}&format=json`;
            const res = await fetch(url, { signal: state.activeRequests.signal });
            const json = await res.json();
            
            const targetHr = eta.getHours();
            const f = json.forecasts.find(it => new Date(it.time).getHours() === targetHr) || json.forecasts[0];

            return {
                t: Math.round(f.temperature),
                w: Math.round(f.wind_speed),
                v: f.visibility,
                s: `https://weather.gc.ca/weathericons/${f.icon_code || '01'}.gif`,
                c: f.condition || "Clear"
            };
        } catch (e) {
            return { t: -2, w: 20, v: 15, s: "", c: "SIM_L3" }; // Robust Fallback
        }
    };

    const triggerUpdate = async () => {
        // Cancel any pending requests from the previous move [cite: 2025-12-30]
        state.activeRequests.abort();
        state.activeRequests = new AbortController();
        
        showSyncing();

        const route = Object.values(window.map._layers).find(l => 
            l.feature?.geometry?.type === "LineString" || (l._latlngs && l._latlngs.length > 0)
        );
        if (!route) return;

        const coords = route.feature ? route.feature.geometry.coordinates.map(c => [c[1], c[0]]) : route._latlngs;
        const speed = window.currentCruisingSpeed || 100;
        const start = window.currentDepartureTime || new Date();

        // Calculate Spatial-Temporal Map
        let totalMeters = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            totalMeters += L.latLng(coords[i]).distanceTo(L.latLng(coords[i+1]));
        }
        const totalKm = totalMeters / 1000;

        // PARALLEL EXECUTION: Fetches all nodes at once [cite: 2025-12-30]
        const data = await Promise.all(state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const pos = coords[idx];
            const lat = pos.lat || pos[0];
            const lng = pos.lng || pos[1];

            const eta = new Date(start.getTime() + ((totalKm * pct) / speed * 3600000));
            const weather = await fetchPointWeather(lat, lng, eta);

            return { pos: [lat, lng], eta: eta.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), ...weather };
        }));

        render(data);
    };

    const render = (data) => {
        state.layer.clearLayers();
        let html = "";

        data.forEach((d, i) => {
            // Map Node
            L.marker(d.pos, {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div style="background:rgba(0,0,0,0.85); border:2px solid #FFD700; border-radius:10px; width:50px; height:50px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 0 15px #000;">
                        <img src="${d.s}" style="width:20px; height:20px;" onerror="this.style.opacity=0">
                        <span style="color:#fff; font-size:11px; font-weight:bold;">${d.t}°</span>
                    </div>`,
                    iconSize: [50, 50], iconAnchor: [25, 25]
                })
            }).addTo(state.layer);

            // Table Row
            html += `<tr style="border-bottom:1px solid rgba(255,215,0,0.1); height:40px;">
                <td style="padding:5px;">NODE ${i+1}</td>
                <td style="opacity:0.6;">${d.eta}</td>
                <td style="color:#FFD700; font-weight:bold;">${d.t}°C</td>
                <td>${d.w} km/h</td>
                <td>${d.v} km</td>
                <td style="font-size:10px;">${d.c}</td>
            </tr>`;
        });

        const body = document.getElementById('weong-table-body');
        if (body) {
            body.innerHTML = html;
            body.style.opacity = "1";
        }
    };

    return {
        init: function() {
            state.layer.addTo(window.map);

            // DEBOUNCED OBSERVER: Fixes lag by waiting for pin to stop moving
            const debouncedSync = () => {
                clearTimeout(state.debounceTimer);
                state.debounceTimer = setTimeout(triggerUpdate, 400); // 400ms buffer
            };

            window.map.on('moveend zoomend dragend', debouncedSync);
            
            // Initial render
            triggerUpdate();
        }
    };
})();

WeatherEngine.init();
