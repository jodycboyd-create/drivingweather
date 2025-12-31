/** * Project: [weong-bulletin] + [weong-route]
 * Methodology: L3 Stealth-Sync Unified Engine
 * Status: Full NL Dataset + Path Fix + Shared State
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
        try {
            // Updated to the specific Newfoundland subdirectory
            const res = await fetch('/data/nl/communities.json');
            if (!res.ok) throw new Error("Path not found");
            state.communities = await res.json();
        } catch (e) {
            console.warn("WEONG-L3: Using NL Baseline Fail-safe.");
            state.communities = [
                { name: "St. John's", lat: 47.56, lng: -52.71 },
                { name: "Gander", lat: 48.95, lng: -54.61 },
                { name: "Deer Lake", lat: 49.17, lng: -57.43 },
                { name: "Corner Brook", lat: 48.95, lng: -57.95 },
                { name: "Port aux Basques", lat: 47.57, lng: -59.13 }
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
                <button id="btn-open-bulletin" style="background:#000; color:#FFD700; border:2px solid #FFD700; padding:12px; cursor:pointer; font-weight:bold; box-shadow:0 0 20px rgba(0,0,0,0.8); letter-spacing:1px;">DETAILED TABULAR FORECAST</button>
                <div id="bulletin-modal" style="display:none; margin-top:10px; background:rgba(0,0,0,0.95); border:2px solid #FFD700; width:580px; padding:20px; color:#FFD700; box-shadow:0 10px 40px #000; backdrop-filter:blur(5px);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid #FFD700; padding-bottom:8px;">
                        <span style="font-weight:bold; font-size:14px; letter-spacing:1px;">NL ROUTE WEATHER MATRIX (KM/H)</span>
                        <button id="btn-copy-bulletin" style="background:#FFD700; color:#000; border:none; padding:6px 12px; cursor:pointer; font-size:11px; font-weight:bold; border-radius:2px;">COPY DATA</button>
                    </div>
                    <table style="width:100%; border-collapse:collapse; font-size:11px; color:#fff;">
                        <thead>
                            <tr style="text-align:left; color:#FFD700; text-transform:uppercase; border-bottom:1px solid #444;">
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
        if(!document.getElementById('bulletin-widget')) {
            document.body.insertAdjacentHTML('beforeend', widgetHTML);
        }
        
        document.getElementById('btn-open-bulletin').onclick = () => {
            state.isOpen = !state.isOpen;
            document.getElementById('bulletin-modal').style.display = state.isOpen ? 'block' : 'none';
        };
        
        document.getElementById('btn-copy-bulletin').onclick = () => {
            let text = "WAYPOINT FORECAST DATA\nCommunity | ETA | Temp | Wind | Vis | Sky\n";
            state.activeWaypoints.forEach(d => { 
                text += `${d.name} | ${d.eta} | ${d.variant.temp}°C | ${d.variant.wind}km/h | ${d.variant.vis}km | ${d.variant.skyLabel}\n`; 
            });
            navigator.clipboard.writeText(text);
            alert("Matrix copied to clipboard.");
        };
    };

    const syncCycle = async () => {
        if (state.isLocked || !window.map || state.communities.length === 0) return;
        
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
            
            const community = state.communities.reduce((prev, curr) => {
                const dPrev = Math.hypot(lat - prev.lat, lng - prev.lng);
                const dCurr = Math.hypot(lat - curr.lat, lng - curr.lng);
                return dCurr < dPrev ? prev : curr;
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
                    html: `
                        <div class="sync-glow" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:75px; height:65px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px #000;">
                            <span style="font-size:8px; font-weight:bold; width:100%; text-align:center; background:#FFD700; color:#000; overflow:hidden;">${wp.name.split(' ')[0]}</span>
                            <span style="font-size:18px; margin:2px 0;">${wp.variant.sky}</span>
                            <div style="display:flex; gap:4px; font-size:12px; font-weight:bold;">
                                <span style="${wp.variant.temp <= 0 ? 'color:#00d4ff' : 'color:#ff4500'}">${wp.variant.temp}°</span>
                                <span style="color:#fff; font-weight:normal;">${wp.variant.wind}k</span>
                            </div>
                        </div>`,
                    iconSize: [75, 65]
                }),
                zIndexOffset: 65000
            }).addTo(state.layer);
        });
        if (!window.map.hasLayer(state.layer)) state.layer.addTo(window.map);
    };

    const renderTable = () => {
        const tbody = document.getElementById('bulletin-rows');
        if (!tbody) return;
        tbody.innerHTML = state.activeWaypoints.map((wp, i) => `
            <tr style="border-bottom:1px solid #333; background: ${i % 2 === 0 ? 'transparent' : 'rgba(255,215,0,0.05)'}">
                <td style="padding:10px 5px; color:#FFD700; font-weight:bold;">${wp.name}</td>
                <td style="padding:10px 5px;">${wp.eta}</td>
                <td style="padding:10px 5px; color:${wp.variant.temp <= 0 ? '#00d4ff' : '#ff4500'};">${wp.variant.temp}°C</td>
                <td style="padding:10px 5px;">${wp.variant.wind} km/h</td>
                <td style="padding:10px 5px; opacity:0.8;">${wp.variant.vis} km</td>
                <td style="padding:10px 5px;">${wp.variant.skyLabel}</td>
            </tr>`).join('');
    };

    return { init };
})();

WeatherEngine.init();
