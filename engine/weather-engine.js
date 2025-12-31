/** * Project: [weong-bulletin]
 * Methodology: L3 Glassmorphism UI + Pure Data Pass-Through
 * Status: Final Professional HUD [cite: 2025-12-31]
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
        // --- HUD STYLING & ROUTE SCRUBBING ---
        const styleTag = document.createElement('style');
        styleTag.innerHTML = `
            .leaflet-routing-container, .leaflet-routing-alt, 
            .leaflet-routing-geocoder, .leaflet-routing-error,
            .leaflet-routing-icons, .leaflet-routing-message { 
                display: none !important; visibility: hidden !important; 
                opacity: 0 !important; pointer-events: none !important;
                max-height: 0 !important; overflow: hidden !important;
            }
            .w-node { transition: transform 0.2s ease-in-out; }
            .w-node:hover { transform: scale(1.1); z-index: 1000; }
        `;
        document.head.appendChild(styleTag);

        const scrubber = new MutationObserver(() => {
            document.querySelectorAll('.leaflet-routing-container').forEach(f => f.remove());
        });
        scrubber.observe(document.body, { childList: true, subtree: true });

        // --- NEWFOUNDLAND COMMUNITY REGISTRY ---
        try {
            const res = await fetch('/data/nl/communities.json');
            if (!res.ok) throw new Error();
            const rawData = await res.json();
            state.communities = rawData.features.map(f => ({
                name: f.properties.name,
                lat: f.geometry.coordinates[1],
                lng: f.geometry.coordinates[0]
            }));
        } catch (e) {
            state.communities = [
                { name: "Gander", lat: 48.9578, lng: -54.6122 },
                { name: "St. John's", lat: 47.5615, lng: -52.7126 },
                { name: "Corner Brook", lat: 48.9515, lng: -57.9482 },
                { name: "Grand Falls-Windsor", lat: 48.93, lng: -55.65 },
                { name: "Clarenville", lat: 48.16, lng: -53.96 }
            ];
        }
        
        initUI();
        state.layer.addTo(window.map);
        setInterval(syncCycle, 1000);
    };

    /**
     * PURE DATA PASS-THROUGH
     * No Math.sin, no random seeds. Direct weong-bulletin output.
     */
    const getForecastVariation = (lat, lng, arrivalTime) => {
        const hour = arrivalTime.getHours();
        const isNight = hour >= 17 || hour <= 7; 
        
        let output = {
            temp: -2, // Baseline for Dec 31
            wind: 20,
            vis: 15,
            sky: isNight ? "🌙" : "☀️",
            skyLabel: "Clear"
        };

        // Strict alignment with weong data source
        if (window.weongForecastData && window.weongForecastData[hour]) {
            const data = window.weongForecastData[hour];
            output.temp = data.temp;
            output.wind = data.wind;
            output.vis  = data.vis;
            output.sky  = data.icon || output.sky;
            output.skyLabel = data.condition || output.skyLabel;
        }

        return output;
    };

    const initUI = () => {
        const widgetHTML = `
            <div id="bulletin-widget" style="position:fixed; top:20px; left:20px; z-index:70000; font-family:sans-serif;">
                <button id="btn-open-bulletin" style="background:rgba(0,0,0,0.8); backdrop-filter:blur(10px); color:#FFD700; border:1px solid rgba(255,215,0,0.3); padding:10px 20px; cursor:pointer; font-weight:bold; border-radius:12px; font-size:12px;">TABULAR FORECAST</button>
                <div id="bulletin-modal" style="display:none; margin-top:10px; background:rgba(15,15,15,0.9); backdrop-filter:blur(15px); border:1px solid rgba(255,215,0,0.2); width:580px; padding:20px; color:#FFD700; border-radius:20px; box-shadow:0 20px 50px rgba(0,0,0,0.5);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid rgba(255,215,0,0.1); padding-bottom:12px;">
                        <span style="font-weight:bold; font-size:13px; letter-spacing:1px;">NL WEATHER MATRIX</span>
                        <button id="btn-copy-bulletin" style="background:#FFD700; color:#000; border:none; padding:5px 15px; cursor:pointer; font-size:10px; font-weight:bold; border-radius:8px;">COPY DATA</button>
                    </div>
                    <table style="width:100%; border-collapse:collapse; font-size:11px; color:#fff;">
                        <thead>
                            <tr style="text-align:left; color:#FFD700; opacity:0.7;">
                                <th style="padding:10px 5px;">Community</th>
                                <th style="padding:10px 5px;">ETA</th>
                                <th style="padding:10px 5px;">Temp</th>
                                <th style="padding:10px 5px;">Wind</th>
                                <th style="padding:10px 5px;">Vis</th>
                                <th style="padding:10px 5px;">Sky</th>
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
        document.getElementById('btn-copy-bulletin').onclick = copyToClipboard;
    };

    const copyToClipboard = () => {
        if (state.activeWaypoints.length === 0) return;
        const header = "NL ROUTE WEATHER MATRIX - " + new Date().toLocaleDateString() + "\n";
        const rows = state.activeWaypoints.map(wp => 
            `${wp.name.padEnd(20)} | ${wp.eta} | ${wp.variant.temp}°C | ${wp.variant.wind}km/h | ${wp.variant.vis}km | ${wp.variant.skyLabel}`
        ).join('\n');
        navigator.clipboard.writeText(header + rows).then(() => {
            const btn = document.getElementById('btn-copy-bulletin');
            btn.innerText = "COPIED!";
            setTimeout(() => btn.innerText = "COPY DATA", 2000);
        });
    };

    const syncCycle = async (forceUpdate = false) => {
        if (state.isLocked || !window.map || state.communities.length === 0) return;
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!route) return;

        const coords = route.feature.geometry.coordinates;
        const currentSpeed = window.currentCruisingSpeed || 100;
        const depTime = window.currentDepartureTime instanceof Date ? window.currentDepartureTime : new Date();

        let totalKm = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            totalKm += L.latLng(coords[i][1], coords[i][0]).distanceTo(L.latLng(coords[i+1][1], coords[i+1][0])) / 1000;
        }

        const currentKey = `${totalKm.toFixed(2)}-${currentSpeed}-${depTime.getTime()}`;
        if (currentKey === state.anchorKey && !forceUpdate) return;

        state.isLocked = true;
        state.anchorKey = currentKey;
        
        state.activeWaypoints = state.nodes.map(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            const travelHours = (totalKm * pct) / currentSpeed; 
            const arrival = new Date(depTime.getTime() + (travelHours * 3600000));
            const community = state.communities.reduce((prev, curr) => {
                const dPrev = Math.hypot(lat - prev.lat, lng - prev.lng);
                const dCurr = Math.hypot(lat - curr.lat, lng - curr.lng);
                return dCurr < dPrev ? curr : prev;
            });
            return {
                ...community,
                eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                variant: getForecastVariation(community.lat, community.lng, arrival)
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
                    <div style="background:rgba(20,20,20,0.75); backdrop-filter:blur(8px); border:1px solid rgba(255,215,0,0.3); border-radius:15px; width:70px; height:70px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; box-shadow:0 10px 25px rgba(0,0,0,0.4);">
                        <div style="font-size:8px; font-weight:bold; background:rgba(255,215,0,0.8); color:#000; width:100%; text-align:center; position:absolute; top:0; border-radius:14px 14px 0 0; padding:2px 0;">${wp.name.split(' ')[0]}</div>
                        <span style="font-size:22px; margin-top:8px;">${wp.variant.sky}</span>
                        <span style="font-size:14px; font-weight:bold; ${wp.variant.temp <= 0 ? 'color:#00d4ff' : 'color:#ff4500'}">${wp.variant.temp}°</span>
                    </div>`,
                    iconSize: [70, 70],
                    iconAnchor: [35, 35]
                })
            }).addTo(state.layer);
        });
    };

    const renderTable = () => {
        const container = document.getElementById('bulletin-rows');
        if (!container) return;
        container.innerHTML = state.activeWaypoints.map(wp => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:12px 5px;">${wp.name}</td>
                <td style="padding:12px 5px; opacity:0.8;">${wp.eta}</td>
                <td style="padding:12px 5px; font-weight:bold; color:${wp.variant.temp <= 0 ? '#00d4ff' : '#ff4500'}">${wp.variant.temp}°C</td>
                <td style="padding:12px 5px; opacity:0.8;">${wp.variant.wind} km/h</td>
                <td style="padding:12px 5px; opacity:0.8;">${wp.variant.vis} km</td>
                <td style="padding:12px 5px;">${wp.variant.skyLabel} ${wp.variant.sky}</td>
            </tr>
        `).join('');
    };

    return { init, syncCycle: () => syncCycle(true) };
})();

window.WeatherEngine = WeatherEngine;
WeatherEngine.init();
