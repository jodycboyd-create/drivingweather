/** * Project: [weong-bulletin] + [weong-route]
 * Methodology: L3 Stealth-Sync Unified Engine
 * Status: Absolute Path Hardening + Shared State [cite: 2025-12-30]
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

    const init = async () => {
        // 1. IMMEDIATE FEEDBACK: Place a marker before fetching data
        // This confirms the engine is running and Gander's baseline is active.
        state.layer.addTo(window.map);
        const diagnosticMarker = L.marker([48.9578, -54.6122], {
            icon: L.divIcon({
                className: 'diag-node',
                html: `<div style="background:red; color:white; border:2px solid white; padding:5px; font-size:10px; font-weight:bold; width:80px; text-align:center;">SYSTEM READY:<br>GANDER HUB</div>`,
                iconSize: [80, 40]
            })
        }).addTo(state.layer);

        console.log("WeatherEngine: Diagnostic marker placed. Attempting data handshake...");

        try {
            // 2. HARDENED FETCH: Using the Deep Dive NL path
            const res = await fetch('/data/nl/communities.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const rawData = await res.json();
            
            // Map GeoJSON structure to engine state
            state.communities = rawData.features.map(f => ({
                name: f.properties.name,
                lat: f.geometry.coordinates[1],
                lng: f.geometry.coordinates[0]
            }));
            
            // Success: Remove diagnostic and start cycle
            state.layer.removeLayer(diagnosticMarker);
            console.log(`System: NL Dataset Active (${state.communities.length} nodes)`);
        } catch (e) {
            console.warn("WEONG-L3: Network 404/Error. Falling back to internal baseline.");
            // Update diagnostic to show fallback mode
            diagnosticMarker.setTooltipContent("FALLBACK MODE");
            state.communities = [
                { name: "Gander", lat: 48.9578, lng: -54.6122 },
                { name: "St. John's", lat: 47.5615, lng: -52.7126 },
                { name: "Corner Brook", lat: 48.9515, lng: -57.9482 }
            ];
        }

        initUI();
        setInterval(syncCycle, 1000);
    };

    const getForecastVariation = (lat, lng, hour) => {
        const seed = lat + lng + hour;
        const icons = ["☀️", "🌤️", "☁️", "❄️"];
        const labels = ["Clear", "P.Cloudy", "Overcast", "Snow Flurries"];
        const idx = Math.abs(Math.floor(seed % 4));
        return {
            temp: Math.round(-5 + (Math.sin(seed) * 3)),
            wind: Math.round(35 + (Math.cos(seed) * 15)),
            vis: Math.round(15 + (Math.sin(seed * 2) * 10)),
            sky: icons[idx],
            skyLabel: labels[idx]
        };
    };

    const initUI = () => {
        const widgetHTML = `
            <div id="bulletin-widget" style="position:fixed; top:20px; left:20px; z-index:70000; font-family:monospace;">
                <button id="btn-open-bulletin" style="background:#000; color:#FFD700; border:2px solid #FFD700; padding:12px; cursor:pointer; font-weight:bold; box-shadow:0 0 20px rgba(0,0,0,0.8);">DETAILED TABULAR FORECAST</button>
                <div id="bulletin-modal" style="display:none; margin-top:10px; background:rgba(0,0,0,0.95); border:2px solid #FFD700; width:580px; padding:20px; color:#FFD700; box-shadow:0 10px 40px #000; backdrop-filter:blur(5px);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid #FFD700; padding-bottom:8px;">
                        <span style="font-weight:bold; font-size:14px;">NL ROUTE WEATHER MATRIX</span>
                        <button id="btn-copy-bulletin" style="background:#FFD700; color:#000; border:none; padding:6px 12px; cursor:pointer; font-size:11px; font-weight:bold;">COPY DATA</button>
                    </div>
                    <table style="width:100%; border-collapse:collapse; font-size:11px; color:#fff;">
                        <thead>
                            <tr style="text-align:left; color:#FFD700; border-bottom:1px solid #444;">
                                <th style="padding:8px 5px;">Community</th>
                                <th style="padding:8px 5px;">ETA</th>
                                <th style="padding:8px 5px;">Temp</th>
                                <th style="padding:8px 5px;">Wind</th>
                                <th style="padding:8px 5px;">Vis</th>
                                <th style="padding:8px 5px;">Sky</th>
                            </tr>
                        </thead>
                        <tbody id="bulletin-rows"></tbody>
                    </table>
                </div>
            </div>`;
        if(!document.getElementById('bulletin-widget')) document.body.insertAdjacentHTML('beforeend', widgetHTML);
        
        document.getElementById('btn-open-bulletin').onclick = () => {
            state.isOpen = !state.isOpen;
            document.getElementById('bulletin-modal').style.display = state.isOpen ? 'block' : 'none';
        };
    };

    const syncCycle = async () => {
        if (state.isLocked || !window.map || state.communities.length === 0) return;
        
        // Find the active route line generated by route-engine.js
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!route) return;

        const coords = route.feature.geometry.coordinates;
        const currentKey = `${coords[0][0].toFixed(4)}-${coords.length}`;
        if (currentKey === state.anchorKey) return;

        state.isLocked = true;
        state.anchorKey = currentKey;
        const depTime = window.currentDepartureTime instanceof Date ? window.currentDepartureTime : new Date();
        
        state.activeWaypoints = state.nodes.map(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            const arrival = new Date(depTime.getTime() + (pct * 8) * 3600000);
            
            // Logic Fix: Ensure closest community is found [cite: 2025-12-30]
            const community = state.communities.reduce((prev, curr) => {
                const dPrev = Math.hypot(lat - prev.lat, lng - prev.lng);
                const dCurr = Math.hypot(lat - curr.lat, lng - curr.lng);
                return dCurr < dPrev ? curr : prev;
            });

            return {
                ...community,
                eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                variant: getForecastVariation(community.lat, community.lng, arrival.getHours())
            };
        });

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
                    html: `<div style="background:#000; border:2px solid #FFD700; border-radius:4px; width:75px; height:65px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px #000;">
                            <span style="font-size:8px; font-weight:bold; background:#FFD700; color:#000; width:100%; text-align:center;">${wp.name.split(' ')[0]}</span>
                            <span style="font-size:18px;">${wp.variant.sky}</span>
                            <div style="display:flex; gap:4px; font-size:12px; font-weight:bold;">
                                <span style="${wp.variant.temp <= 0 ? 'color:#00d4ff' : 'color:#ff4500'}">${wp.variant.temp}°</span>
                                <span style="color:#fff;">${wp.variant.wind}k</span>
                            </div>
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
            </tr>
        `).join('');
    };

    return { init };
})();

// Initialize
WeatherEngine.init();
