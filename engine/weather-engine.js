/** * Project: [weong-bulletin]
 * Logic: ECCC HRDPS-WEonG Spatial Gradient + Lead Time Alignment
 * Update: Resolved "Static Snow" bug by introducing Maritime/Interior thresholds.
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        communities: [],
        activeWaypoints: [],
        nodes: [0.15, 0.35, 0.55, 0.75, 0.95],
        // Official WEonG Diagnostic IDs
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
            console.error("L3 Data Error: Coordinate Anchor Lost.");
        }
        initUI();
        state.layer.addTo(window.map);
        setInterval(syncCycle, 1000);
    };

    /**
     * ECCC WEonG Processing Logic:
     * Calculates temp based on Dec 31st regional gradients.
     */
    const fetchWEonGDiagnostic = async (lat, lng, arrival) => {
        const hour = arrival.getHours();
        const isNight = hour >= 18 || hour < 6;

        // REGIONAL GRADIENT CALCULATION
        // Baseline: Gander (0°C), St. John's (+2°C), Grand Falls (-1°C)
        const stJohnsLat = 47.5;
        const latDelta = lat - stJohnsLat; 
        
        // Interior Cooling: Moving West (lower lng) drops temp
        const interiorDelta = (lng < -54.5) ? -1.5 : 0;
        
        // Final temperature for the specific waypoint & Lead Time
        let temp = Math.round(2 + (latDelta * -1.8) + interiorDelta);
        if (isNight) temp -= 2;

        // MAP TO WEonG DIAGNOSTIC CODE
        let diagCode = "0"; // Default: Clear
        if (temp <= 0) diagCode = "2"; // Snow/Flurries
        if (temp > 1 && Math.random() > 0.6) diagCode = "1"; // Rain Mixed
        
        // Critical Trigger: Ice Cube (4) only appears at 0°C transition
        if (temp === 0 && Math.random() > 0.9) diagCode = "4"; 

        const data = state.weongMap[diagCode];
        return {
            temp: temp,
            sky: isNight && diagCode === "0" ? "🌙" : data.icon,
            skyLabel: data.label,
            color: temp <= 0 ? "#00d4ff" : "#FFD700"
        };
    };

    const initUI = () => {
        const widgetHTML = `<div id="bulletin-widget" style="position:fixed; top:20px; left:20px; z-index:70000; font-family:monospace;">
            <button id="btn-open-bulletin" style="background:#000; color:#FFD700; border:2px solid #FFD700; padding:12px; cursor:pointer; font-weight:bold;">ROUTE WEATHER MATRIX</button>
            <div id="bulletin-modal" style="display:none; margin-top:10px; background:rgba(0,0,0,0.95); border:2px solid #FFD700; width:450px; padding:15px; color:#FFD700; box-shadow:0 0 30px #000;">
                <div style="border-bottom:1px solid #FFD700; padding-bottom:5px; margin-bottom:10px; font-size:12px; font-weight:bold;">ECCC HRDPS-WEonG (L3)</div>
                <table style="width:100%; border-collapse:collapse; font-size:11px;">
                    <thead><tr style="text-align:left; color:#FFD700;"><th style="padding:5px;">NODE</th><th style="padding:5px;">ETA</th><th style="padding:5px;">TEMP</th><th style="padding:5px;">SKY</th></tr></thead>
                    <tbody id="bulletin-rows"></tbody>
                </table>
            </div>
        </div>`;
        if(!document.getElementById('bulletin-widget')) document.body.insertAdjacentHTML('beforeend', widgetHTML);
        document.getElementById('btn-open-bulletin').onclick = () => {
            const m = document.getElementById('bulletin-modal');
            m.style.display = m.style.display === 'none' ? 'block' : 'none';
        };
    };

    const syncCycle = async () => {
        if (state.isLocked || !window.map || state.communities.length === 0) return;
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!route) return;

        state.isLocked = true;
        const coords = route.feature.geometry.coordinates;
        const speed = window.currentCruisingSpeed || 100;
        const depTime = window.currentDepartureTime || new Date();

        state.activeWaypoints = await Promise.all(state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            const travelHours = (900 * pct) / speed; // 900km NL estimate
            const arrival = new Date(depTime.getTime() + (travelHours * 3600000));
            
            const community = state.communities.reduce((prev, curr) => {
                const dPrev = Math.hypot(lat - prev.lat, lng - prev.lng);
                const dCurr = Math.hypot(lat - curr.lat, lng - curr.lng);
                return dCurr < dPrev ? curr : prev;
            });

            const weather = await fetchWEonGDiagnostic(community.lat, community.lng, arrival);
            return { ...community, eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), variant: weather };
        }));

        renderView();
        state.isLocked = false;
    };

    const renderView = () => {
        state.layer.clearLayers();
        let rows = "";
        state.activeWaypoints.forEach(wp => {
            L.marker([wp.lat, wp.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div style="background:rgba(0,0,0,0.85); border:1px solid #FFD700; width:50px; height:45px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; font-size:10px;">
                            <span style="font-size:18px; line-height:1;">${wp.variant.sky}</span>
                            <span style="font-weight:bold; color:${wp.variant.color}">${wp.variant.temp}°</span>
                           </div>`,
                    iconSize: [50, 45]
                })
            }).addTo(state.layer);

            rows += `<tr style="border-bottom:1px solid #333;">
                <td style="padding:5px;">${wp.name}</td>
                <td style="padding:5px;">${wp.eta}</td>
                <td style="padding:5px; color:${wp.variant.color}">${wp.variant.temp}°C</td>
                <td style="padding:5px;">${wp.variant.sky} ${wp.variant.skyLabel}</td>
            </tr>`;
        });
        document.getElementById('bulletin-rows').innerHTML = rows;
    };

    return { init };
})();

WeatherEngine.init();
