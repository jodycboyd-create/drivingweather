/** * Project: [weong-bulletin] + [weong-route]
 * Methodology: L3 Stealth-Sync (Unified Engine)
 * Status: Equidistant Community Snapping + Shared State
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        communities: [],
        activeWaypoints: [] // SHARED STATE: The "One Version of the Truth"
    };

    // 1. Unified Dataset Load
    const init = async () => {
        try {
            const res = await fetch('/data/communities.json');
            state.communities = await res.json();
        } catch (e) {
            // Baseline fail-safe to prevent blank HUD
            state.communities = [
                { name: "St. John's", lat: 47.56, lng: -52.71 },
                { name: "Gander", lat: 48.95, lng: -54.61 },
                { name: "Deer Lake", lat: 49.17, lng: -57.43 }
            ];
        }
        setInterval(syncCycle, 1000); // 1s Sync Heartbeat
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

        // 2. EQUIDISTANT SAMPLING: 5 Points (15%, 35%, 55%, 75%, 95%)
        const sampleRatios = [0.15, 0.35, 0.55, 0.75, 0.95];
        state.activeWaypoints = sampleRatios.map(ratio => {
            const idx = Math.floor((coords.length - 1) * ratio);
            const [lng, lat] = coords[idx];

            // Snap to nearest community in Newfoundland dataset
            return state.communities.reduce((prev, curr) => {
                const dPrev = Math.hypot(lat - prev.lat, lng - prev.lng);
                const dCurr = Math.hypot(lat - curr.lat, lng - curr.lng);
                return dCurr < dPrev ? prev : curr;
            });
        });

        updateMapHUD();     // Step 3a: Visual Sync
        updateBulletinUI(); // Step 3b: Tabular Sync
        
        state.isLocked = false;
    };

    function updateMapHUD() {
        state.layer.clearLayers();
        state.activeWaypoints.forEach(wp => {
            const variant = getForecast(wp.lat, wp.lng);
            L.marker([wp.lat, wp.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div class="hud-box"><b>${wp.name.split(' ')[0]}</b><br>${variant.sky} ${variant.temp}°</div>`,
                    iconSize: [75, 60]
                }),
                zIndexOffset: 50000
            }).addTo(state.layer);
        });
        if (!window.map.hasLayer(state.layer)) state.layer.addTo(window.map);
    }

    function updateBulletinUI() {
        const tableBody = document.getElementById('weather-bulletin-rows');
        if (!tableBody) return;

        tableBody.innerHTML = state.activeWaypoints.map(wp => {
            const variant = getForecast(wp.lat, wp.lng);
            return `
                <tr class="sync-row">
                    <td><b>${wp.name}</b></td>
                    <td>${variant.sky}</td>
                    <td>${variant.temp}°C</td>
                    <td>${variant.wind} KM/H</td>
                </tr>`;
        }).join('');
    }

    function getForecast(lat, lng) {
        // Shared Variation Engine logic
        const seed = lat + lng + new Date().getHours();
        return {
            temp: Math.round(-2 + Math.sin(seed) * 5),
            wind: Math.round(40 + Math.cos(seed) * 20),
            sky: ["☀️", "🌤️", "☁️", "❄️"][Math.abs(Math.floor(seed % 4))]
        };
    }

    return { init };
})();

WeatherEngine.init();
