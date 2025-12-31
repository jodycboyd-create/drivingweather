/** * Project: [weong-bulletin]
 * Logic: Autonomous Map Observer + Lead-Time Grid Matcher
 * Strategy: Zero-Dependency / Event-Driven
 * Status: L3 Diagnostic Build [cite: 2025-12-31]
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        nodes: [0.1, 0.3, 0.5, 0.7, 0.9],
        isBusy: false,
        lastRouteKey: ""
    };

    const fetchWeather = async () => {
        if (state.isBusy || !window.map) return;
        
        // 1. Find Route (GeoJSON or Routing Machine)
        const routeLayer = Object.values(window.map._layers).find(l => 
            l.feature?.geometry?.type === "LineString" || (l._latlngs && l._latlngs.length > 0)
        );
        
        if (!routeLayer) return;
        
        // Prevent redundant firing
        const routeKey = routeLayer._leaflet_id + (window.currentCruisingSpeed || 100);
        if (state.lastRouteKey === routeKey) return;
        state.lastRouteKey = routeKey;

        state.isBusy = true;
        const coords = routeLayer.feature ? routeLayer.feature.geometry.coordinates.map(c => [c[1], c[0]]) : routeLayer._latlngs;
        const speed = window.currentCruisingSpeed || 100;
        const start = window.currentDepartureTime || new Date();

        // 2. Map Distance
        let totalMeters = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            totalMeters += L.latLng(coords[i]).distanceTo(L.latLng(coords[i+1]));
        }
        const totalKm = totalMeters / 1000;

        // 3. Parallel Lead-Time Ingestion
        const results = await Promise.all(state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const pos = coords[idx];
            const lat = pos.lat || pos[0];
            const lng = pos.lng || pos[1];

            const eta = new Date(start.getTime() + ((totalKm * pct) / speed * 3600000));
            const hr = eta.getHours();

            try {
                // Direct Point Fetch from MSC GeoMet
                const url = `https://api.weather.gc.ca/met/city/v1/coverage/hrdps/point?lat=${lat}&lon=${lng}&format=json`;
                const res = await fetch(url);
                const json = await res.json();
                
                // Find matching hour in the HRDPS stack
                const f = json.forecasts.find(it => new Date(it.time).getHours() === hr) || json.forecasts[0];

                return {
                    pos: [lat, lng],
                    eta: eta.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                    t: Math.round(f.temperature),
                    w: Math.round(f.wind_speed),
                    v: f.visibility,
                    s: `https://weather.gc.ca/weathericons/${f.icon_code || '01'}.gif`,
                    c: f.condition || "Clear"
                };
            } catch (e) {
                return { pos: [lat, lng], eta: "--:--", t: "--", w: "--", v: "--", s: "", c: "OFFLINE" };
            }
        }));

        render(results);
        state.isBusy = false;
    };

    const render = (data) => {
        state.layer.clearLayers();
        let tableHtml = "";

        data.forEach((d, i) => {
            // Place Map Markers
            L.marker(d.pos, {
                icon: L.divIcon({
                    className: 'weong-icon',
                    html: `<div style="background:rgba(10,10,10,0.9); border:2px solid #FFD700; border-radius:10px; width:50px; height:50px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 0 15px #000;">
                        <img src="${d.s}" style="width:22px; height:22px;">
                        <span style="color:#fff; font-size:11px; font-weight:bold;">${d.t}°</span>
                    </div>`,
                    iconSize: [50, 50], iconAnchor: [25, 25]
                })
            }).addTo(state.layer);

            // Populate Table Rows
            tableHtml += `<tr style="border-bottom:1px solid rgba(255,215,0,0.2);">
                <td style="padding:10px 5px; font-weight:bold;">PT ${i+1}</td>
                <td style="padding:10px 5px; opacity:0.7;">${d.eta}</td>
                <td style="padding:10px 5px; color:#FFD700; font-weight:bold;">${d.t}°C</td>
                <td style="padding:10px 5px;">${d.w} km/h</td>
                <td style="padding:10px 5px;">${d.v} km</td>
                <td style="padding:10px 5px; font-size:10px;">${d.c}</td>
            </tr>`;
        });

        const body = document.getElementById('weong-table-body');
        if (body) body.innerHTML = tableHtml;
    };

    const initUI = () => {
        if (document.getElementById('weong-hud')) return;
        document.body.insertAdjacentHTML('beforeend', `
            <div id="weong-hud" style="position:fixed; top:20px; left:20px; z-index:99999; font-family:monospace; background:rgba(0,0,0,0.9); border:1px solid #FFD700; width:500px; padding:15px; color:#fff; border-radius:12px; box-shadow: 0 0 30px #000;">
                <div style="color:#FFD700; font-weight:bold; border-bottom:1px solid #FFD700; padding-bottom:10px; margin-bottom:10px; display:flex; justify-content:space-between;">
                    <span>WEONG HRDPS MATRIX [L3]</span>
                    <span id="weong-status" style="font-size:9px; opacity:0.5;">AUTONOMOUS</span>
                </div>
                <table style="width:100%; text-align:left; font-size:11px; border-collapse:collapse;">
                    <thead><tr style="color:#FFD700; opacity:0.6;"><th>NODE</th><th>ETA</th><th>TMP</th><th>WIND</th><th>VIS</th><th>SKY</th></tr></thead>
                    <tbody id="weong-table-body"></tbody>
                </table>
            </div>`);
    };

    return {
        start: function() {
            initUI();
            state.layer.addTo(window.map);
            // Passive Observer: Checks for route changes every 3 seconds without polling API
            setInterval(fetchWeather, 3000);
        }
    };
})();

// AUTO-BOOTSTRAP
if (window.map) WeatherEngine.start();
else window.addEventListener('load', WeatherEngine.start);
