/** * Project: [weong-bulletin]
 * Methodology: L3 Live-Sync Unified Engine
 * Status: Replacing Artificial Math with GFS Real-Data [cite: 2025-12-31]
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        isOpen: false,
        communities: [],
        activeWaypoints: [],
        nodes: [0.15, 0.35, 0.55, 0.75, 0.95]
    };

    // Mapping Open-Meteo codes to your existing UI icons [cite: 2025-12-31]
    const interpretCode = (code) => {
        if (code <= 1) return { sky: "☀️", label: "Clear" };
        if (code <= 3) return { sky: "🌤️", label: "P.Cloudy" };
        if (code <= 65) return { sky: "🌧️", label: "Rain" };
        if (code <= 75) return { sky: "❄️", label: "Snow" };
        return { sky: "☁️", label: "Overcast" };
    };

    const init = async () => {
        try {
            // Hardened NL Baseline as requested [cite: 2025-12-26]
            state.communities = [
                { name: "Gander", lat: 48.9578, lng: -54.6122 },
                { name: "St. John's", lat: 47.5615, lng: -52.7126 },
                { name: "Corner Brook", lat: 48.9515, lng: -57.9482 },
                { name: "Grand Falls-Windsor", lat: 48.93, lng: -55.65 },
                { name: "Clarenville", lat: 48.16, lng: -53.96 }
            ];
            console.log("WEONG: NL Live-Sync Engine Initialized.");
        } catch (e) { console.error("Init Error", e); }
        initUI();
        state.layer.addTo(window.map);
        setInterval(syncCycle, 5000); // 5s cycle for stability
    };

    // NEW: Real Meteorological Fetch [cite: 2025-12-31]
    const getRealForecast = async (lat, lng, arrival) => {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,wind_speed_10m,weather_code,visibility&wind_speed_unit=kmh&timezone=auto`;
            const res = await fetch(url);
            const json = await res.json();
            
            const target = arrival.toISOString().split(':')[0] + ":00";
            const idx = json.hourly.time.indexOf(target);
            const i = idx !== -1 ? idx : 0;

            const weather = interpretCode(json.hourly.weather_code[i]);

            return {
                temp: Math.round(json.hourly.temperature_2m[i]),
                wind: Math.round(json.hourly.wind_speed_10m[i]),
                vis: (json.hourly.visibility[i] / 1000).toFixed(1),
                sky: weather.sky,
                skyLabel: weather.label
            };
        } catch (e) {
            return { temp: 0, wind: 0, vis: 0, sky: "❓", skyLabel: "ERR" };
        }
    };

    const initUI = () => {
        // ... (Your existing UI button and modal logic remains exactly as is)
        if(!document.getElementById('bulletin-widget')) {
            // Re-inserting your specific HTML from image_e5c801.jpg
            document.body.insertAdjacentHTML('beforeend', `
                <div id="bulletin-widget" style="position:fixed; top:20px; left:20px; z-index:70000; font-family:monospace;">
                    <button id="btn-open-bulletin" style="background:#000; color:#FFD700; border:2px solid #FFD700; padding:12px; font-weight:bold;">DETAILED TABULAR FORECAST</button>
                    <div id="bulletin-modal" style="display:none; margin-top:10px; background:rgba(0,0,0,0.95); border:2px solid #FFD700; width:580px; padding:20px; color:#FFD700;">
                        <span style="font-weight:bold;">NL ROUTE WEATHER MATRIX</span>
                        <table style="width:100%; color:#fff; font-size:11px; margin-top:10px;">
                            <thead><tr style="color:#FFD700;"><th>Community</th><th>ETA</th><th>Temp</th><th>Wind</th><th>Vis</th><th>Sky</th></tr></thead>
                            <tbody id="bulletin-rows"></tbody>
                        </table>
                    </div>
                </div>`);
        }
        document.getElementById('btn-open-bulletin').onclick = () => {
            state.isOpen = !state.isOpen;
            document.getElementById('bulletin-modal').style.display = state.isOpen ? 'block' : 'none';
        };
    };

    const syncCycle = async () => {
        if (state.isLocked || !window.map) return;
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString" || (l._latlngs && l._latlngs.length > 0));
        if (!route) return;

        const coords = route.feature ? route.feature.geometry.coordinates : route.getLatLngs().map(p => [p.lng, p.lat]);
        const currentKey = `${coords[0][0].toFixed(3)}-${coords.length}`;
        if (currentKey === state.anchorKey) return;

        state.isLocked = true;
        state.anchorKey = currentKey;
        const depTime = window.currentDepartureTime || new Date();
        
        // Process nodes with real weather [cite: 2025-12-31]
        const rawWaypoints = state.nodes.map(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            const arrival = new Date(depTime.getTime() + (pct * 5) * 3600000); // 5H sample trip
            
            const community = state.communities.reduce((prev, curr) => {
                const dPrev = Math.hypot(lat - prev.lat, lng - prev.lng);
                const dCurr = Math.hypot(lat - curr.lat, lng - curr.lng);
                return dCurr < dPrev ? curr : prev;
            });

            return { ...community, arrival };
        });

        // Fetch all weather data in parallel
        state.activeWaypoints = await Promise.all(rawWaypoints.map(async (wp) => {
            const variant = await getRealForecast(wp.lat, wp.lng, wp.arrival);
            return {
                ...wp,
                eta: wp.arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                variant
            };
        }));

        renderIcons();
        renderTable();
        state.isLocked = false;
    };

    const renderIcons = () => {
        state.layer.clearLayers();
        state.activeWaypoints.forEach(wp => {
            L.marker([wp.lat, wp.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div style="background:#000; border:2px solid #FFD700; color:#FFD700; width:75px; height:65px; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                            <span style="font-size:8px; background:#FFD700; color:#000; width:100%; text-align:center;">${wp.name}</span>
                            <span style="font-size:18px;">${wp.variant.sky}</span>
                            <div style="font-size:12px; font-weight:bold;">${wp.variant.temp}° | ${wp.variant.wind}k</div>
                        </div>`,
                    iconSize: [75, 65]
                })
            }).addTo(state.layer);
        });
    };

    const renderTable = () => {
        const container = document.getElementById('bulletin-rows');
        if (!container) return;
        container.innerHTML = state.activeWaypoints.map(wp => `
            <tr style="border-bottom:1px solid #222;">
                <td style="padding:8px 5px;">${wp.name}</td>
                <td style="padding:8px 5px;">${wp.eta}</td>
                <td style="padding:8px 5px; color:${wp.variant.temp <= 0 ? '#00d4ff' : '#ff4500'}">${wp.variant.temp}°C</td>
                <td style="padding:8px 5px;">${wp.variant.wind} km/h</td>
                <td style="padding:8px 5px;">${wp.variant.vis} km</td>
                <td style="padding:8px 5px;">${wp.variant.skyLabel} ${wp.variant.sky}</td>
            </tr>`).join('');
    };

    return { init };
})();

WeatherEngine.init();
