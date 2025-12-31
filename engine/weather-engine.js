/** * Project: [weong-bulletin]
 * Logic: OGC-Features Implementation
 * Strategy: Bypassing legacy directory structures to prevent 404s
 * Status: L3 Deployment
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        nodes: [0, 0.25, 0.5, 0.75, 1],
        // Switched to OGC API for maximum stability
        collection: "https://api.weather.gc.ca/collections/hrdps-continental-all-variables/items"
    };

    const fetchWeatherOGC = async (lat, lng, eta) => {
        try {
            // Precise temporal filter for the arrival window
            const timeISO = eta.toISOString().split('.')[0] + 'Z';
            const bbox = `${lng-0.05},${lat-0.05},${lng+0.05},${lat+0.05}`;
            const url = `${state.collection}?bbox=${bbox}&datetime=${timeISO}&limit=1&f=json`;

            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (!res.ok) throw new Error(`HTTP_${res.status}`);

            const data = await res.json();
            const feature = data.features?.[0]?.properties;

            if (!feature) return null;

            return {
                t: Math.round(feature.temperature || feature.TMP_AGL_2 || 0),
                w: Math.round(feature.wind_speed || feature.WIND_AGL_10 || 0),
                s: feature.icon_code ? `https://weather.gc.ca/weathericons/${feature.icon_code}.gif` : null,
                c: feature.condition || "ACTIVE"
            };
        } catch (e) {
            console.error("OGC API HANDSHAKE FAIL:", e.message);
            return null;
        }
    };

    const refreshNodes = async () => {
        const route = Object.values(window.map._layers).find(l => 
            l.feature?.geometry?.type === "LineString" || (l._latlngs && l._latlngs.length > 0)
        );
        if (!route) return;

        const coords = route.feature ? route.feature.geometry.coordinates.map(c => [c[1], c[0]]) : route._latlngs;
        const speed = window.currentCruisingSpeed || 100;
        const start = window.currentDepartureTime || new Date();

        let totalDist = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            totalDist += L.latLng(coords[i]).distanceTo(L.latLng(coords[i+1])) / 1000;
        }

        const dataSet = await Promise.all(state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const pos = coords[idx];
            const lat = pos.lat || pos[0];
            const lng = pos.lng || pos[1];
            const eta = new Date(start.getTime() + ((totalDist * pct) / speed * 3600000));
            
            const weather = await fetchWeatherOGC(lat, lng, eta);
            return { pos: [lat, lng], eta: eta.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), weather };
        }));

        render(dataSet);
    };

    const render = (results) => {
        state.layer.clearLayers();
        let tableHTML = "";
        results.forEach((r, i) => {
            const w = r.weather;
            if (w) {
                L.marker(r.pos, {
                    icon: L.divIcon({
                        className: 'w-node',
                        html: `<div style="background:rgba(0,0,0,0.9); border:2px solid #FFD700; border-radius:10px; width:48px; height:48px; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                            <img src="${w.s || ''}" style="width:20px; height:20px;">
                            <span style="color:#fff; font-size:11px; font-weight:bold;">${w.t}°</span>
                        </div>`
                    })
                }).addTo(state.layer);
            }
            tableHTML += `<tr><td>${i+1}</td><td>${r.eta}</td><td style="color:#FFD700">${w ? w.t+'°C' : 'OFFLINE'}</td><td>${w ? w.c : 'CHECK_CONSOLE'}</td></tr>`;
        });
        const target = document.getElementById('weong-table-body');
        if (target) target.innerHTML = tableHTML;
    };

    return { init: () => { state.layer.addTo(window.map); window.map.on('moveend', refreshNodes); refreshNodes(); } };
})();

WeatherEngine.init();
