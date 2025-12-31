/** * Project: [weong-bulletin]
 * Methodology: Reactive HRDPS Grid Mapping
 * Status: Mechanical Data Pipe - RESTORED
 * Logic: Wait for data -> Map 1:1 -> Display. No brain.
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        isOpen: false,
        communities: [
            { name: "Corner Brook", lat: 48.9515, lng: -57.9482 },
            { name: "Grand Falls-Windsor", lat: 48.93, lng: -55.65 },
            { name: "Gander", lat: 48.9578, lng: -54.6122 },
            { name: "Clarenville", lat: 48.16, lng: -53.96 },
            { name: "St. John's", lat: 47.5615, lng: -52.7126 }
        ],
        activeWaypoints: [],
        nodes: [0.15, 0.35, 0.55, 0.75, 0.95]
    };

    // PURE MECHANICAL FETCH
    const getHrdpsGridValue = (arrivalTime) => {
        const hour = arrivalTime.getHours();
        // The core data anchor we are looking for
        const feed = window.weongForecastData || window.hrdpsData || window.weongHRDPS;

        if (feed && feed[hour]) {
            const cell = feed[hour];
            return {
                temp: cell.temp ?? "--",
                wind: cell.wind ?? "--",
                vis:  cell.vis ?? "--",
                sky:  cell.icon || "❓",
                label: cell.condition || "HRDPS"
            };
        }
        return null; // Return null to signal "no data yet"
    };

    const syncCycle = async (force = false) => {
        if (state.isLocked || !window.map) return;
        
        const routeLayer = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!routeLayer) return;

        const coords = routeLayer.feature.geometry.coordinates;
        const speed = window.currentCruisingSpeed || 100;
        const startTime = window.currentDepartureTime instanceof Date ? window.currentDepartureTime : new Date();

        // Calculate Route Distance for ETA mapping
        let totalKm = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            totalKm += L.latLng(coords[i][1], coords[i][0]).distanceTo(L.latLng(coords[i+1][1], coords[i+1][0])) / 1000;
        }

        const currentKey = `${totalKm.toFixed(2)}-${speed}-${startTime.getTime()}`;
        if (currentKey === state.anchorKey && !force) return;

        state.isLocked = true;
        state.anchorKey = currentKey;

        state.activeWaypoints = state.nodes.map(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            const travelHours = (totalKm * pct) / speed; 
            const eta = new Date(startTime.getTime() + (travelHours * 3600000));
            
            const anchor = state.communities.reduce((prev, curr) => {
                return Math.hypot(lat - curr.lat, lng - curr.lng) < Math.hypot(lat - prev.lat, lng - prev.lng) ? curr : prev;
            });

            const gridData = getHrdpsGridValue(eta);

            return {
                name: anchor.name,
                lat, lng,
                timeLabel: eta.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                data: gridData || { temp: "--", wind: "--", vis: "--", sky: "❓", label: "WAITING..." }
            };
        });

        render();
        state.isLocked = false;
    };

    const render = () => {
        state.layer.clearLayers();
        const rows = [];

        state.activeWaypoints.forEach(wp => {
            // Map Marker
            L.marker([wp.lat, wp.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `
                    <div style="background:rgba(10,10,10,0.9); border:1px solid rgba(255,215,0,0.4); border-radius:12px; width:65px; height:65px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; box-shadow:0 8px 20px rgba(0,0,0,0.6);">
                        <div style="font-size:7px; font-weight:bold; background:#FFD700; color:#000; width:100%; text-align:center; position:absolute; top:0; border-radius:11px 11px 0 0; padding:1px 0;">${wp.name.split(' ')[0]}</div>
                        <span style="font-size:20px; margin-top:5px;">${wp.data.sky}</span>
                        <span style="font-size:13px; font-weight:bold;">${wp.data.temp}${wp.data.temp !== "--" ? '°' : ''}</span>
                    </div>`,
                    iconSize: [65, 65],
                    iconAnchor: [32, 32]
                })
            }).addTo(state.layer);

            // Table Row
            rows.push(`
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                    <td style="padding:10px 5px;">${wp.name}</td>
                    <td style="padding:10px 5px; opacity:0.6;">${wp.timeLabel}</td>
                    <td style="padding:10px 5px; font-weight:bold; color:#FFD700;">${wp.data.temp}°C</td>
                    <td style="padding:10px 5px;">${wp.data.wind} km/h</td>
                    <td style="padding:10px 5px;">${wp.data.vis} km</td>
                    <td style="padding:10px 5px;">${wp.data.sky} ${wp.data.label}</td>
                </tr>
            `);
        });

        const container = document.getElementById('bulletin-rows');
        if (container) container.innerHTML = rows.join('');
    };

    const init = () => {
        const style = document.createElement('style');
        style.innerHTML = `.leaflet-routing-container { display: none !important; }`;
        document.head.appendChild(style);

        // UI Initialization
        if(!document.getElementById('bulletin-widget')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="bulletin-widget" style="position:fixed; top:20px; left:20px; z-index:9999; font-family:monospace;">
                    <button onclick="document.getElementById('bulletin-modal').style.display='block'" style="background:#000; color:#FFD700; border:1px solid #FFD700; padding:8px 15px; cursor:pointer; font-weight:bold; border-radius:5px;">WEONG HUD</button>
                    <div id="bulletin-modal" style="display:none; margin-top:10px; background:rgba(0,0,0,0.9); border:1px solid #FFD700; width:550px; padding:15px; color:#fff; border-radius:10px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                            <span style="color:#FFD700;">HRDPS WEONG GRID FEED [L3]</span>
                            <button onclick="document.getElementById('bulletin-modal').style.display='none'" style="background:none; border:none; color:#FFD700; cursor:pointer;">[X]</button>
                        </div>
                        <table style="width:100%; text-align:left; font-size:11px;">
                            <thead><tr style="color:#FFD700; opacity:0.7;"><th>Waypoint</th><th>ETA</th><th>TMP</th><th>WND</th><th>VIS</th><th>SKY</th></tr></thead>
                            <tbody id="bulletin-rows"></tbody>
                        </table>
                    </div>
                </div>`);
        }

        state.layer.addTo(window.map);
        setInterval(syncCycle, 1500); // Check every 1.5s for route/data changes
    };

    return { init };
})();

// AUTO-START
if (window.map) WeatherEngine.init();
else window.addEventListener('load', () => WeatherEngine.init());
