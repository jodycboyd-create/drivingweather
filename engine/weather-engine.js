/** * Project: [weong-bulletin]
 * Methodology: Simple 1:1 HRDPS Data Ingestor
 * Status: Restoration - L3 Alignment [cite: 2025-12-31]
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        communities: [
            { name: "Corner Brook", lat: 48.9515, lng: -57.9482 },
            { name: "Grand Falls", lat: 48.93, lng: -55.65 },
            { name: "Gander", lat: 48.9578, lng: -54.6122 },
            { name: "Clarenville", lat: 48.16, lng: -53.96 },
            { name: "St. John's", lat: 47.5615, lng: -52.7126 }
        ],
        nodes: [0.15, 0.35, 0.55, 0.75, 0.95]
    };

    // PURE FETCH: Loads external HRDPS data into the global window
    const fetchHrdpsData = async () => {
        try {
            // Update this path to your actual HRDPS JSON source
            const response = await fetch('/data/weong-hrps-current.json');
            if (response.ok) {
                window.weongForecastData = await response.json();
                console.log("WEONG: HRDPS Data Ingested Successfully.");
            }
        } catch (e) {
            console.error("WEONG: Fetch failed. Check data source path.");
        }
    };

    const getGridValue = (arrivalTime) => {
        const hour = arrivalTime.getHours();
        const data = window.weongForecastData;
        
        if (data && data[hour]) {
            return {
                temp: data[hour].temp ?? "--",
                wind: data[hour].wind ?? "--",
                vis:  data[hour].vis ?? "--",
                sky:  data[hour].icon || "☁️",
                label: data[hour].condition || "HRDPS"
            };
        }
        return { temp: "--", wind: "--", vis: "--", sky: "❓", label: "NO DATA" };
    };

    const syncCycle = async () => {
        if (state.isLocked || !window.map) return;
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!route) return;

        const coords = route.feature.geometry.coordinates;
        const speed = window.currentCruisingSpeed || 100;
        const start = window.currentDepartureTime instanceof Date ? window.currentDepartureTime : new Date();

        let totalKm = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            totalKm += L.latLng(coords[i][1], coords[i][0]).distanceTo(L.latLng(coords[i+1][1], coords[i+1][0])) / 1000;
        }

        state.isLocked = true;
        const waypoints = state.nodes.map(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            const eta = new Date(start.getTime() + ((totalKm * pct) / speed * 3600000));
            const anchor = state.communities.reduce((prev, curr) => 
                Math.hypot(lat - curr.lat, lng - curr.lng) < Math.hypot(lat - prev.lat, lng - prev.lng) ? curr : prev
            );
            const weather = getGridValue(eta);

            return { name: anchor.name, lat, lng, eta: eta.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), ...weather };
        });

        render(waypoints);
        state.isLocked = false;
    };

    const render = (waypoints) => {
        state.layer.clearLayers();
        const rows = waypoints.map(wp => {
            L.marker([wp.lat, wp.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div style="background:rgba(0,0,0,0.85); border:1px solid #FFD700; border-radius:12px; width:65px; height:65px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff;">
                        <div style="font-size:7px; background:#FFD700; color:#000; width:100%; text-align:center; position:absolute; top:0; border-radius:11px 11px 0 0;">${wp.name}</div>
                        <span style="font-size:22px; margin-top:5px;">${wp.sky}</span>
                        <span style="font-size:14px; font-weight:bold;">${wp.temp}${wp.temp !== "--" ? '°' : ''}</span>
                    </div>`,
                    iconSize: [65, 65], iconAnchor: [32, 32]
                })
            }).addTo(state.layer);

            return `<tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                <td style="padding:10px 5px;">${wp.name}</td>
                <td style="padding:10px 5px; opacity:0.7;">${wp.eta}</td>
                <td style="padding:10px 5px; font-weight:bold; color:#FFD700;">${wp.temp}</td>
                <td style="padding:10px 5px;">${wp.wind}</td>
                <td style="padding:10px 5px;">${wp.vis}</td>
                <td style="padding:10px 5px;">${wp.sky} ${wp.label}</td>
            </tr>`;
        });
        const target = document.getElementById('bulletin-rows');
        if (target) target.innerHTML = rows.join('');
    };

    const init = () => {
        fetchHrdpsData(); // Trigger the fetch immediately
        state.layer.addTo(window.map);
        setInterval(syncCycle, 2000);
    };

    return { init };
})();

WeatherEngine.init();
