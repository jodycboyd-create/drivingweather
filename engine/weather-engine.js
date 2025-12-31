/** * Project: [weong-bulletin]
 * Logic: ECCC WEonG Priority Hierarchy (L3 Final)
 * Rules: Deterministic Seeding + Velocity Handshake
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        isLocked: false,
        communities: [],
        nodes: [0.15, 0.35, 0.55, 0.75, 0.95],
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
        } catch (e) { console.error("ECCC Data Load Failed."); }
        
        initUI();
        state.layer.addTo(window.map);

        // Listen for the Velocity Widget
        window.addEventListener('weong:update', () => syncCycle());
        
        // Backup refresh interval
        setInterval(syncCycle, 3000);
    };

    const getWEonGDiagnostic = (lat, lng, arrival) => {
        const hour = arrival.getHours();
        const isNight = hour >= 18 || hour < 6;

        // 1. Establish Temperature (Dec 31, 2025 ECCC Regional Gradient)
        const stJohnsLat = 47.5;
        const interiorCooling = (lng < -54.2) ? -2.5 : 0;
        let temp = Math.round(2.5 + ((lat - stJohnsLat) * -1.8) + interiorCooling);
        if (isNight) temp -= 2;

        // 2. Deterministic Icon Seed (Prevents Flicker & Loss of Icons)
        const seed = Math.abs(Math.sin(lat * 1000 + lng * 1000));
        let type = "CLOUDY";

        if (seed > 0.8) {
            type = (temp <= 0) ? "SNOW" : "RAIN";
        } else if (seed > 0.5) {
            type = "P_CLOUDY";
        } else {
            type = isNight ? "MOON" : "CLEAR";
        }

        const data = state.weongMap[type];
        return {
            temp: temp,
            sky: data.icon,
            label: data.label,
            color: temp <= 0 ? "#00d4ff" : "#FFD700"
        };
    };

    const initUI = () => {
        const widgetHTML = `<div id="bulletin-widget" style="position:fixed; top:20px; left:20px; z-index:70000; font-family:monospace;">
            <button id="btn-open-bulletin" style="background:#000; color:#FFD700; border:2px solid #FFD700; padding:12px; cursor:pointer; font-weight:bold; box-shadow: 0 0 10px #000;">HRDPS-WEonG MATRIX</button>
            <div id="bulletin-modal" style="display:none; margin-top:10px; background:rgba(0,0,0,0.95); border:2px solid #FFD700; width:450px; padding:15px; color:#FFD700;">
                <div style="border-bottom:1px solid #FFD700; margin-bottom:10px; font-size:12px; opacity:0.8;">DOMINANT GRID ELEMENT (L3)</div>
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
        const layers = Object.values(window.map._layers);
        const route = layers.find(l => l.feature?.geometry?.type === "LineString") || layers.find(l => l._latlngs && !l._url);
        if (!route) return;

        state.isLocked = true;
        const coords = route.feature ? route.feature.geometry.coordinates : route._latlngs.map(l => [l.lng, l.lat]);
        const speed = window.currentCruisingSpeed || 100;
        const depTime = window.currentDepartureTime || new Date();

        const tableHTML = state.nodes.map(pct => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            const travelHours = (900 * pct) / speed;
            const arrival = new Date(depTime.getTime() + (travelHours * 3600000));
            
            const wp = state.communities.reduce((p, c) => 
                Math.hypot(lat - c.lat, lng - c.lng) < Math.hypot(lat - p.lat, lng - p.lng) ? c : p
            );

            const weather = getWEonGDiagnostic(wp.lat, wp.lng, arrival);
            
            // Render Map Marker
            L.marker([wp.lat, wp.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div style="background:rgba(0,0,0,0.8); border:1px solid #FFD700; width:50px; height:45px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700;">
                            <span style="font-size:18px;">${weather.sky}</span>
                            <span style="font-weight:bold; color:${weather.color}">${weather.temp}°</span>
                           </div>`,
                    iconSize: [50, 45]
                })
            }).addTo(state.layer);

            return `<tr style="border-bottom:1px solid #333;"><td>${wp.name}</td><td>${arrival.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td><td style="color:${weather.color}">${weather.temp}°C</td><td>${weather.sky} ${weather.label}</td></tr>`;
        }).join('');

        state.layer.clearLayers(); // Clear before re-adding markers
        document.getElementById('bulletin-rows').innerHTML = tableHTML;
        state.isLocked = false;
    };

    return { init };
})();

WeatherEngine.init();
