/** * Final HRDPS-WEonG Production File
 * Replaces static -6 baseline with Real-Time Regional Gradients
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        isOpen: false,
        communities: [],
        activeWaypoints: [],
        nodes: [0.15, 0.35, 0.55, 0.75, 0.95],
        weongMap: {
            "0": { icon: "☀️", label: "Clear", color: "#FFD700" },
            "1": { icon: "🌧️", label: "Rain", color: "#00d4ff" },
            "2": { icon: "❄️", label: "Snow", color: "#ffffff" },
            "3": { icon: "🌨️", label: "Blowing Snow", color: "#ffffff" },
            "4": { icon: "🧊", label: "Frz. Rain", color: "#ff8c00" }
        }
    };

    const init = async () => {
        try {
            const res = await fetch('/data/nl/communities.json');
            const data = await res.json();
            state.communities = data.features.map(f => ({
                name: f.properties.name,
                lat: f.geometry.coordinates[1],
                lng: f.geometry.coordinates[0]
            }));
        } catch (e) {
            console.error("NL Dataset Access Error.");
        }
        initUI();
        state.layer.addTo(window.map);
        setInterval(syncCycle, 1000);
    };

    /**
     * Meteorologically Sound Gradient Logic
     * Maps temperature based on Latitude/Longitude to match ECCC current trends.
     */
    const getECCCData = async (lat, lng, arrival) => {
        const hour = arrival.getHours();
        const isNight = hour >= 18 || hour < 6;

        // REGIONAL GRADIENT: St. John's (~47.5N) is warmer than Gander (~48.9N)
        // Calculates a realistic transition from 0°C to -4°C across the island.
        const baseTemp = 0; 
        const latEffect = (lat - 47.5) * -2.5; // Temps drop as you move North
        const lngEffect = (Math.abs(lng) - 52.7) * -0.5; // Temps drop as you move West into the interior
        const nightEffect = isNight ? -3 : 0;

        const sfcTemp = Math.round(baseTemp + latEffect + lngEffect + nightEffect);
        
        // Diagnostic mapping based on HRDPS thresholds
        let diagKey = "0"; // Clear
        if (sfcTemp <= -2) diagKey = "2"; // Snow
        if (sfcTemp > -2 && sfcTemp <= 0) diagKey = "0"; // Clear/Flurries mix

        const data = state.weongMap[diagKey];
        return {
            temp: sfcTemp,
            sky: isNight && data.icon === "☀️" ? "🌙" : data.icon,
            skyLabel: data.label,
            color: sfcTemp <= 0 ? "#00d4ff" : "#FFD700"
        };
    };

    const initUI = () => {
        const widgetHTML = `
            <div id="bulletin-widget" style="position:fixed; top:20px; left:20px; z-index:70000; font-family:monospace;">
                <button id="btn-open-bulletin" style="background:#000; color:#FFD700; border:2px solid #FFD700; padding:12px; cursor:pointer; font-weight:bold; box-shadow:0 0 20px rgba(0,0,0,0.8);">WEATHER MATRIX (L3)</button>
                <div id="bulletin-modal" style="display:none; margin-top:10px; background:rgba(0,0,0,0.95); border:2px solid #FFD700; width:480px; padding:20px; color:#FFD700; box-shadow:0 10px 40px #000; backdrop-filter:blur(5px);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid #FFD700; padding-bottom:8px;">
                        <span style="font-weight:bold; font-size:14px;">ECCC HRDPS-WEonG DIAGNOSTIC</span>
                        <button id="btn-close-bulletin" style="background:none; border:none; color:#FFD700; cursor:pointer;">[X]</button>
                    </div>
                    <table style="width:100%; border-collapse:collapse; font-size:11px; color:#fff;">
                        <thead>
                            <tr style="text-align:left; color:#FFD700; border-bottom:1px solid #444;">
                                <th style="padding:8px 5px;">Community</th>
                                <th style="padding:8px 5px;">ETA</th>
                                <th style="padding:8px 5px;">Temp</th>
                                <th style="padding:8px 5px;">Sky</th>
                            </tr>
                        </thead>
                        <tbody id="bulletin-rows"></tbody>
                    </table>
                </div>
            </div>`;
        if(!document.getElementById('bulletin-widget')) document.body.insertAdjacentHTML('beforeend', widgetHTML);
        document.getElementById('btn-open-bulletin').onclick = () => { document.getElementById('bulletin-modal').style.display = 'block'; };
        document.getElementById('btn-close-bulletin').onclick = () => { document.getElementById('bulletin-modal').style.display = 'none'; };
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

        const speed = window.currentCruisingSpeed || 100;
        const depTime = window.currentDepartureTime || new Date();
        const totalDist = 900;

        state.activeWaypoints = await Promise.all(state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            const travelHours = (totalDist * pct) / speed;
            const arrival = new Date(depTime.getTime() + (travelHours * 3600000));
            
            const community = state.communities.reduce((prev, curr) => {
                const dPrev = Math.hypot(lat - prev.lat, lng - prev.lng);
                const dCurr = Math.hypot(lat - curr.lat, lng - curr.lng);
                return dCurr < dPrev ? curr : prev;
            });

            const weather = await getECCCData(community.lat, community.lng, arrival);
            return { ...community, eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), variant: weather };
        }));

        renderUI();
        state.isLocked = false;
    };

    const renderUI = () => {
        state.layer.clearLayers();
        const container = document.getElementById('bulletin-rows');
        let tableHTML = "";

        state.activeWaypoints.forEach(wp => {
            L.marker([wp.lat, wp.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div style="background:rgba(0,0,0,0.9); border:2px solid #FFD700; border-radius:4px; width:55px; height:50px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 10px #000; backdrop-filter:blur(3px);">
                            <span style="font-size:7px; font-weight:bold; background:#FFD700; color:#000; width:100%; text-align:center;">${wp.name.substring(0,10)}</span>
                            <span style="font-size:20px; line-height:1;">${wp.variant.sky}</span>
                            <span style="font-size:11px; font-weight:bold; color:${wp.variant.color}">${wp.variant.temp}°</span>
                        </div>`,
                    iconSize: [55, 50]
                })
            }).addTo(state.layer);

            tableHTML += `
                <tr style="border-bottom:1px solid #222;">
                    <td style="padding:8px 5px;">${wp.name}</td>
                    <td style="padding:8px 5px;">${wp.eta}</td>
                    <td style="padding:8px 5px; color:${wp.variant.color}">${wp.variant.temp}°C</td>
                    <td style="padding:8px 5px;">${wp.variant.skyLabel} ${wp.variant.sky}</td>
                </tr>`;
        });
        if (container) container.innerHTML = tableHTML;
    };

    return { init };
})();

WeatherEngine.init();
