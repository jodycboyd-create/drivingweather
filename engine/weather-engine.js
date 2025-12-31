/** * Project: [weong-bulletin]
 * Logic: WMS Ground-Truth Overlay + Point-Fetch Debugger
 * Strategy: Visual confirmation of HRDPS grid availability
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        wmsLayer: null,
        nodes: [0, 0.25, 0.5, 0.75, 1]
    };

    // WMS Layer: Real-time HRDPS Temperature Overlay
    const initWMS = () => {
        state.wmsLayer = L.tileLayer.wms('https://geo.weather.gc.ca/geomet', {
            layers: 'HRDPS.CONTINENTAL_TMP',
            format: 'image/png',
            transparent: true,
            opacity: 0.4,
            attribution: 'MSC GeoMet'
        }).addTo(window.map);
    };

    const fetchDebugData = async (lat, lng, eta) => {
        // Rounding to 2 decimal places to ensure grid-cell hit
        const nLat = parseFloat(lat).toFixed(2);
        const nLng = parseFloat(lng).toFixed(2);
        
        try {
            const url = `https://api.weather.gc.ca/met/city/v1/coverage/hrdps/point?lat=${nLat}&lon=${nLng}&format=json`;
            const res = await fetch(url, { headers: { 'User-Agent': 'WEONG-Diagnostic-User' } });
            
            if (!res.ok) {
                console.error(`NODE_FAIL: ${res.status} at ${nLat}, ${nLng}`);
                return null;
            }
            
            const json = await res.json();
            const targetHr = eta.getHours();
            const f = json.forecasts.find(it => new Date(it.time).getHours() === targetHr) || json.forecasts[0];

            return {
                t: Math.round(f.temperature),
                w: Math.round(f.wind_speed),
                s: f.icon_code ? `https://weather.gc.ca/weathericons/${f.icon_code}.gif` : null,
                c: f.condition || "DATA_SYNC"
            };
        } catch (e) { return null; }
    };

    const runDiagnostic = async () => {
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
            
            const weather = await fetchDebugData(lat, lng, eta);
            return { pos: [lat, lng], weather, status: weather ? 'OK' : 'FAIL' };
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
                        html: `<div style="background:rgba(0,0,0,0.8); border:2px solid #FFD700; border-radius:8px; width:45px; height:45px; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                            <img src="${w.s}" style="width:20px; height:20px;">
                            <span style="color:#fff; font-size:10px; font-weight:bold;">${w.t}°</span>
                        </div>`
                    })
                }).addTo(state.layer);
            }
            rows += `<tr><td>NODE ${i+1}</td><td style="color:${w ? '#FFD700' : '#ff4d4d'}">${r.status}</td><td>${w ? w.t+'°C' : '--'}</td><td>${w ? w.c : 'API_ERR'}</td></tr>`;
        });
        const table = document.getElementById('weong-table-body');
        if (table) table.innerHTML = rows;
    };

    return {
        init: function() {
            initWMS();
            state.layer.addTo(window.map);
            window.map.on('moveend dragend', runDiagnostic);
            runDiagnostic();
        }
    };
})();

WeatherEngine.init();
