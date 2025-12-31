/** * Project: [weong-bulletin] + [weong-route]
 * Status: Unified L3 Stealth-Sync (Fixed Path + Equidistant Nodes)
 * Path: /data/nl/communities.json
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        communities: [],
        activeWaypoints: [] 
    };

    // 1. Initial Load from the Nested NL directory
    const init = async () => {
        try {
            const res = await fetch('/data/nl/communities.json');
            if (!res.ok) throw new Error(`HTTP 404: /data/nl/`);
            state.communities = await res.json();
            console.log("WEONG-L3: Newfoundland Dataset Loaded.");
        } catch (e) {
            console.warn("WEONG-L3: Baseline Fail-safe Triggered.");
            state.communities = [
                { name: "Deer Lake", lat: 49.17, lng: -57.43 },
                { name: "Gander", lat: 48.95, lng: -54.61 },
                { name: "Clarenville", lat: 48.17, lng: -53.96 }
            ];
        }
        // Heartbeat for route changes
        setInterval(syncCycle, 800);
    };

    const syncCycle = async () => {
        if (state.isLocked || !window.map || state.communities.length === 0) return;
        
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!route) return;

        const coords = route.feature.geometry.coordinates;
        const currentKey = `${coords.length}-${coords[0][0]}`;
        if (currentKey === state.anchorKey) return;

        state.isLocked = true;
        state.anchorKey = currentKey;

        // 2. EQUIDISTANT SAMPLING: Exactly 5 Nodes Island-Wide
        const sampleRatios = [0.15, 0.35, 0.55, 0.75, 0.95];
        state.activeWaypoints = sampleRatios.map(ratio => {
            const idx = Math.floor((coords.length - 1) * ratio);
            const [lng, lat] = coords[idx];
            // Snap to nearest community in NL dataset
            return state.communities.reduce((p, c) => 
                Math.hypot(lat-c.lat, lng-c.lng) < Math.hypot(lat-p.lat, lng-p.lng) ? c : p
            );
        });

        renderIcons();    // Reinstate Route Icons
        renderBulletin(); // Reinstate Tabular Forecast
        
        state.isLocked = false;
    };

    function renderIcons() {
        state.layer.clearLayers();
        state.activeWaypoints.forEach(wp => {
            const v = getForecast(wp.lat, wp.lng);
            L.marker([wp.lat, wp.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `
                        <div class="sync-glow" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:75px; height:65px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 15px #000;">
                            <span style="font-size:8px; font-weight:bold; width:100%; text-align:center; background:#FFD700; color:#000; text-transform:uppercase;">${wp.name.split(' ')[0]}</span>
                            <span style="font-size:18px; margin:2px 0;">${v.sky}</span>
                            <div style="display:flex; gap:4px; font-size:11px; font-weight:bold;">
                                <span style="${v.temp <= 0 ? 'color:#00d4ff' : 'color:#ff4500'}">${v.temp}°</span>
                                <span style="color:#fff; font-weight:normal;">${v.wind}k</span>
                            </div>
                        </div>`,
                    iconSize: [75, 65]
                }),
                zIndexOffset: 60000 
            }).addTo(state.layer);
        });
        if (!window.map.hasLayer(state.layer)) state.layer.addTo(window.map);
    }

    function renderBulletin() {
        const tableBody = document.getElementById('weather-bulletin-rows');
        if (!tableBody) return;

        tableBody.innerHTML = state.activeWaypoints.map(wp => {
            const v = getForecast(wp.lat, wp.lng);
            return `
                <tr style="border-bottom: 1px solid #333; color: #FFD700;">
                    <td style="padding: 8px;"><b>${wp.name}</b></td>
                    <td style="font-size: 1.2em;">${v.sky}</td>
                    <td>${v.temp}°C</td>
                    <td>${v.wind} KM/H</td>
                </tr>`;
        }).join('');
    }

    function getForecast(lat, lng) {
        const seed = lat + lng + new Date().getHours();
        return {
            temp: Math.round(-3 + Math.sin(seed) * 4),
            wind: Math.round(35 + Math.cos(seed) * 15),
            sky: ["☀️", "🌤️", "☁️", "❄️"][Math.abs(Math.floor(seed % 4))]
        };
    }

    return { init };
})();

WeatherEngine.init();
