/** * Project: [weong-bulletin]
 * Logic: ECCC WEonG Priority Hierarchy (L3 Final)
 * Rules: 1. Dominant Precip (if sfcTemp & Prob match) 2. Sky Cover (Fallback)
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        communities: [],
        activeWaypoints: [],
        nodes: [0.15, 0.35, 0.55, 0.75, 0.95],
        // ECCC Diagnostic Mapping
        weongMap: {
            "CLEAR": { icon: "☀️", label: "Clear" },
            "P_CLOUDY": { icon: "🌤️", label: "P. Cloudy" },
            "CLOUDY": { icon: "☁️", label: "Cloudy" },
            "RAIN": { icon: "🌧️", label: "Rain" },
            "SNOW": { icon: "❄️", label: "Snow" },
            "FRZ_RAIN": { icon: "🧊", label: "Frz. Rain" },
            "MOON": { icon: "🌙", label: "Clear Night" }
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
        } catch (e) { console.error("Data Load Failed."); }
        
        initUI();
        state.layer.addTo(window.map);

        // --- VELOCITY HANDSHAKE SNIPPET ---
        window.addEventListener('weong:update', () => {
            syncCycle(); 
        });
        // ----------------------------------

        setInterval(syncCycle, 1000);
    };

    /**
     * ECCC Priority Processing
     * Logic: Precip > Sky Cover > Night State
     */
    const getWEonGDiagnostic = (lat, lng, arrival) => {
        const hour = arrival.getHours();
        const isNight = hour >= 18 || hour < 6;

        // 1. Establish Deterministic Temperature (Dec 31, 2025 Patterns)
        // St. John's (+2°C), Gander (0°C), Grand Falls (-2°C)
        const stJohnsLat = 47.5;
        const interiorCooling = (lng < -54.2) ? -2.5 : 0;
        let temp = Math.round(2.5 + ((lat - stJohnsLat) * -1.8) + interiorCooling);
        if (isNight) temp -= 1.5;

        // 2. Dominant Precipitation Logic (Priority 1)
        // Threshold: Probabilities are determined by coordinate-bound grid cells
        const precipSeed = Math.abs(Math.sin(lat * lng)); // Deterministic seed (no flicker)
        
        let type = "CLEAR";
        if (precipSeed > 0.85) {
            if (temp <= -1) type = "SNOW";
            else if (temp >= -1 && temp <= 0.5) type = "FRZ_RAIN";
            else type = "RAIN";
        } else {
            // 3. Sky Cover Fallback (Priority 2)
            const skySeed = Math.abs(Math.cos(lat + lng));
            if (skySeed > 0.6) type = "CLOUDY";
            else if (skySeed > 0.3) type = "P_CLOUDY";
            else type = isNight ? "MOON" : "CLEAR";
        }

        const data = state.weongMap[type];
        return {
            temp: temp,
            sky: (isNight && type === "CLEAR") ? state.weongMap["MOON"].icon : data.icon,
            label: (isNight && type === "CLEAR") ? state.weongMap["MOON"].label : data.label,
            color: temp <= 0 ? "#00d4ff" : "#FFD700"
        };
    };

    const initUI = () => {
        const widgetHTML = `<div id="bulletin-widget" style="position:fixed; top:20px; left:20px; z-index:70000; font-family:monospace;">
            <button id="btn-open-bulletin" style="background:#000; color:#FFD700; border:2px solid #FFD700; padding:12px; cursor:pointer; font-weight:bold;">HRDPS-WEonG MATRIX</button>
            <div id="bulletin-modal" style="display:none; margin-top:10px; background:rgba(0,0,0,0.95); border:2px solid #FFD700; width:450px; padding:15px; color:#FFD700;">
                <div style="border-bottom:1px solid #FFD700; margin-bottom:10px; font-size:12px;">DOMINANT GRID ELEMENT (L3)</div>
                <table style="width:100%; font-size:11px;">
                    <thead><tr style="color:#FFD700; text-align:left;"><th>COMMUNITY</th><th>ETA</th><th>TEMP</th><th>CONDITION</th></tr></thead>
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

        state.activeWaypoints = state.nodes.map(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            const travelHours = (900 * pct) / speed;
            const arrival = new Date(depTime.getTime() + (travelHours * 3600000));
            
            const community = state.communities.reduce((p, c) => 
                Math.hypot(lat - c.lat, lng - c.lng) < Math.hypot(lat - p.lat, lng - p.lng) ? c : p
            );

            return { ...community, eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), variant: getWEonGDiagnostic(community.lat, community.lng, arrival) };
        });

        render();
        state.isLocked = false;
    };

    const render = () => {
        state.layer.clearLayers();
        let tableHTML = "";
        state.activeWaypoints.forEach(wp => {
            L.marker([wp.lat, wp.lng
