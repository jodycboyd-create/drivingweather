/** * Project: [weong-bulletin]
 * Architecture: Regional Mosaic Lead-Time Mapper
 * Strategy: Canada-Scale Precision Ingestor (No Polling)
 * Status: L3 Diagnostic Build [cite: 2025-12-31]
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        nodes: [0.05, 0.25, 0.5, 0.75, 0.95], // Targeted Diagnostic Points
        isProcessing: false
    };

    /**
     * PRECISION LEAD-TIME FETCH
     * Maps geographic coordinates to the specific HRDPS temporal hour.
     */
    const getLeadTimeData = async (lat, lng, eta) => {
        try {
            const url = `https://api.weather.gc.ca/met/city/v1/coverage/hrdps/point?lat=${lat}&lon=${lng}&format=json`;
            const response = await fetch(url);
            const raw = await response.json();
            
            // Match ETA hour to HRDPS forecast window
            const targetHr = eta.getHours();
            const forecast = raw.forecasts.find(f => new Date(f.time).getHours() === targetHr) || raw.forecasts[0];

            return {
                t: Math.round(forecast.temperature),
                w: Math.round(forecast.wind_speed),
                v: forecast.visibility,
                s: `https://weather.gc.ca/weathericons/${forecast.icon_code}.gif`,
                c: forecast.condition
            };
        } catch (e) {
            console.warn("Fetch Blocked: Check CORS or GeoMet Status");
            return { t: "--", w: "--", v: "--", s: "", c: "OFFLINE" };
        }
    };

    const sync = async () => {
        if (state.isProcessing || !window.map) return;
        
        // Find mission route
        const route = Object.values(window.map._layers).find(l => 
            l.feature?.geometry?.type === "LineString" || (l._latlngs && l._latlngs.length > 0)
        );
        if (!route) return;

        state.isProcessing = true;
        const coords = route.feature ? route.feature.geometry.coordinates.map(c => [c[1], c[0]]) : route._latlngs;
        const speed = window.currentCruisingSpeed || 100;
        const start = window.currentDepartureTime || new Date();

        // Calculate Spatial-Temporal Map
        let totalM = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            totalM += L.latLng(coords[i]).distanceTo(L.latLng(coords[i+1]));
        }
        const totalKm = totalM / 1000;

        const waypointTasks = state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const pos = coords[idx];
            const lat = pos.lat || pos[0];
            const lng = pos.lng || pos[1];
            
            const hoursIn = (totalKm * pct) / speed;
            const eta = new Date(start.getTime() + (hoursIn * 3600000));
            
            const data = await getLeadTimeData(lat, lng, eta);
            return { pos: [lat, lng], eta: eta.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), ...data };
        });

        const results = await Promise.all(waypointTasks);
        render(results);
        state.isProcessing = false;
    };

    const render = (wps) => {
        state.layer.clearLayers();
        let tableRows = "";

        wps.forEach((wp, i) => {
            // Map Marker Rendering
            L.marker(wp.pos, {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div style="background:rgba(20,20,20,0.95); border:2px solid #FFD700; border-radius:10px; width:50px; height:50px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 5px 20px #000;">
                        <img src="${wp.s}" style="width:20px; height:20px;" onerror="this.style.opacity=0">
                        <span style="color:#fff; font-size:12px; font-weight:bold;">${wp.t}°</span>
                    </div>`,
                    iconSize: [50, 50], iconAnchor: [25, 25]
                })
            }).addTo(state.layer);

            // Matrix Table Rendering
            tableRows += `
                <tr style="border-bottom:1px solid rgba(255,215,0,0.2);">
                    <td style="padding:10px 5px; font-weight:bold;">PT ${i+1}</td>
                    <td style="padding:10px 5px; opacity:0.7;">${wp.eta}</td>
                    <td style="padding:10px 5px; color:#FFD700; font-weight:bold;">${wp.t}°C</td>
                    <td style="padding:10px 5px;">${wp.w} km/h</td>
                    <td style="padding:10px 5px;">${wp.v} km</td>
                    <td style="padding:10px 5px; font-size:10px;">${wp.c}</td>
                </tr>`;
        });

        const container = document.getElementById('weong-table-body');
        if (container) container.innerHTML = tableRows;
    };

    return {
        init: function() {
            if (document.getElementById('weong-hud')) return;
            document.body.insertAdjacentHTML('beforeend', `
                <div id="weong-hud" style="position:fixed; top:20px; left:20px; z-index:99999; font-family:monospace; background:rgba(0,0,0,0.92); border:1px solid #FFD700; width:520px; padding:20px; color:#fff; border-radius:15px; box-shadow:0 0 40px #000;">
                    <div style="color:#FFD700; font-weight:bold; font-size:14px; margin-bottom:15px; border-bottom:1px solid #FFD700; padding-bottom:10px; display:flex; justify-content:space-between;">
                        <span>WEONG HRDPS MATRIX [L3]</span>
                        <span style="font-size:9px; opacity:0.5;">CANADA SCALE READY</span>
                    </div>
                    <table style="width:100%; text-align:left; font-size:12px; border-collapse:collapse;">
                        <thead><tr style="color:#FFD700; opacity:0.6; font-size:10px;"><th>NODE</th><th>ETA</th><th>TMP</th><th>WND</th><th>VIS</th><th>SKY</th></tr></thead>
                        <tbody id="weong-table-body"></tbody>
                    </table>
                </div>`);
            state.layer.addTo(window.map);
            
            // Listen for Route or Mission parameter changes
            window.addEventListener('click', () => setTimeout(sync, 500)); 
            window.addEventListener('keyup', () => setTimeout(sync, 500));
            sync();
        }
    };
})();

WeatherEngine.init();
