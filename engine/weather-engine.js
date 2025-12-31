/** * Project: [weong-bulletin] + [weong-route]
 * Status: Unified Weather Engine (L3 Stealth-Sync)
 * Logic: Equidistant Path Sampling + Shared Data State
 */

const WeatherEngine = (function() {
    const state = {
        layers: L.layerGroup(),
        anchorKey: null,
        communities: [],
        currentWaypoints: [], // The "Source of Truth"
        isLocked: false
    };

    // Load Central Dataset
    const init = async () => {
        try {
            const res = await fetch('/data/communities.json');
            state.communities = await res.json();
        } catch (e) {
            state.communities = [{ name: "Gander", lat: 48.95, lng: -54.61 }]; // Minimal fail-safe
        }
        setInterval(syncCycle, 1000);
    };

    const syncCycle = async () => {
        if (state.isLocked || !window.map) return;
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!route) return;

        const coords = route.feature.geometry.coordinates;
        const key = `${coords.length}-${coords[0][0]}`;
        if (key === state.anchorKey) return;

        state.isLocked = true;
        state.anchorKey = key;
        
        // 1. Calculate 5 Equidistant Points
        const ratios = [0.10, 0.30, 0.50, 0.70, 0.90];
        state.currentWaypoints = ratios.map(r => {
            const idx = Math.floor((coords.length - 1) * r);
            const [lng, lat] = coords[idx];
            // Snap to nearest community
            return state.communities.reduce((p, c) => 
                Math.hypot(lat-c.lat, lng-c.lng) < Math.hypot(lat-p.lat, lng-p.lng) ? c : p
            );
        });

        renderIcons();    // Update Map
        renderBulletin(); // Update Table
        
        state.isLocked = false;
    };

    function renderIcons() {
        state.layers.clearLayers();
        state.currentWaypoints.forEach(wp => {
            const variant = getForecast(wp.lat, wp.lng);
            L.marker([wp.lat, wp.lng], {
                icon: L.divIcon({
                    className: 'w-icon',
                    html: `<div class="hud-box"><span>${wp.name}</span><br>${variant.sky}</div>`
                })
            }).addTo(state.layers);
        });
        state.layers.addTo(window.map);
    }

    function renderBulletin() {
        const container = document.getElementById('bulletin-table-body');
        if (!container) return;
        
        container.innerHTML = state.currentWaypoints.map(wp => {
            const v = getForecast(wp.lat, wp.lng);
            return `<tr><td>${wp.name}</td><td>${v.temp}°C</td><td>${v.wind} km/h</td></tr>`;
        }).join('');
    }

    // Shared internal forecast generator
    function getForecast(lat, lng) {
        // ... variation engine logic ...
        return { temp: -2, wind: 45, sky: "☁️" };
    }

    return { init };
})();

WeatherEngine.init();
