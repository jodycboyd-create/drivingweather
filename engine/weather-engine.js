/** * Project: [weong-bulletin]
 * Strategy: Event-Driven Lead-Time Sync
 * Logic: Trigger on Route/Speed/Time change ONLY.
 * Status: Diagnostic Final
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        nodes: [0, 0.25, 0.5, 0.75, 1.0],
        isFetching: false
    };

    const fetchWeatherForRoute = async () => {
        if (state.isFetching || !window.map) return;
        
        // Locate active route layer
        const routeLayer = Object.values(window.map._layers).find(l => 
            l.feature?.geometry?.type === "LineString" || (l._latlngs && l._latlngs.length > 0)
        );
        
        if (!routeLayer) return;
        state.isFetching = true;

        const coords = routeLayer.feature ? routeLayer.feature.geometry.coordinates.map(c => [c[1], c[0]]) : routeLayer._latlngs;
        const speed = window.currentCruisingSpeed || 100;
        const departure = window.currentDepartureTime || new Date();

        // Calculate total distance for temporal mapping
        let totalMeters = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            totalMeters += L.latLng(coords[i]).distanceTo(L.latLng(coords[i+1]));
        }
        const totalKm = totalMeters / 1000;

        const tasks = state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const pos = coords[idx];
            const lat = pos.lat || pos[0];
            const lng = pos.lng || pos[1];

            const hoursTraveled = (totalKm * pct) / speed;
            const arrivalTime = new Date(departure.getTime() + (hoursTraveled * 3600000));
            const targetHour = arrivalTime.getHours();

            try {
                // Precision Point Fetch - MSC GeoMet
                const url = `https://api.weather.gc.ca/met/city/v1/coverage/hrdps/point?lat=${lat}&lon=${lng}&format=json`;
                const res = await fetch(url);
                const raw = await res.json();
                
                // Extract matching temporal index
                const f = raw.forecasts.find(item => new Date(item.time).getHours() === targetHour) || raw.forecasts[0];

                return {
                    pos: [lat, lng],
                    eta: arrivalTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                    data: {
                        t: Math.round(f.temperature),
                        w: Math.round(f.wind_speed),
                        v: f.visibility,
                        s: `https://weather.gc.ca/weathericons/${f.icon_code}.gif`,
                        c: f.condition
                    }
                };
            } catch (e) {
                // L3 Static Fallback if blocked
                return { pos: [lat, lng], eta: "--:--", data: { t: "--", w: "--", v: "--", s: "", c: "OFFLINE" } };
            }
        });

        const results = await Promise.all(tasks);
        render(results);
        state.isFetching = false;
    };

    const render = (results) => {
        state.layer.clearLayers();
        let tableHtml = "";

        results.forEach((r, i) => {
            L.marker(r.pos, {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div style="background:rgba(15,15,15,0.9); border:1px solid #FFD700; border-radius:8px; width:45px; height:45px; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                        <img src="${r.data.s}" style="width:20px; height:20px;" onerror="this.style.opacity=0">
                        <span style="color:#fff; font-size:10px; font-weight:bold;">${r.data.t}°</span>
                    </div>`
                })
            }).addTo(state.layer);

            tableHtml += `<tr style="border-bottom:1px solid rgba(255,215,0,0.15);">
                <td style="padding:10px 0;">NODE ${i+1}</td>
                <td style="opacity:0.6;">${r.eta}</td>
                <td style="color:#FFD700; font-weight:bold;">${r.data.t}°C</td>
                <td>${r.data.w} km/h</td>
                <td>${r.data.v} km</td>
                <td style="font-size:10px;">${r.data.c}</td>
            </tr>`;
        });

        const body = document.getElementById('weong-table-body');
        if (body) body.innerHTML = tableHtml;
    };

    return {
        init: function(routingControl) {
            state.layer.addTo(window.map);
            
            // Listen for Route Generation
            if (routingControl) {
                routingControl.on('routesfound', fetchWeatherForRoute);
                routingControl.on('waypointschanged', fetchWeatherForRoute);
            }

            // Listen for Manual Triggers (Speed/Time)
            window.addEventListener('weong-sync', fetchWeatherForRoute);
            
            // Initial Load
            fetchWeatherForRoute();
        }
    };
})();

// Integration
WeatherEngine.init(window.control);
