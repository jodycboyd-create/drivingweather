/** * Project: [weong-bulletin]
 * Methodology: L3 Stealth-Sync Unified Engine
 * Status: Absolute Path Hardening + Multi-Point Fallback
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
            const res = await fetch('/data/nl/communities.json');
            if (!res.ok) throw new Error("404");
            const rawData = await res.json();
            
            state.communities = rawData.features.map(f => ({
                name: f.properties.name,
                lat: f.geometry.coordinates[1],
                lng: f.geometry.coordinates[0]
            }));
            
            console.log(`System: NL Dataset Active (${state.communities.length} nodes)`);
        } catch (e) {
            console.warn("WEONG-L3: Network 404. Deploying Hardened NL Baseline.");
            state.communities = [
                { name: "Gander", lat: 48.9578, lng: -54.6122 },
                { name: "St. John's", lat: 47.5615, lng: -52.7126 },
                { name: "Corner Brook", lat: 48.9515, lng: -57.9482 },
                { name: "Grand Falls-Windsor", lat: 48.93, lng: -55.65 }
            ];
        }
        initUI();
        state.layer.addTo(window.map);
        // Interval remains for background safety
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

    const syncCycle = async (forceUpdate = false) => {
        if (state.isLocked || !window.map || state.communities.length === 0) return;
        
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!route) return;

        const coords = route.feature.geometry.coordinates;
        const currentSpeed = window.currentCruisingSpeed || 100;
        const depTime = window.currentDepartureTime instanceof Date ? window.currentDepartureTime : new Date();
        
        // Extended Key to include speed/time changes
        const currentKey = `${coords[0][0].toFixed(4)}-${coords.length}-${currentSpeed}-${depTime.getTime()}`;
        
        if (currentKey === state.anchorKey && !forceUpdate)
